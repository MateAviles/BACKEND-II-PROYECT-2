

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { UserModel } from "../src/models/User.js";
import { eventModel } from "../src/models/Event.js";
import { ticketModel } from "../src/models/Ticket.js";
import { generateToken } from "../src/utils/jwt.js";
import { sentMails } from "../src/utils/mailer.js";
import { resetDB } from "./setup.js";

const authCookie = (user) =>
    `currentUser=${generateToken({ id: user._id.toString(), email: user.email, role: user.role })}`;

const makeUser = (role, email) =>
    UserModel.create({
        first_name: "Test",
        last_name: "User",
        email,
        password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
        role
    });

const makeEvent = (organizerId, overrides = {}) =>
    eventModel.create({
        title: "Evento de prueba",
        description: "Descripción",
        category: "workshop",
        date: new Date("2027-06-01"),
        location: "Sala Test",
        capacity: 10,
        price: 1000,
        status: "published",
        organizer: organizerId,
        ...overrides
    });

let alice;
let bob;
let organizer;
let otherOrganizer;
let admin;
let aliceCookie;
let bobCookie;
let organizerCookie;
let otherOrganizerCookie;
let adminCookie;
let event;

beforeEach(async () => {
    await resetDB();
    sentMails.length = 0;

    alice           = await makeUser("user",      "alice@test.local");
    bob             = await makeUser("user",      "bob@test.local");
    organizer       = await makeUser("organizer", "org@test.local");
    otherOrganizer  = await makeUser("organizer", "org2@test.local");
    admin           = await makeUser("admin",     "admin@test.local");

    aliceCookie           = authCookie(alice);
    bobCookie             = authCookie(bob);
    organizerCookie       = authCookie(organizer);
    otherOrganizerCookie  = authCookie(otherOrganizer);
    adminCookie           = authCookie(admin);

    event = await makeEvent(organizer._id);
});


describe("Inscripción — casos de la consigna", () => {

    it("1. inscripción exitosa → 201 y envía el email de confirmación", async () => {
        const res = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 2 });

        expect(res.status).toBe(201);
        expect(res.body.payload).toMatchObject({
            status: "confirmed",
            quantity: 2,
            reservationCode: expect.stringMatching(/^TKT-[0-9A-F]{12}$/)
        });


        expect(sentMails).toHaveLength(1);
        expect(sentMails[0].to).toBe("alice@test.local");
        expect(sentMails[0].subject).toContain("Evento de prueba");
        expect(sentMails[0].text).toContain(res.body.payload.reservationCode);
    });

    it("2. inscripción sin sesión → 401", async () => {
        const res = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .send({ quantity: 1 });

        expect(res.status).toBe(401);
    });

    it("3. inscripción a evento inexistente → 404", async () => {
        const res = await request(app)
            .post("/api/events/6ae3593bc1c05ad84ee8316d/tickets")
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/no encontrado/i);
    });

    it("4a. inscripción a evento cancelado → error de negocio 409", async () => {
        const cancelled = await makeEvent(organizer._id, { status: "cancelled" });

        const res = await request(app)
            .post(`/api/events/${cancelled._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/cancelado/i);
    });

    it("4b. inscripción a evento finalizado → error de negocio 409", async () => {
        const finished = await makeEvent(organizer._id, { status: "finished" });

        const res = await request(app)
            .post(`/api/events/${finished._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/finalizado/i);
    });

    it("4c. inscripción a evento borrador (no publicado) → 400", async () => {
        const draft = await makeEvent(organizer._id, { status: "draft" });

        const res = await request(app)
            .post(`/api/events/${draft._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/publicado/i);
    });

    it("5. sin cupos suficientes → 409 con mensaje claro", async () => {
        const small = await makeEvent(organizer._id, { capacity: 3 });

        const first = await request(app)
            .post(`/api/events/${small._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 3 });

        expect(first.status).toBe(201);

        const second = await request(app)
            .post(`/api/events/${small._id}/tickets`)
            .set("Cookie", bobCookie)
            .send({ quantity: 1 });

        expect(second.status).toBe(409);
        expect(second.body.message).toMatch(/cupos suficientes/i);
        expect(second.body.message).toMatch(/quedan 0 disponibles/);
    });

    it("6. inscripción duplicada activa → 409", async () => {
        const first = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        expect(first.status).toBe(201);

        const second = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        expect(second.status).toBe(409);
        expect(second.body.message).toMatch(/inscripción activa/i);
    });

    it("quantity no válida (0 o negativa) → 400", async () => {
        const res = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 0 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cantidad/i);
    });
});


