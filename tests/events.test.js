

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { UserModel } from "../src/models/User.js";
import { eventModel } from "../src/models/Event.js";
import { generateToken } from "../src/utils/jwt.js";
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

const baseEvent = (overrides = {}) => ({
    title: "Evento de prueba",
    description: "Descripción",
    category: "workshop",
    date: "2027-06-01",
    location: "Sala Test",
    capacity: 10,
    price: 1000,
    ...overrides
});

let organizer;
let otherOrganizer;
let admin;
let user;
let userCookie;
let organizerCookie;
let otherOrganizerCookie;
let adminCookie;

beforeEach(async () => {
    await resetDB();

    organizer        = await makeUser("organizer", "org@test.local");
    otherOrganizer   = await makeUser("organizer", "org2@test.local");
    admin            = await makeUser("admin",    "admin@test.local");
    user             = await makeUser("user",     "user@test.local");

    organizerCookie       = authCookie(organizer);
    otherOrganizerCookie  = authCookie(otherOrganizer);
    adminCookie           = authCookie(admin);
    userCookie            = authCookie(user);
});


describe("Eventos — validaciones de negocio al crear", () => {

    it("rechaza una fecha pasada → 400", async () => {
        const res = await request(app)
            .post("/api/events")
            .set("Cookie", organizerCookie)
            .send(baseEvent({ date: "2020-01-01" }));

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/anterior a hoy/i);
    });

    it("rechaza capacity 0 → 400", async () => {
        const res = await request(app)
            .post("/api/events")
            .set("Cookie", organizerCookie)
            .send(baseEvent({ capacity: 0 }));

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/capacidad/i);
    });

    it("rechaza price negativo → 400", async () => {
        const res = await request(app)
            .post("/api/events")
            .set("Cookie", organizerCookie)
            .send(baseEvent({ price: -1 }));

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/precio/i);
    });

    it("rechaza campos obligatorios faltantes → 400", async () => {
        const res = await request(app)
            .post("/api/events")
            .set("Cookie", organizerCookie)
            .send({ title: "Sin más" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/obligatorios/i);
    });

    it("un evento nace siempre en draft (status del body se ignora)", async () => {
        const res = await request(app)
            .post("/api/events")
            .set("Cookie", organizerCookie)
            .send(baseEvent({ status: "published" }));

        expect(res.status).toBe(201);
        expect(res.body.payload.status).toBe("draft");
    });
});


describe("Eventos — transiciones de estado", () => {

    const createAndChange = async (initialStatus, targetStatus) => {
        const event = await eventModel.create({
            ...baseEvent({ status: initialStatus }),
            organizer: organizer._id,
            date: new Date("2027-06-01")
        });

        return await request(app)
            .patch(`/api/events/${event._id}/status`)
            .set("Cookie", organizerCookie)
            .send({ status: targetStatus });
    };

    it("permite draft → published → finished", async () => {
        const a = await createAndChange("draft", "published");
        expect(a.status).toBe(200);

        const b = await createAndChange("published", "finished");
        expect(b.status).toBe(200);
        expect(b.body.payload.status).toBe("finished");
    });

    it("bloquea finished → published con 409 (ya publicado un finalizado)", async () => {
        const res = await createAndChange("finished", "published");

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/No se permite cambiar el estado de finished/i);
    });

    it("cancelled es terminal: cualquier cambio → 409", async () => {
        const res = await createAndChange("cancelled", "published");

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/No se permite cambiar el estado de cancelled/i);
    });

    it("mismo estado → 400 (no-op)", async () => {
        const res = await createAndChange("published", "published");

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/ya tiene ese estado/i);
    });
});


describe("Eventos — control de ownership", () => {

    it("rol user no puede crear eventos → 403", async () => {
        const res = await request(app)
            .post("/api/events")
            .set("Cookie", userCookie)
            .send(baseEvent());

        expect(res.status).toBe(403);
    });

    it("sin sesión → 401", async () => {
        const res = await request(app)
            .post("/api/events")
            .send(baseEvent());

        expect(res.status).toBe(401);
    });

    it("organizer no modifica un evento ajeno → 403", async () => {
        const foreign = await eventModel.create({
            ...baseEvent(),
            organizer: otherOrganizer._id,
            date: new Date("2027-06-01")
        });

        const res = await request(app)
            .put(`/api/events/${foreign._id}`)
            .set("Cookie", organizerCookie)
            .send(baseEvent({ title: "Hackeado" }));

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/modificar este evento/i);
    });

    it("admin sí modifica un evento ajeno → 200", async () => {
        const foreign = await eventModel.create({
            ...baseEvent(),
            organizer: organizer._id,
            date: new Date("2027-06-01")
        });

        const res = await request(app)
            .put(`/api/events/${foreign._id}`)
            .set("Cookie", adminCookie)
            .send(baseEvent({ title: "Editado por admin" }));

        expect(res.status).toBe(200);
        expect(res.body.payload.title).toBe("Editado por admin");
    });

    it("GET de un evento inexistente → 404", async () => {
        const res = await request(app)
            .get("/api/events/6ae3593bc1c05ad84ee8316d");

        expect(res.status).toBe(404);
    });
});


describe("Eventos — listado con filtro organizer", () => {

    it("filtra por organizer combinado con status", async () => {
        await eventModel.create([
            { ...baseEvent({ title: "De org1", status: "published" }),  organizer: organizer._id,      date: new Date("2027-06-01") },
            { ...baseEvent({ title: "De org1 draft", status: "draft" }), organizer: organizer._id,      date: new Date("2027-06-02") },
            { ...baseEvent({ title: "De org2", status: "published" }),  organizer: otherOrganizer._id, date: new Date("2027-06-03") }
        ]);

        const res = await request(app)
            .get(`/api/events?organizer=${organizer._id}&status=published`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.data[0].title).toBe("De org1");
        expect(res.body.data[0].organizer).toBe(organizer._id.toString());
    });

    it("organizer con id malformado → 400", async () => {
        const res = await request(app).get("/api/events?organizer=no-es-id");

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/organizador/i);
    });

    it("la respuesta del listado incluye data, page, limit, total y totalPages", async () => {
        const res = await request(app).get("/api/events");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            status: "success",
            data: expect.any(Array),
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number)
        });
    });
});


describe("Sesiones — flujo real register/login", () => {

    it("register → login → GET /current con la cookie real → 200", async () => {
        const registered = await request(app)
            .post("/api/sessions/register")
            .send({
                first_name: "Flujo",
                last_name: "Completo",
                email: "flujo@test.local",
                password: "Secreta123"
            });

        expect(registered.status).toBe(201);

        const login = await request(app)
            .post("/api/sessions/login")
            .send({ email: "flujo@test.local", password: "Secreta123" });

        expect(login.status).toBe(200);

        const cookie = login.headers["set-cookie"].find(c => c.startsWith("currentUser="));

        const current = await request(app)
            .get("/api/sessions/current")
            .set("Cookie", cookie);

        expect(current.status).toBe(200);
        expect(current.body.payload.email).toBe("flujo@test.local");
    });
});
