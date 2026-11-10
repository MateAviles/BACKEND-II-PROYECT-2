

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

const register = (data) =>
    request(app).post("/api/sessions/register").send(data);

const login = (data) =>
    request(app).post("/api/sessions/login").send(data);

const cookieFrom = (res) =>
    res.headers["set-cookie"].find((c) => c.startsWith("currentUser="));

let admin;
let adminCookie;

beforeEach(async () => {
    await resetDB();
    sentMails.length = 0;

    admin = await UserModel.create({
        first_name: "Admin",
        last_name: "Test",
        email: "admin@test.local",
        password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
        role: "admin"
    });

    adminCookie = authCookie(admin);
});


describe("M8 — flujo completo: registro → login → crear evento → inscribirse → mis tickets → cancelar", () => {

    it("recorre toda la API de punta a punta sin romper", async () => {

        
        const attendee = await register({
            first_name: "Ana",
            last_name: "Asistente",
            email: "ana@test.local",
            password: "Secreta123"
        });
        expect(attendee.status).toBe(201);


        const organizer = await register({
            first_name: "Oscar",
            last_name: "Organizador",
            email: "oscar@test.local",
            password: "Secreta123"
        });
        expect(organizer.status).toBe(201);


        await UserModel.updateOne({ _id: organizer.body.payload.id }, { role: "organizer" });


        const organizerLogin = await login({ email: "oscar@test.local", password: "Secreta123" });
        expect(organizerLogin.status).toBe(200);
        const organizerCookie = cookieFrom(organizerLogin);


        const attendeeLogin = await login({ email: "ana@test.local", password: "Secreta123" });
        expect(attendeeLogin.status).toBe(200);
        const attendeeCookie = cookieFrom(attendeeLogin);


        const created = await request(app)
            .post("/api/events")
            .set("Cookie", organizerCookie)
            .send({
                title: "Taller de cocina",
                description: "Nivel inicial",
                category: "workshop",
                date: "2027-09-15",
                location: "Sala Central",
                capacity: 30,
                price: 2500
            });
        expect(created.status).toBe(201);
        expect(created.body.payload.status).toBe("draft");
        const eventId = created.body.payload._id;


        const published = await request(app)
            .patch(`/api/events/${eventId}/status`)
            .set("Cookie", organizerCookie)
            .send({ status: "published" });
        expect(published.status).toBe(200);
        expect(published.body.payload.status).toBe("published");

        
        const enrolled = await request(app)
            .post(`/api/events/${eventId}/tickets`)
            .set("Cookie", attendeeCookie)
            .send({ quantity: 2 });
        expect(enrolled.status).toBe(201);
        expect(sentMails).toHaveLength(1);
        expect(sentMails[0].to).toBe("ana@test.local");
        const ticketId = enrolled.body.payload._id;


        const mine = await request(app)
            .get("/api/tickets/my-tickets")
            .set("Cookie", attendeeCookie);
        expect(mine.status).toBe(200);
        expect(mine.body.payload).toHaveLength(1);
        expect(mine.body.payload[0].event).toMatchObject({ title: "Taller de cocina" });


        const cancelled = await request(app)
            .patch(`/api/tickets/${ticketId}/cancel`)
            .set("Cookie", attendeeCookie);
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.payload.status).toBe("cancelled");
        expect(cancelled.body.payload.cancelledAt).toBeTruthy();

        const stillThere = await ticketModel.findById(ticketId);
        expect(stillThere).not.toBeNull();

        
        const other = await register({
            first_name: "Beto",
            last_name: "Otro",
            email: "beto@test.local",
            password: "Secreta123"
        });
        expect(other.status).toBe(201);
        const otherLogin = await login({ email: "beto@test.local", password: "Secreta123" });

        const retry = await request(app)
            .post(`/api/events/${eventId}/tickets`)
            .set("Cookie", cookieFrom(otherLogin))
            .send({ quantity: 2 });
        expect(retry.status).toBe(201);
    });
});