describe("Cancelación — casos de la consigna", () => {

    const inscribe = (cookie, eid, quantity = 1) =>
        request(app).post(`/api/events/${eid}/tickets`).set("Cookie", cookie).send({ quantity });

    it("7. cancelar libera el cupo: se puede volver a inscribir ese lugar", async () => {
        const small = await makeEvent(organizer._id, { capacity: 1 });

        const first = await inscribe(aliceCookie, small._id, 1);
        expect(first.status).toBe(201);

        const blocked = await inscribe(bobCookie, small._id, 1);
        expect(blocked.status).toBe(409);

        const cancel = await request(app)
            .patch(`/api/tickets/${first.body.payload._id}/cancel`)
            .set("Cookie", aliceCookie);

        expect(cancel.status).toBe(200);
        expect(cancel.body.payload.status).toBe("cancelled");
        expect(cancel.body.payload.cancelledAt).toBeTruthy();

        const retry = await inscribe(bobCookie, small._id, 1);
        expect(retry.status).toBe(201);
    });

    it("7b. el ticket cancelado NO se elimina físicamente", async () => {
        const ticket = await inscribe(aliceCookie, event._id);
        await request(app)
            .patch(`/api/tickets/${ticket.body.payload._id}/cancel`)
            .set("Cookie", aliceCookie);

        const stillThere = await ticketModel.findById(ticket.body.payload._id);
        expect(stillThere).not.toBeNull();
        expect(stillThere.status).toBe("cancelled");
    });

    it("8. cancelar ticket ajeno como user → 403", async () => {
        const ticket = await inscribe(aliceCookie, event._id);

        const res = await request(app)
            .patch(`/api/tickets/${ticket.body.payload._id}/cancel`)
            .set("Cookie", bobCookie);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permisos/i);
    });

    it("cancelar un ticket ya cancelado → 409", async () => {
        const ticket = await inscribe(aliceCookie, event._id);
        const tid = ticket.body.payload._id;

        await request(app).patch(`/api/tickets/${tid}/cancel`).set("Cookie", aliceCookie);

        const again = await request(app)
            .patch(`/api/tickets/${tid}/cancel`)
            .set("Cookie", aliceCookie);

        expect(again.status).toBe(409);
        expect(again.body.message).toMatch(/ya está cancelado/i);
    });

    it("cancelar ticket inexistente → 404", async () => {
        const res = await request(app)
            .patch("/api/tickets/6ae3593bc1c05ad84ee8316d/cancel")
            .set("Cookie", aliceCookie);

        expect(res.status).toBe(404);
    });

    it("admin puede cancelar tickets de otros → 200", async () => {
        const ticket = await inscribe(aliceCookie, event._id);

        const res = await request(app)
            .patch(`/api/tickets/${ticket.body.payload._id}/cancel`)
            .set("Cookie", adminCookie);

        expect(res.status).toBe(200);
    });
});


describe("Consulta de tickets — casos de la consigna", () => {

    it("GET /api/tickets/my-tickets solo devuelve los propios, con datos del evento", async () => {
        const mine = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 1 });

        await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", bobCookie)
            .send({ quantity: 1 });

        const res = await request(app)
            .get("/api/tickets/my-tickets")
            .set("Cookie", aliceCookie);

        expect(res.status).toBe(200);
        expect(res.body.payload).toHaveLength(1);

        const ticket = res.body.payload[0];
        expect(ticket.user).toBe(alice._id.toString());
        expect(ticket.event).toMatchObject({
            title: "Evento de prueba",
            location: "Sala Test"
        });
        expect(ticket.event.date).toBeTruthy();
        expect(ticket.event).not.toHaveProperty("organizer");
        expect(mine.status).toBe(201);
    });

    it("sin sesión → 401", async () => {
        const res = await request(app).get("/api/tickets/my-tickets");
        expect(res.status).toBe(401);
    });

    it("9. GET /api/events/:eid/tickets como user común → 403", async () => {
        const res = await request(app)
            .get(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie);

        expect(res.status).toBe(403);
    });

    it("10. GET /api/events/:eid/tickets como organizer de OTRO evento → 403", async () => {
        const res = await request(app)
            .get(`/api/events/${event._id}/tickets`)
            .set("Cookie", otherOrganizerCookie);

        expect(res.status).toBe(403);
    });

    it("organizer del evento → 200 con los inscriptos y sus datos", async () => {
        await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", aliceCookie)
            .send({ quantity: 2 });

        const res = await request(app)
            .get(`/api/events/${event._id}/tickets`)
            .set("Cookie", organizerCookie);

        expect(res.status).toBe(200);
        expect(res.body.payload).toHaveLength(1);
        expect(res.body.payload[0].user).toMatchObject({ email: "alice@test.local" });
        expect(res.body.payload[0].user).not.toHaveProperty("password");
    });

    it("admin → 200 sobre cualquier evento", async () => {
        const res = await request(app)
            .get(`/api/events/${event._id}/tickets`)
            .set("Cookie", adminCookie);

        expect(res.status).toBe(200);
    });
});