describe("M8 — DTO: ninguna respuesta expone password ni campos internos", () => {

    it("/current no incluye password (ni siquiera hasheada) ni __v", async () => {
        await register({
            first_name: "Ana",
            last_name: "Asistente",
            email: "ana@test.local",
            password: "Secreta123"
        });

        const res = await login({ email: "ana@test.local", password: "Secreta123" });
        const current = await request(app)
            .get("/api/sessions/current")
            .set("Cookie", cookieFrom(res));

        expect(current.status).toBe(200);
        expect(current.body.payload).not.toHaveProperty("password");
        expect(current.body.payload).not.toHaveProperty("__v");
        expect(current.body.payload.email).toBe("ana@test.local");
    });

    it("el registro tampoco devuelve password ni __v", async () => {
        const res = await register({
            first_name: "Ana",
            last_name: "Asistente",
            email: "ana@test.local",
            password: "Secreta123"
        });

        expect(res.body.payload).not.toHaveProperty("password");
        expect(res.body.payload).not.toHaveProperty("__v");
    });

    it("GET /api/users no expone password de ningún usuario", async () => {
        const res = await request(app)
            .get("/api/users")
            .set("Cookie", adminCookie);

        expect(res.status).toBe(200);
        expect(res.body.payload.length).toBeGreaterThan(0);

        for (const user of res.body.payload) {
            expect(user).not.toHaveProperty("password");
            expect(user).not.toHaveProperty("__v");
        }
    });

    it("el ticket con populate no expone password ni role del usuario", async () => {
        const organizer = await UserModel.create({
            first_name: "Oscar",
            last_name: "Organizador",
            email: "oscar@test.local",
            password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
            role: "organizer"
        });

        const event = await eventModel.create({
            title: "Taller de cocina",
            description: "Nivel inicial",
            category: "workshop",
            date: new Date("2027-09-15"),
            location: "Sala Central",
            capacity: 30,
            price: 2500,
            status: "published",
            organizer: organizer._id
        });

        const attendee = await UserModel.create({
            first_name: "Ana",
            last_name: "Asistente",
            email: "ana@test.local",
            password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
            role: "user"
        });

        await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", authCookie(attendee))
            .send({ quantity: 1 });

        const listed = await request(app)
            .get(`/api/events/${event._id}/tickets`)
            .set("Cookie", authCookie(organizer));

        expect(listed.status).toBe(200);

        const populatedUser = listed.body.payload[0].user;
        expect(populatedUser).not.toHaveProperty("password");
        expect(populatedUser).not.toHaveProperty("role");
        expect(populatedUser).toMatchObject({ email: "ana@test.local" });

        
        const myTickets = await request(app)
            .get("/api/tickets/my-tickets")
            .set("Cookie", authCookie(attendee));

        expect(myTickets.body.payload[0].event).not.toHaveProperty("organizer");
        expect(myTickets.body.payload[0].event).not.toHaveProperty("capacity");
    });

    it("un error de negocio responde su código HTTP real (nunca 500)", async () => {
        const organizer = await UserModel.create({
            first_name: "Oscar",
            last_name: "Organizador",
            email: "oscar@test.local",
            password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
            role: "organizer"
        });

        const event = await eventModel.create({
            title: "Taller de cocina",
            description: "Nivel inicial",
            category: "workshop",
            date: new Date("2027-09-15"),
            location: "Sala Central",
            capacity: 1,
            price: 2500,
            status: "published",
            organizer: organizer._id
        });

        const attendee = await UserModel.create({
            first_name: "Ana",
            last_name: "Asistente",
            email: "ana@test.local",
            password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
            role: "user"
        });

        await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", authCookie(attendee))
            .send({ quantity: 1 });

        
        const other = await UserModel.create({
            first_name: "Beto",
            last_name: "Otro",
            email: "beto@test.local",
            password: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefake",
            role: "user"
        });

        const res = await request(app)
            .post(`/api/events/${event._id}/tickets`)
            .set("Cookie", authCookie(other))
            .send({ quantity: 1 });

        expect(res.status).toBe(409);
        expect(res.body.status).toBe("error");
        expect(res.body.message).toMatch(/cupos suficientes/i);
    });
});
