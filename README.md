# Backend II — Plataforma de Eventos

API REST para la administración de eventos, construida con **Node.js + Express**, **MongoDB** y **Mongoose**, organizada por capas: `routes → controllers → services → repositories → dao → models`.

> **Estado:** Pre-entrega 8 — **arquitectura con DAO, Repository y DTO**: refactorización por capas formales — DAO (`UserDAO`, `EventDAO`, `TicketDAO`) como únicos que tocan Mongoose, Repository como intermediarios de dominio, services con toda la lógica de negocio (cupos, estados, duplicados, permisos sobre recursos propios, email), controllers solo coordinando request/response y **DTOs** que controlan cada respuesta (nunca exponen password ni campos internos). El comportamiento externo de la API no cambió.

---

## Índice

1. [Temática](#temática)
2. [Tecnologías](#tecnologías)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación](#instalación)
5. [Variables de entorno](#variables-de-entorno)
6. [Autenticación con Passport.js](#autenticación-con-passportjs)
7. [Roles y autorización](#roles-y-autorización)
8. [Reglas de negocio de eventos](#reglas-de-negocio-de-eventos)
9. [Tickets, inscripciones y cupos](#tickets-inscripciones-y-cupos)
10. [Ejecución](#ejecución)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Rutas disponibles](#rutas-disponibles)
13. [Cómo probar la autenticación](#cómo-probar-la-autenticación)
14. [Cómo probar la autorización](#cómo-probar-la-autorización)
15. [Cómo probar el registro](#cómo-probar-el-registro)
16. [Cómo probar las inscripciones](#cómo-probar-las-inscripciones)
17. [Modelos de datos](#modelos-de-datos)
18. [Tests](#tests)
19. [Arquitectura por capas](#arquitectura-por-capas)

---

## Temática

**Plataforma de eventos e inscripciones**: una API que permite consultar y administrar eventos (título, descripción, fecha, ubicación y capacidad), gestionar a los usuarios que acceden a la aplicación y **recibir inscripciones a los eventos** (tickets con control de cupos, cancelación y email de confirmación).

La autenticación es **segura y está centralizada en Passport.js**: el registro valida los datos, normaliza el email y hashea la contraseña con bcrypt; el login compara con bcrypt, firma un **JWT** con `JWT_SECRET` y lo entrega en una cookie **HttpOnly** (`currentUser`) que nunca es accesible desde JavaScript, protegiendo así la ruta `/current` y el logout.

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 18 | Runtime de JavaScript |
| [Express](https://expressjs.com/) | ^5.2.1 | Framework web / ruteo de la API |
| [Mongoose](https://mongoosejs.com/) | ^9.10.1 | ODM para MongoDB |
| [passport](https://www.npmjs.com/package/passport) | ^0.7.0 | Middleware de autenticación (estrategias) |
| [passport-local](https://www.npmjs.com/package/passport-local) | ^1.0.0 | Estrategias `register` y `login` (email + password) |
| [passport-jwt](https://www.npmjs.com/package/passport-jwt) | ^4.0.1 | Estrategia `current` (token desde cookie) |
| [bcrypt](https://www.npmjs.com/package/bcrypt) | ^6.0.0 | Hash de contraseñas |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | ^9.0.3 | Firmar y verificar JWT |
| [cookie-parser](https://www.npmjs.com/package/cookie-parser) | ^1.4.7 | Lectura de cookies en Express |
| [dotenv](https://github.com/motdotla/dotenv) | ^18.0.1 | Variables de entorno |
| [nodemailer](https://nodemailer.com/) | ^10.3.1 | Envío del email de confirmación de inscripción |
| [vitest](https://vitest.dev/) | ^5.1.0 | Framework de tests (devDependency) |
| [supertest](https://github.com/ladjs/supertest) | — | Tests de integración HTTP contra la app (devDependency) |
| [MongoDB](https://www.mongodb.com/) | — | Base de datos |

> El proyecto usa **ECMA Modules** (`"type": "module"` en `package.json`): todos los archivos se comunican con `import` / `export`.

---

## Requisitos previos

- **Node.js** ≥ 18 y **npm**
- **MongoDB** corriendo localmente en el puerto `27017` (o una instancia en la nube, MongoDB Atlas)

---

## Instalación

```bash
# 1. Clonar el repositorio (debe ser público en GitHub)
git clone https://github.com/MateAviles/BACKEND-II-PROYECT-2
cd BACKEND-II-PROYECT-2

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno a partir de la plantilla
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

Completá `.env` con tus valores (ver siguiente sección).

---

## Variables de entorno

Se cargan automáticamente con `dotenv` al levantar el servidor. La plantilla `.env.example` incluye las variables requeridas:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor. Si no está definida, se usa `8080`. | `8080` |
| `NODE_ENV` | Entorno de ejecución. En `production` la cookie se marca `Secure`; en `test` el mailer usa un transporte en memoria. | `development` |
| `MONGO_URL` | URI de conexión a MongoDB. | `mongodb://localhost:27017/` |
| `JWT_SECRET` | Secreto con el que se firman los tokens JWT. | `una-frase-secreta-super-larga` |
| `JWT_EXPIRES_IN` | Expiración del token (formato de `jsonwebtoken`). | `1h` |
| `MAIL_HOST` | Servidor SMTP para Nodemailer. **Si está vacío, en desarrollo se crea una cuenta Ethereal de prueba automáticamente.** | `smtp.mailtrap.io` |
| `MAIL_PORT` | Puerto SMTP (`465` activa `secure`). | `587` |
| `MAIL_USER` | Usuario SMTP. | `usuario` |
| `MAIL_PASS` | Contraseña SMTP (en Gmail: contraseña de aplicación). | `contraseña` |
| `MAIL_FROM` | Remitente mostrado en los emails. | `"Plataforma de Eventos" <no-reply@events.local>` |

> Las credenciales de email **nunca se hardcodean en el código**: viven solo en `.env` (fuera del repositorio). `.env` y `node_modules/` están en `.gitignore`: **nunca se suben al repositorio**. Para verificarlo antes de publicar: `git ls-files .env` no debe devolver nada.

---

## Autenticación con Passport.js

Toda la lógica de autenticación está **centralizada en `src/config/passport.config.js`**. `app.js` solo hace `passport.initialize()` (más el consumo del traductor de errores) y las rutas únicamente delegan en `passport.authenticate(...)`: la lógica no vive ni en la ruta ni en el controller.

### Estrategias implementadas

| Estrategia | Tipo | Ruta que la usa | Responsabilidad |
|---|---|---|---|
| `register` | `passport-local` | `POST /api/sessions/register` | Valida presencia de campos, formato de email, longitud de contraseña, unicidad del email; normaliza el email, hashea con bcrypt y persiste el usuario con rol `user`. Devuelve el usuario **sin password**. |
| `login` | `passport-local` | `POST /api/sessions/login` | Busca el usuario por email normalizado y compara la contraseña con bcrypt. Si algo falla responde siempre con el mensaje genérico `Credenciales inválidas`. El **controller** (no la estrategia) es quien firma el JWT y setea la cookie `currentUser`. |
| `current` | `passport-jwt` | `GET /api/sessions/current` | Lee el JWT desde la cookie `currentUser`, lo verifica con `JWT_SECRET` y deja `{ id, email, role }` en `req.user` (sin password). Responde `401` si no hay token o es inválido/expirado. |

`POST /api/sessions/logout` **no pasa por Passport**: simplemente elimina la cookie.

### Cómo maneja Passport los errores

Cuando una estrategia termina con `done(error)`, Passport propaga ese error **sin modificarlo** al error handler global de `app.js`, que responde `{ status, message }`. Así los endpoints conservan los códigos y mensajes del contrato:

`400 Faltan campos obligatorios` · `400 La contraseña debe tener al menos 6 caracteres` · **`409 El email ya está registrado`** · `401 Credenciales inválidas` · `401 No autenticado`

Passport intercepta dos casos **antes** de invocar la estrategia (credenciales ausentes) y resuelve otros vía `fail()` (token ausente o inválido). En esos pocos casos Passport reemplaza el mensaje por el texto HTTP genérico (`Bad Request` / `Unauthorized`); por eso `passport.config.js` exporta `translatePassportError()`, que el error handler usa para devolver los mensajes propios de la API. **La traducción también vive junto a las estrategias, no en la ruta.**

### Preparado para providers externos

Como las estrategias están todas registradas en `passport.config.js` con `passport.use(nombre, ...)`, **agregar un login con Google, GitHub u otro provider no requiere tocar `app.js` ni los controllers**:

1. Se instala la estrategia correspondiente (ej. `passport-google-oauth20`).
2. Se agrega un bloque nuevo en `src/config/passport.config.js`:

```js
passport.use('google', new GoogleStrategy(
    { clientID, clientSecret, callbackURL },
    async(accessToken, refreshToken, profile, done) => {
        // buscar por profile.emails[0].value o crear el usuario
    }
));
```

3. Se agrega la ruta correspondiente apuntando a esa estrategia (`passport.authenticate('google', ...)`).

Nada más: `passport.initialize()` ya está montado y la infraestructura de cookies/JWT es reutilizable.

---

## Roles y autorización

### Roles disponibles

El modelo `User` define el campo `role` con `enum: ["user", "organizer", "admin"]` y **`default: "user"`**. El registro público es **siempre rol `user`**: la estrategia `register` fuerza `role: "user"` e ignora cualquier valor que llegue en el body (no importa que se envíe `role: "admin"`, queda descartado).

### Matriz de permisos

| Acción | `user` | `organizer` | `admin` |
|---|---|---|---|
| Listar eventos (`GET /api/events`) | ✅ | ✅ | ✅ |
| Ver detalle de un evento (`GET /api/events/:eventId`) | ✅ | ✅ | ✅ |
| Crear eventos (`POST /api/events`) | ❌ | ✅ | ✅ |
| Modificar campos de un evento propio (`PUT /api/events/:eventId`) | ❌ | ✅ | ✅ |
| Modificar campos de cualquier evento (`PUT /api/events/:eventId`) | ❌ | ❌ | ✅ |
| Cambiar el estado de un evento propio (`PATCH /api/events/:eventId/status`) | ❌ | ✅ | ✅ |
| Cambiar el estado de cualquier evento (`PATCH /api/events/:eventId/status`) | ❌ | ❌ | ✅ |
| Inscribirse a un evento (`POST /api/events/:eventId/tickets`) | ✅ | ✅ | ✅ |
| Ver sus propias inscripciones (`GET /api/tickets/my-tickets`) | ✅ | ✅ | ✅ |
| Ver los tickets de un evento (`GET /api/events/:eventId/tickets`) | ❌ | ✅ (solo eventos propios) | ✅ (cualquiera) |
| Cancelar un ticket (`PATCH /api/tickets/:ticketId/cancel`) | ✅ (solo el propio) | ✅ (solo el propio) | ✅ (cualquiera) |
| Ver todos los usuarios (`GET /api/users`) | ❌ | ❌ | ✅ |

### Middlewares (reutilizables y separados de las rutas)

| Middleware | Archivo | Recibe | Respuesta en fallo |
|---|---|---|---|
| `authMiddleware` | `src/middlewares/auth.middleware.js` | — (lee el JWT de la cookie `currentUser` con Passport) | **`401`** `"No autenticado"` cuando no hay sesión válida |
| `authorizeMiddleware(...roles)` | `src/middlewares/authorize.middleware.js` | Lista de roles permitidos | **`403`** `"No tenés permisos para realizar esta acción"` cuando el rol no coincide |
| `authorizeEventOwnerOrAdmin` | `src/middlewares/authorize.middleware.js` | — (lee `req.params.eventId`) | `404` si el evento no existe, **`403`** `"No tenés permisos para modificar este evento"` si es de otro organizador y no sos `admin` |
| `authorizeTicketOwnerOrAdmin` | `src/middlewares/authorize.middleware.js` | — (lee `req.params.ticketId`) | `404` si el ticket no existe, **`403`** `"No tenés permisos para cancelar este ticket"` si es de otro usuario y no sos `admin` |

Las rutas solo encadenan los middlewares; la lógica vive en los archivos de `src/middlewares/`:

```js
router.post('/', authMiddleware, authorizeMiddleware('organizer', 'admin'), createEventController);
```

### 401 vs 403 — la diferencia clave

| Código | Significado | Cuándo ocurre |
|---|---|---|
| **401** | **No estás autenticado** | No hay cookie, el token es inválido/expirado o fue manipulado → `"No autenticado"` |
| **403** | **Estás autenticado pero no podés** | La sesión es válida pero el rol no tiene permiso para esa acción → `"No tenés permisos para realizar esta acción"` |

Ninguno de estos casos responde `500`: el `500` queda reservado para errores reales del servidor.

### Rutas protegidas

| Ruta | Requiere sesión | Roles permitidos |
|---|---|---|
| `GET /api/sessions/current` | ✅ | cualquier rol |
| `POST /api/events` | ✅ | `organizer`, `admin` |
| `PUT /api/events/:eventId` | ✅ | `organizer` (solo eventos propios), `admin` (cualquiera) |
| `PATCH /api/events/:eventId/status` | ✅ | `organizer` (solo eventos propios), `admin` (cualquiera) |
| `POST /api/events/:eventId/tickets` | ✅ | cualquier rol (cualquier usuario autenticado puede inscribirse) |
| `GET /api/tickets/my-tickets` | ✅ | cualquier rol (siempre devuelve solo los tickets propios) |
| `GET /api/events/:eventId/tickets` | ✅ | `organizer` (solo de sus propios eventos), `admin` (cualquiera) |
| `PATCH /api/tickets/:ticketId/cancel` | ✅ | dueño del ticket, `admin` (cualquiera) |
| `GET /api/users` | ✅ | `admin` |

`GET /api/events`, `GET /api/events/:eventId` y `POST /api/sessions/*` son **públicas**: no requieren cookie.

---

## Reglas de negocio de eventos

Todas viven en **`src/services/events.services.js`**, no en las rutas ni en los controllers.

### Al crear (`POST /api/events`)

| Regla | Respuesta |
|---|---|
| `title`, `description`, `category`, `date`, `location` y `capacity` son obligatorios | `400` `"Faltan campos obligatorios"` |
| La `date` debe ser parseable (formato `YYYY-MM-DD` o ISO con hora; rechaza fechas imposibles como `2026-02-31`) | `400` `"La fecha del evento es invalida"` |
| La `date` **no puede ser anterior a hoy** (se compara por día, un evento de hoy a cualquier hora es válido) | `400` `"La fecha del evento no puede ser anterior a hoy"` |
| `capacity` debe ser un **número entero mayor a 0** (no se convierten strings) | `400` `"La capacidad debe ser un número entero mayor a 0"` |
| `price`, si viene, debe ser un número finito **≥ 0** (por defecto `0`) | `400` `"El precio debe ser un número finito mayor o igual a 0"` |
| `organizer` **nunca** se toma del body: siempre es el usuario autenticado (`req.user.id`) | el valor del body se ignora |
| **El evento siempre nace en `draft`**: el `status` del body se ignora (se publica después con `PATCH /:eventId/status`) | el valor del body se ignora |

### Al modificar campos (`PUT /:eventId`)

El `PUT` es una **actualización completa**: el body debe traer **todos** los campos editables (`title`, `description`, `date`, `location`, `capacity`, `category`, `price`); si falta alguno se rechaza.

| Regla | Respuesta |
|---|---|
| Falta algún campo obligatorio en el body | `400` `"Faltan campos obligatorios para modificar el evento"` |
| `title`, `description`, `category` o `location` vacíos | `400` `"Los campos obligatorios no pueden estar vacíos"` |
| El `status` no se cambia por acá (usa `PATCH /:eventId/status`) | el campo se ignora |
| Evento **cancelado o finalizado** | `409` `"El evento esta cancelado o finalizado y no puede modificarse"` |
| Si trae una `date`, debe ser futura y con formato válido | `400` |
| `capacity`/`price` inválidos (tipos estrictos) | `400` |

### Al cambiar el estado (`PATCH /:eventId/status`)

Recibe `{ "status": "..." }`. Las transiciones están declaradas en la tabla `ALLOWED_TRANSITIONS` del service:

```
draft      → published, cancelled
published  → draft, cancelled, finished
finished   → (estado final: no cambia más)
cancelled  → (estado final: no cambia más)
```

| Regla | Respuesta |
|---|---|
| `status` fuera del enum | `400` `"El estado debe ser uno de: ..."` |
| Mismo estado que el actual (no-op) | `400` `"El evento ya tiene ese estado"` |
| Transición no permitida (incluye `finished` → cualquier cosa y `cancelled` → cualquier cosa) | `409` `"No se permite cambiar el estado de finished a published"` (ejemplo) |

> **Cancelar es un borrado lógico**: el evento pasa a `cancelled` pero **nunca se elimina físicamente** de la base de datos; sigue siendo consultable con `GET /api/events/:eventId`.

### Listado (`GET /api/events`)

| Query param | Valores | Comportamiento |
|---|---|---|
| `status` | `draft` \| `published` \| `cancelled` \| `finished` | Valores fuera del enum → `400` |
| `category` | string | Coincidencia exacta |
| `location` | string | Coincidencia exacta |
| `organizer` | ObjectId de un usuario | Coincidencia exacta. Se puede **combinar** con los demás filtros (ej. `?organizer=...&status=published`). Id malformado → `400` `"El organizador es invalido"` |
| `dateFrom` | ISO o `YYYY-MM-DD` | `>=` esa fecha. Inválida → `400` |
| `dateTo` | ISO o `YYYY-MM-DD` | `<=` esa fecha. Si es solo fecha (`YYYY-MM-DD`) se toma como **fin de día** (23:59:59.999) para incluir los eventos de ese día aunque tengan hora. Inválida → `400` |
| `page` | entero ≥ 1 (default `1`) | Fuera de rango → `data: []` con el `total` real |
| `limit` | entero 1–100 (default `10`) | Inválido → default `10` |
| `sort` | `date` (default), `title`, `price`, `capacity`, `createdAt`, con `-` al inicio para descendente (ej. `sort=-price`) | Campo no permitido → orden por `date` |

---

## Tickets, inscripciones y cupos

Toda la lógica de inscripciones vive en **`src/services/tickets.services.js`** (mismo patrón que eventos: las rutas solo encadenan middlewares y delegan en el controller).

### Modelo `Ticket`

| Campo | Tipo | Restricciones |
|---|---|---|
| `user` | ObjectId | requerido, **referencia a `User`** (nunca el objeto embebido) |
| `event` | ObjectId | requerido, **referencia a `Event`** (nunca el objeto embebido) |
| `status` | String | enum `confirmed` \| `pending` \| `cancelled`, por defecto `confirmed` |
| `quantity` | Number | requerido, entero `min: 1` (lugares que reserva) |
| `reservationCode` | String | requerido, **único** — se genera en el service, ej. `TKT-3F9A2B1C7D4E` |
| `cancelledAt` | Date | por defecto `null`; se completa al cancelar |

Habilita `timestamps` (`createdAt` / `updatedAt`) e índices:

- **Único parcial** `{ user, event }` donde `status ≠ cancelled` → la BD misma garantiza un único ticket **activo** por usuario por evento (los cancelados no bloquean).
- `{ event, status }` → cálculo rápido de cupos.

### Estados de un ticket

```
confirmed ──cancelar──▶ cancelled   (estado final, no vuelve)
pending   ──cancelar──▶ cancelled   (estado final)
```

**Cancelar nunca elimina el documento**: cambia `status` a `cancelled` y registra `cancelledAt`. El ticket sigue existiendo en la base de datos (borrado lógico, igual que los eventos).

### Regla de cupos

```
ocupados   = Σ quantity de los tickets con status confirmed o pending
disponibles = event.capacity − ocupados
```

- Los tickets `cancelled` **no se cuentan** → al cancelar, el cupo queda disponible automáticamente (sin ningún ajuste extra: simplemente no entra en la suma).
- La suma vive en el DAO (`sumActiveQuantityByEvent` con `aggregate`), se llama desde el service y **nunca** desde el controller.

### Flujo de inscripción (`POST /api/events/:eventId/tickets`)

Validaciones **en el service**, en este orden:

| # | Validación | Respuesta |
|---|---|---|
| 1 | El `eventId` es un ObjectId válido y el evento existe | `404` `"Evento no encontrado"` |
| 2 | `quantity` es un número **entero > 0** | `400` `"La cantidad debe ser un número entero mayor a 0"` |
| 3 | El evento está `cancelled` | `409` `"El evento está cancelado y no admite inscripciones"` |
| 4 | El evento está `finished` | `409` `"El evento está finalizado y no admite inscripciones"` |
| 5 | El evento no está `published` (está en `draft`) | `400` `"El evento no está publicado y no admite inscripciones"` |
| 6 | Hay cupos suficientes (`disponibles >= quantity`) | `409` `"No hay cupos suficientes: quedan N disponibles"` |
| 7 | El usuario **no** tiene ya un ticket activo para ese evento | `409` `"Ya tenés una inscripción activa para este evento"` |

Si pasa todo: se crea el ticket `confirmed` con su `reservationCode` y se envía el **email de confirmación** (ver abajo).

### Cancelación (`PATCH /api/tickets/:ticketId/cancel`)

- El middleware `authorizeTicketOwnerOrAdmin` valida **existencia** (`404`) y **pertenencia** (`403` si el ticket es ajeno y no sos `admin`), dejando el ticket en `req.ticket`.
- El service valida que **no esté ya cancelado** → `409` `"El ticket ya está cancelado"` y si no, actualiza `status: cancelled` + `cancelledAt: new Date()`.
- El cupo queda libre automáticamente porque los `cancelled` no entran en la suma.

### Email de confirmación (Nodemailer)

- **`src/utils/mailer.js`** centraliza el envío; el service lo llama **después** de crear el ticket.
- Tres modos de transporte, en orden:
  1. `NODE_ENV=test` → `streamTransport` en memoria (sin red) y registra cada envío en el array `sentMails` para los tests.
  2. `MAIL_HOST` definido → SMTP real con las credenciales del `.env`.
  3. Sin `MAIL_HOST` (desarrollo) → crea una cuenta **Ethereal** de prueba y loguea la URL de previsualización del mensaje.
- Credenciales **solo por variables de entorno** (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`): jamás en el código.
- **Mejor esfuerzo**: si el envío falla, se loguea el error y la inscripción **no se revierte** (un email caído no debería impedir una inscripción).

---

## Ejecución

```bash
# Opción 1 (recomendada)
npm start

# Opción 2
node src/server.js
```

Salida esperada en consola:

```
Servidor corriendo em 8080
conectado a mongodb
```

- Queda disponible en `http://localhost:8080`.
- Si la conexión a MongoDB falla, el proceso termina con `exit(1)`.

Verificación rápida:

```bash
curl http://localhost:8080/api/health
# → { "status": "ok", "message": "Servidor activo" }
```

---

## Estructura del proyecto

```
BACKEND-II/
├── .env                  # Variables de entorno (NO se versiona)
├── .env.example          # Plantilla: PORT, NODE_ENV, MONGO_URL, JWT_SECRET, JWT_EXPIRES_IN, MAIL_*
├── .gitignore            # Excluye .env y node_modules/
├── package.json          # type: module (ESM) + scripts start / test
├── package-lock.json
├── vitest.config.js      # Configuración de Vitest (setup de la BD de test, tests en serie)
├── README.md
├── tests/
│   ├── setup.js          # Conexión a la BD de test, reset de colecciones y env de testing
│   ├── events.test.js    # Validaciones, transiciones, ownership, filtros y flujo de sesiones
│   └── tickets.test.js   # Los 10 casos de la consigna de inscripciones
└── src/
    ├── app.js            # Configura Express (express.json(), cookieParser, passport.initialize(), rutas, error handler centralizado)
    ├── server.js         # Punto de entrada: dotenv, conexión a BD y app.listen
    ├── config/
    │   ├── db.js                     # Conexión a MongoDB con Mongoose
    │   └── passport.config.js        # Estrategias register / login / current + traductor de errores (usa el repository de usuarios)
    ├── routes/
    │   ├── events.router.js          # GET / y GET /:eventId (públicos), POST, PUT /:eventId, PATCH /:eventId/status y montaje de /:eventId/tickets
    │   ├── tickets.router.js         # eventTicketsRouter (POST/GET bajo /api/events/:eventId/tickets) + ticketsRouter (my-tickets y cancel)
    │   ├── sessions.router.js        # register, login, current (protegida), logout — delegan en passport.authenticate
    │   └── users.router.js           # GET /api/users — solo admin
    ├── controllers/                  # SOLO coordinan request/response (extraen datos, llaman al service, responden con DTO)
    │   ├── events.controller.js      # getEvents, getEventById, createEvent, updateEvent, updateEventStatus
    │   ├── tickets.controllers.js    # createTicket, getMyTickets, getEventTickets, cancelTicket
    │   ├── sessions.controller.js    # register, login (firma JWT y setea cookie), current, logout
    │   └── users.controller.js       # getUsers
    ├── services/                     # TODA la lógica de negocio (consumen repositories, nunca DAOs ni modelos)
    │   ├── events.services.js        # fetchEvents (filtros + paginación + sort), createEvent, loadEvent, loadManagedEvent (permisos), updateEventService, updateEventStatusService (ALLOWED_TRANSITIONS)
    │   ├── tickets.services.js       # createTicketService (cupos, duplicados, estado del evento), loadOwnedTicket (permisos), fetchMyTickets, fetchEventTickets, cancelTicketService
    │   └── users.services.js         # fetchUsers
    ├── repositories/                 # Intermediarios de DOMINIO entre services y DAO (clases)
    │   ├── users.repository.js       # UserRepository: findByEmail, findById, save, findAll
    │   ├── events.repository.js      # EventRepository: findEvents, countEvents, findById, save, update
    │   └── tickets.repository.js     # TicketRepository: createTicket, findTicketById, findActiveTicket, countActiveTickets, sumActiveQuantities, findUserTickets, findEventTickets, cancelTicket
    ├── dao/                          # Acceso genérico a datos (clases): ÚNICOS que importan modelos de Mongoose
    │   ├── users.dao.js              # UserDAO: create, findById, findOne, find, update, count
    │   ├── events.dao.js             # EventDAO: create, findById, findOne, find (sort/skip/limit/populate), update, count
    │   └── tickets.dao.js            # TicketDAO: create, findById, findOne, find, update, count, sum (aggregate)
    ├── dto/                          # Controlan qué campos se exponen en cada respuesta
    │   ├── user.dto.js               # sessionUserDTO (usuario autenticado) y userDTO (listado admin) — nunca password
    │   ├── event.dto.js              # eventDTO — campos públicos del evento, organizer como id
    │   └── ticket.dto.js             # ticketDTO — filtra también los documentos populados (user / event)
    ├── models/
    │   ├── User.js                   # Schema de usuarios (role: user | organizer | admin)
    │   ├── Event.js                  # Schema de eventos (organizer referenciado a User, timestamps)
    │   └── Ticket.js                 # Schema de tickets (refs a User y Event, índice único parcial anti-duplicados)
    ├── middlewares/
    │   ├── auth.middleware.js         # authMiddleware: JWT de la cookie → req.user o 401
    │   └── authorize.middleware.js    # authorizeMiddleware(roles) → 403 | authorizeEventOwnerOrAdmin / authorizeTicketOwnerOrAdmin (invocan las reglas de los services)
    └── utils/
        ├── jwt.js                    # generateToken / verifyToken (jsonwebtoken)
        ├── hash.js                   # hashPassword / isValidPassword (bcrypt)
        ├── ids.js                    # isValidObjectId (sin depender de Mongoose)
        ├── errors.js                 # createError(message, status) → error con status para el error handler global
        └── mailer.js                 # Nodemailer: transporter (test / SMTP / Ethereal) + sendTicketConfirmation
```

> La lógica de autenticación vive en `config/passport.config.js`, la de autorización en `middlewares/`, la de JWT en `utils/jwt.js` y la de bcrypt en `utils/hash.js`: **ninguna se define en las rutas ni en `app.js`**.

---

## Rutas disponibles

Base URL: `http://localhost:8080`

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | Health check del servidor. | `200` |
| `GET` | `/api/events` | Listado de eventos (público) con filtros, paginación y ordenamiento. | `200` / `400` |
| `GET` | `/api/events/:eventId` | Detalle de un evento (público). | `200` / `404` |
| `POST` | `/api/events` | **Protegida**: crea un evento (`organizer` / `admin`). | `201` / `400` / `401` / `403` |
| `PUT` | `/api/events/:eventId` | **Protegida**: modifica campos de un evento propio o, siendo `admin`, de cualquiera. | `200` / `400` / `401` / `403` / `404` / `409` |
| `PATCH` | `/api/events/:eventId/status` | **Protegida**: cambia el `status` de un evento propio o, siendo `admin`, de cualquiera. | `200` / `400` / `401` / `403` / `404` / `409` |
| `POST` | `/api/events/:eventId/tickets` | **Protegida**: inscripción a un evento `published` (cualquier rol). | `201` / `400` / `401` / `404` / `409` |
| `GET` | `/api/events/:eventId/tickets` | **Protegida**: tickets de un evento — `organizer` del evento o `admin`. | `200` / `401` / `403` / `404` |
| `GET` | `/api/tickets/my-tickets` | **Protegida**: tickets propios con datos del evento (`populate`). | `200` / `401` |
| `PATCH` | `/api/tickets/:ticketId/cancel` | **Protegida**: cancela un ticket propio o, siendo `admin`, cualquiera. | `200` / `401` / `403` / `404` / `409` |
| `POST` | `/api/sessions/register` | Registro de usuario nuevo (siempre rol `user`). | `201` / `400` / `409` |
| `POST` | `/api/sessions/login` | Login: genera JWT y setea la cookie `currentUser`. | `200` / `401` |
| `GET` | `/api/sessions/current` | **Protegida**: devuelve el usuario de la cookie. | `200` / `401` |
| `POST` | `/api/sessions/logout` | Elimina la cookie `currentUser`. | `200` |
| `GET` | `/api/users` | **Protegida — solo `admin`**: listado de usuarios sin contraseñas. | `200` / `401` / `403` |

### `GET /api/health`

Request: sin body.

```json
{ "status": "ok", "message": "Servidor activo" }
```

### `GET /api/events`

Público. Acepta los query params documentados en [Reglas de negocio de eventos](#reglas-de-negocio-de-eventos) (`status`, `category`, `location`, `dateFrom`, `dateTo`, `page`, `limit`, `sort`).

```bash
curl "http://localhost:8080/api/events?status=published&category=workshop&page=1&limit=5&sort=-date"
```

Respuesta `200`:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "690a...",
      "title": "Taller de cerámica",
      "description": "Nivel inicial",
      "category": "workshop",
      "date": "2026-12-02T19:00:00.000Z",
      "location": "Sala 3",
      "capacity": 20,
      "price": 3500,
      "status": "published",
      "organizer": "665f2a..."
    }
  ],
  "page": 1,
  "limit": 5,
  "total": 12,
  "totalPages": 3
}
```

| Caso | Status | Respuesta |
|---|---|---|
| `status` fuera del enum, fecha inválida o rango invertido | `400` | `{ "status": "error", "message": "..." }` |
| `page` fuera de rango | `200` | `data: []` con el `total` real |

### `GET /api/events/:eventId`

Público. Devuelve el evento completo.

```bash
curl http://localhost:8080/api/events/690a...
```

Respuesta `200`: `{ "status": "success", "payload": { ...evento } }`.

| Caso | Status | Respuesta |
|---|---|---|
| Id inexistente o malformado | `404` | `{ "status": "error", "message": "Evento no encontrado" }` |

### `POST /api/events` 🔒 (`organizer` | `admin`)

Request:

```json
{
  "title": "Congreso Tech 2026",
  "description": "Evento nuevo",
  "category": "workshop",
  "date": "2027-12-01",
  "location": "Virtual",
  "capacity": 500,
  "price": 1500
}
```

> El `organizer` **siempre** se toma del usuario autenticado (`req.user.id`), nunca del body: si viene en el body se ignora.
> `category` y `price` son opcionales (`price` por defecto `0`). El `status` también se ignora: **el evento siempre nace en `draft`** y se publica después con `PATCH /:eventId/status`.

Respuesta `201`:

```json
{
  "status": "success",
  "payload": {
    "title": "Congreso Tech 2026",
    "description": "Evento nuevo",
    "category": "workshop",
    "date": "2027-12-01T00:00:00.000Z",
    "location": "Virtual",
    "capacity": 500,
    "price": 1500,
    "status": "draft",
    "organizer": "665f2a...",
    "_id": "690b...",
    "__v": 0
  }
}
```

Errores:

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Rol `user` autenticado | `403` | `{ "status": "error", "message": "No tenés permisos para realizar esta acción" }` |
| Fecha pasada, `capacity` inválida, `price` negativo o campos faltantes | `400` | `{ "status": "error", "message": "..." }` |

### `PUT /api/events/:eventId` 🔒 (`organizer` propio | `admin`)

Request — **actualización completa**: debe incluir todos los campos editables (`title`, `description`, `date`, `location`, `capacity`, `category`, `price`). El `status` no se cambia por acá:

```json
{
  "title": "Titulo nuevo",
  "description": "Descripción nueva",
  "date": "2027-06-01",
  "location": "Sala 2",
  "capacity": 200,
  "category": "workshop",
  "price": 1500
}
```

Respuesta `200` con el evento actualizado.

Errores:

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Rol `user` | `403` | `{ "status": "error", "message": "No tenés permisos para realizar esta acción" }` |
| `organizer` sobre evento **ajeno** | `403` | `{ "status": "error", "message": "No tenés permisos para modificar este evento" }` |
| Evento inexistente o id malformado | `404` | `{ "status": "error", "message": "Evento no encontrado" }` |
| Falta algún campo editable en el body | `400` | `{ "status": "error", "message": "Faltan campos obligatorios para modificar el evento" }` |
| Campos obligatorios vacíos, fecha pasada o `capacity`/`price` inválidos | `400` | `{ "status": "error", "message": "..." }` |
| Evento **cancelado o finalizado** | `409` | `{ "status": "error", "message": "El evento esta cancelado o finalizado y no puede modificarse" }` |

### `PATCH /api/events/:eventId/status` 🔒 (`organizer` propio | `admin`)

Request:

```json
{ "status": "published" }
```

> Ver la tabla de transiciones permitidas en [Reglas de negocio de eventos](#reglas-de-negocio-de-eventos).

Respuesta `200` con el evento actualizado.

Errores:

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Rol `user` o evento ajeno (no `admin`) | `403` | `{ "status": "error", "message": "..." }` |
| Evento inexistente o id malformado | `404` | `{ "status": "error", "message": "Evento no encontrado" }` |
| `status` fuera del enum o igual al actual | `400` | `{ "status": "error", "message": "..." }` |
| Transición no permitida (`finished` → otro, `cancelled` → otro) | `409` | `{ "status": "error", "message": "No se permite cambiar el estado de finished a published" }` |

### `POST /api/events/:eventId/tickets` 🔒 (cualquier rol)

Inscribe al usuario autenticado en el evento. Request (ambos campos opcionales):

```json
{ "quantity": 2 }
```

`quantity` por defecto `1`; debe ser un número entero `> 0`. Ver todas las validaciones en [Tickets, inscripciones y cupos](#tickets-inscripciones-y-cupos).

Respuesta `201`:

```json
{
  "status": "success",
  "payload": {
    "_id": "6910...",
    "user": "665f...",
    "event": { "_id": "690a...", "title": "Taller de cerámica", "date": "2027-06-01T00:00:00.000Z", "location": "Sala 3" },
    "status": "confirmed",
    "quantity": 2,
    "reservationCode": "TKT-3F9A2B1C7D4E",
    "cancelledAt": null,
    "createdAt": "..."
  }
}
```

Errores:

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Evento inexistente o id malformado | `404` | `{ "status": "error", "message": "Evento no encontrado" }` |
| `quantity` no entera o `<= 0` | `400` | `{ "status": "error", "message": "La cantidad debe ser un número entero mayor a 0" }` |
| Evento en `draft` | `400` | `{ "status": "error", "message": "El evento no está publicado y no admite inscripciones" }` |
| Evento `cancelled` o `finished` | `409` | `{ "status": "error", "message": "El evento está cancelado/finalizado y no admite inscripciones" }` |
| Sin cupos suficientes | `409` | `{ "status": "error", "message": "No hay cupos suficientes: quedan 0 disponibles" }` |
| Ya tiene un ticket activo para ese evento | `409` | `{ "status": "error", "message": "Ya tenés una inscripción activa para este evento" }` |

> Si la inscripción sale bien, se envía el email de confirmación (si falla, se loguea y el ticket queda igual: mejor esfuerzo).

### `GET /api/events/:eventId/tickets` 🔒 (`organizer` del evento | `admin`)

Lista los tickets de un evento con los datos de los inscriptos (`populate` de `user`: `first_name`, `last_name`, `email` — nunca contraseñas).

```bash
curl -b organizer.txt http://localhost:8080/api/events/ID_EVENTO/tickets
```

Respuesta `200`: `{ "status": "success", "payload": [ ...tickets ] }`.

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Rol `user` | `403` | `{ "status": "error", "message": "No tenés permisos para realizar esta acción" }` |
| `organizer` sobre evento **ajeno** | `403` | `{ "status": "error", "message": "No tenés permisos para modificar este evento" }` |
| Evento inexistente o id malformado | `404` | `{ "status": "error", "message": "Evento no encontrado" }` |

### `GET /api/tickets/my-tickets` 🔒 (propios)

Devuelve **solo** los tickets del usuario autenticado, con `populate` del evento (`title`, `date`, `location`) y ordenados por `createdAt` descendente. Nunca expone tickets de otros usuarios.

```bash
curl -b cookies.txt http://localhost:8080/api/tickets/my-tickets
```

Respuesta `200`:

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "6910...",
      "user": "665f...",
      "event": { "_id": "690a...", "title": "Taller de cerámica", "date": "2027-06-01T00:00:00.000Z", "location": "Sala 3" },
      "status": "confirmed",
      "quantity": 2,
      "reservationCode": "TKT-3F9A2B1C7D4E"
    }
  ]
}
```

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |

### `PATCH /api/tickets/:ticketId/cancel` 🔒 (dueño | `admin`)

Request: sin body. Cambia el ticket a `cancelled` y registra `cancelledAt` (**no lo elimina**); el cupo queda libre.

```bash
curl -b cookies.txt -X PATCH http://localhost:8080/api/tickets/ID_TICKET/cancel
```

Respuesta `200` con el ticket cancelado (`status: "cancelled"`, `cancelledAt` completo).

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Ticket inexistente o id malformado | `404` | `{ "status": "error", "message": "Ticket no encontrado" }` |
| Ticket de **otro usuario** (no `admin`) | `403` | `{ "status": "error", "message": "No tenés permisos para cancelar este ticket" }` |
| Ticket **ya cancelado** | `409` | `{ "status": "error", "message": "El ticket ya está cancelado" }` |

### `GET /api/users` 🔒 (solo `admin`)

Request: sin body (solo cookie `currentUser`).

Respuesta `200` — listado **sin contraseñas**:

```json
{
  "status": "success",
  "payload": [
    { "_id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user", "createdAt": "..." }
  ]
}
```

Errores: `401` sin sesión, `403` con sesión de rol `user` u `organizer`.

### `POST /api/sessions/register`

Request:

```json
{ "first_name": "Ana", "last_name": "Pérez", "email": "  Ana@Mail.com  ", "password": "Secreta123" }
```

Respuesta `201` — **sin contraseña** y con el email normalizado:

```json
{
  "status": "success",
  "payload": {
    "id": "665f2a...",
    "first_name": "Ana",
    "last_name": "Pérez",
    "email": "ana@mail.com",
    "role": "user",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Errores:

| Código | Condición | Respuesta |
|---|---|---|
| `400` | Faltan campos obligatorios | `{ "status": "error", "message": "Faltan campos obligatorios" }` |
| `400` | Email con formato inválido | `{ "status": "error", "message": "Faltan campos obligatorios" }` |
| `400` | Contraseña menor a 6 caracteres | `{ "status": "error", "message": "La contraseña debe tener al menos 6 caracteres" }` |
| `400` | Cuerpo con JSON malformado | `{ "status": "error", "message": "JSON inválido en el cuerpo de la petición" }` |
| `409` | El email ya está registrado | `{ "status": "error", "message": "El email ya está registrado" }` |

### `POST /api/sessions/login`

Request:

```json
{ "email": "ana@mail.com", "password": "Secreta123" }
```

Response `200` — además setea la cookie `currentUser` (HttpOnly):

```json
{ "status": "success", "message": "Login correcto" }
```

```
Set-Cookie: currentUser=<JWT>; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax
```

> En producción (`NODE_ENV=production`) el header incluye además `Secure`.

Response `401` (credenciales incorrectas — mensaje genérico, no revela si falló el email o la contraseña):

```json
{ "status": "error", "message": "Credenciales inválidas" }
```

> Si faltan `email` o `password` responde `400` con el mismo mensaje `"Credenciales inválidas"`.

El JWT quedó firmado con `JWT_SECRET` y contiene exactamente este payload:

```json
{ "id": "665f2a...", "email": "ana@mail.com", "role": "user", "iat": 1791320422, "exp": 1791324022 }
```

### `GET /api/sessions/current` 🔒

Request — requiere la cookie `currentUser` que devuelve el login:

```
Cookie: currentUser=<JWT>
```

Response `200`:

```json
{ "status": "success", "payload": { "id": "665f2a...", "email": "ana@mail.com", "role": "user" } }
```

Response `401` (sin cookie, o token inválido/expirado):

```json
{ "status": "error", "message": "No autenticado" }
```

### `POST /api/sessions/logout`

Request — con la cookie `currentUser`:

```
Cookie: currentUser=<JWT>
```

Response `200` (y la cookie queda eliminada):

```json
{ "status": "success", "message": "Sesión cerrada" }
```

> Tras el logout, `/api/sessions/current` responde `401`.
>
> Todas las respuestas son JSON. El body se parsea con `express.json()` y un error handler global garantiza que **nunca** se responda HTML.

---

## Cómo probar la autenticación

Flujo completo (guarda la cookie con `-c` y la reutiliza con `-b`):

```bash
# 1) Registrarse
curl -X POST http://localhost:8080/api/sessions/register \
     -H "Content-Type: application/json" \
     -d '{ "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "password": "Secreta123" }'

# 2) Login → guarda la cookie currentUser
curl -c cookies.txt -X POST http://localhost:8080/api/sessions/login \
     -H "Content-Type: application/json" \
     -d '{ "email": "ana@mail.com", "password": "Secreta123" }'

# 3) Ruta protegida CON la cookie → 200
curl -b cookies.txt http://localhost:8080/api/sessions/current

# 4) Ruta protegida SIN cookie → 401
curl http://localhost:8080/api/sessions/current

# 5) Token manipulado → 401
curl -b "currentUser=token.falsificado.aqui" http://localhost:8080/api/sessions/current

# 6) Logout → borra la cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:8080/api/sessions/logout

# 7) /current después del logout → 401
curl -b cookies.txt http://localhost:8080/api/sessions/current
```

Casos de credenciales:

```bash
# Email inexistente → 401 "Credenciales inválidas"
curl -X POST http://localhost:8080/api/sessions/login \
     -H "Content-Type: application/json" \
     -d '{ "email": "noexiste@mail.com", "password": "Secreta123" }'

# Contraseña incorrecta → 401 "Credenciales inválidas" (mismo mensaje)
curl -X POST http://localhost:8080/api/sessions/login \
     -H "Content-Type: application/json" \
     -d '{ "email": "ana@mail.com", "password": "otraClave" }'
```

Atributos de la cookie `currentUser`:

| Atributo | Valor | Por qué |
|---|---|---|
| `httpOnly` | `true` | JavaScript no puede leerla (protege contra XSS). |
| `sameSite` | `lax` | Mitiga ataques CSRF. |
| `maxAge` | `3600000` ms (1 h) | Coincide con la expiración del JWT. |
| `secure` | `true` solo si `NODE_ENV=production` | Solo se envía por HTTPS en producción. |

---

## Cómo probar la autorización

Los usuarios de prueba se crean con un rol específico (el registro público siempre da `user`, así que `organizer` y `admin` se crean directo en la base de datos con `UserModel.create({... role: "organizer"})`). Con cada uno se hace login para obtener su cookie:

```bash
# 1) POST /api/events SIN cookie → 401 "No autenticado"
curl -X POST http://localhost:8080/api/events \
     -H "Content-Type: application/json" \
     -d '{ "title": "Congreso Tech 2026", "description": "Evento nuevo", "category": "workshop", "date": "2027-12-01", "location": "Virtual", "capacity": 500 }'

# 2) POST /api/events con rol user → 403 "No tenés permisos para realizar esta acción"
curl -b user.txt -X POST http://localhost:8080/api/events \
     -H "Content-Type: application/json" \
     -d '{ "title": "Congreso Tech 2026", "description": "Evento nuevo", "category": "workshop", "date": "2027-12-01", "location": "Virtual", "capacity": 500 }'

# 3) POST /api/events con rol organizer → 201 (el evento queda como propio y en draft)
curl -b organizer.txt -X POST http://localhost:8080/api/events \
     -H "Content-Type: application/json" \
     -d '{ "title": "Congreso Tech 2026", "description": "Evento nuevo", "category": "workshop", "date": "2027-12-01", "location": "Virtual", "capacity": 500 }'

# 4) Ruta administrativa GET /api/users con rol organizer → 403
curl -b organizer.txt http://localhost:8080/api/users

# 5) Ruta administrativa GET /api/users con rol admin → 200 (sin passwords)
curl -b admin.txt http://localhost:8080/api/users

# 6) PUT sobre evento AJENO con organizer → 403 "No tenés permisos para modificar este evento"
#    (el PUT exige TODOS los campos: es actualización completa)
curl -b organizer.txt -X PUT http://localhost:8080/api/events/ID_DE_OTRO \
     -H "Content-Type: application/json" \
     -d '{ "title": "Titulo nuevo", "description": "Descripcion nueva", "date": "2027-12-01", "location": "Sala 2", "capacity": 200, "category": "workshop", "price": 1500 }'

# 7) PUT sobre evento propio con organizer → 200 | con admin → 200 aunque sea ajeno
curl -b organizer.txt -X PUT http://localhost:8080/api/events/ID_PROPIO \
     -H "Content-Type: application/json" \
     -d '{ "title": "Titulo nuevo", "description": "Descripcion nueva", "date": "2027-12-01", "location": "Sala 2", "capacity": 200, "category": "workshop", "price": 1500 }'

# 7b) PUT con un campo faltante → 400 "Faltan campos obligatorios para modificar el evento"
curl -b organizer.txt -X PUT http://localhost:8080/api/events/ID_PROPIO \
     -H "Content-Type: application/json" -d '{ "capacity": 200 }'

# 8) Cambiar estado de un evento propio → 200 (draft → published)
curl -b organizer.txt -X PATCH http://localhost:8080/api/events/ID_PROPIO/status \
     -H "Content-Type: application/json" -d '{ "status": "published" }'

# 9) Cambiar estado de un evento CANCELADO → 409 "No se permite cambiar el estado de cancelled a published"
curl -b organizer.txt -X PATCH http://localhost:8080/api/events/ID_CANCELADO/status \
     -H "Content-Type: application/json" -d '{ "status": "published" }'

# 10) Cancelar un evento (borrado lógico: no se elimina de la BD) → 200
curl -b organizer.txt -X PATCH http://localhost:8080/api/events/ID_PROPIO/status \
     -H "Content-Type: application/json" -d '{ "status": "cancelled" }'

# 11) El evento cancelado sigue consultable → 200
curl http://localhost:8080/api/events/ID_PROPIO
```

---

## Cómo probar el registro

### Campos que espera el endpoint

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `first_name` | string | ✅ | Se guarda con `trim`. |
| `last_name` | string | ✅ | Se guarda con `trim`. |
| `email` | string | ✅ | Debe tener formato válido. Se normaliza a **minúsculas y sin espacios** antes de guardar. Debe ser único. |
| `password` | string | ✅ | Mínimo **6** caracteres. Se guarda hasheada con bcrypt (nunca en texto plano). |
| `role` | string | ❌ | **Ignorado en el registro público**: siempre se asigna `user`. Valores posibles del modelo: `user`, `organizer`, `admin`. |

### Ejemplos con curl

```bash
# 1) Registro exitoso (el email se normaliza: "  Ana@Mail.com  " → "ana@mail.com")
curl -X POST http://localhost:8080/api/sessions/register \
     -H "Content-Type: application/json" \
     -d '{ "first_name": "Ana", "last_name": "Pérez", "email": "  Ana@Mail.com  ", "password": "Secreta123" }'

# 2) Campos faltantes → 400
curl -X POST http://localhost:8080/api/sessions/register \
     -H "Content-Type: application/json" \
     -d '{ "first_name": "Ana", "email": "ana@mail.com" }'

# 3) Email con formato inválido → 400
curl -X POST http://localhost:8080/api/sessions/register \
     -H "Content-Type: application/json" \
     -d '{ "first_name": "Ana", "last_name": "Pérez", "email": "no-es-un-email", "password": "Secreta123" }'

# 4) Email ya registrado → 409 (repetir el registro del punto 1)
curl -X POST http://localhost:8080/api/sessions/register \
     -H "Content-Type: application/json" \
     -d '{ "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "password": "Secreta123" }'

# 5) Contraseña muy corta → 400
curl -X POST http://localhost:8080/api/sessions/register \
     -H "Content-Type: application/json" \
     -d '{ "first_name": "Ana", "last_name": "Pérez", "email": "corta@mail.com", "password": "abc" }'
```

### Verificar que la contraseña no se guarda en texto plano

```bash
mongosh mongodb://localhost:27017/ --eval 'db.users.findOne({ email: "ana@mail.com" }, { password: 1 })'
```

Resultado esperado:

```json
{ "_id": "...", "password": "$2b$10$r3IF7ZIac43sRduFQLKfQ..." }
```

El valor comienza con `$2b$` → es el hash de bcrypt, no la contraseña en texto plano.

---

## Cómo probar las inscripciones

Flujo completo con un evento `published` (los eventos nacen en `draft`: publícalo primero con `PATCH /:eventId/status`):

```bash
# 0) El evento debe estar published (organizer o admin)
curl -b organizer.txt -X PATCH http://localhost:8080/api/events/ID_EVENTO/status \
     -H "Content-Type: application/json" -d '{ "status": "published" }'

# 1) Inscribirse → 201 con reservationCode (y email de confirmación)
curl -b user.txt -X POST http://localhost:8080/api/events/ID_EVENTO/tickets \
     -H "Content-Type: application/json" -d '{ "quantity": 2 }'

# 2) Inscripción SIN sesión → 401 "No autenticado"
curl -X POST http://localhost:8080/api/events/ID_EVENTO/tickets \
     -H "Content-Type: application/json" -d '{ "quantity": 1 }'

# 3) Evento inexistente → 404 "Evento no encontrado"
curl -b user.txt -X POST http://localhost:8080/api/events/6ae3593bc1c05ad84ee8316d/tickets \
     -H "Content-Type: application/json" -d '{ "quantity": 1 }'

# 4) Evento cancelado o finalizado → 409 (y si está en draft → 400)
curl -b user.txt -X POST http://localhost:8080/api/events/ID_CANCELADO/tickets \
     -H "Content-Type: application/json" -d '{ "quantity": 1 }'

# 5) Sin cupos → 409 "No hay cupos suficientes: quedan N disponibles"
curl -b user2.txt -X POST http://localhost:8080/api/events/ID_EVENTO/tickets \
     -H "Content-Type: application/json" -d '{ "quantity": 999 }'

# 6) Duplicado activo → 409 "Ya tenés una inscripción activa para este evento"
curl -b user.txt -X POST http://localhost:8080/api/events/ID_EVENTO/tickets \
     -H "Content-Type: application/json" -d '{ "quantity": 1 }'

# 7) Mis tickets → 200 (solo los propios, con title/date/location del evento)
curl -b user.txt http://localhost:8080/api/tickets/my-tickets

# 8) Cancelar el ticket propio → 200 (status cancelled + cancelledAt; el cupo se libera)
curl -b user.txt -X PATCH http://localhost:8080/api/tickets/ID_TICKET/cancel

# 9) Cancelar el ticket de OTRO usuario como user → 403 "No tenés permisos para cancelar este ticket"
curl -b user2.txt -X PATCH http://localhost:8080/api/tickets/ID_TICKET_AJENO/cancel

# 10) Ver los tickets de un evento como user común → 403
curl -b user.txt http://localhost:8080/api/events/ID_EVENTO/tickets

# 11) Verlos como organizer de OTRO evento → 403 / como organizer del evento o admin → 200
curl -b organizer2.txt http://localhost:8080/api/events/ID_EVENTO/tickets
curl -b organizer.txt  http://localhost:8080/api/events/ID_EVENTO/tickets
```

Verificación del email de confirmación: sin `MAIL_HOST` en el `.env`, el servidor loguea en consola una URL de **Ethereal** (`[mail] confirmación enviada → https://ethereal.mail/...`) donde se puede ver el mensaje enviado.

---

## Modelos de datos

### `User` — `src/models/User.js`

| Campo | Tipo | Restricciones |
|---|---|---|
| `first_name` | String | requerido, `trim` |
| `last_name` | String | requerido, `trim` |
| `email` | String | requerido, único, `lowercase`, `trim`, `minlength: 6` |
| `password` | String | requerido (siempre hasheada con bcrypt) |
| `role` | String | enum `user` \| `organizer` \| `admin`, por defecto `user` |

Habilita `timestamps` (`createdAt` / `updatedAt`).

### `Event` — `src/models/Event.js`

| Campo | Tipo | Restricciones |
|---|---|---|
| `title` | String | requerido, `trim` |
| `description` | String | requerido |
| `category` | String | requerido, `trim` (valor libre: `workshop`, `deportes`, ...) |
| `date` | Date | requerido |
| `location` | String | requerido |
| `capacity` | Number | requerido, entero `min: 1` |
| `price` | Number | `min: 0`, por defecto `0` |
| `status` | String | enum `draft` \| `published` \| `cancelled` \| `finished`, por defecto `draft` |
| `organizer` | ObjectId | requerido, **referencia a `User`** (`ref: "User"`) — el usuario que creó el evento |

Habilita `timestamps` (`createdAt` / `updatedAt`) e índices sobre `date` y `{ status, date }` para el listado ordenado.

> Además del enum del schema, las **transiciones** de `status` se validan en `src/services/events.services.js` (ver [Reglas de negocio de eventos](#reglas-de-negocio-de-eventos)).

### `Ticket` — `src/models/Ticket.js`

| Campo | Tipo | Restricciones |
|---|---|---|
| `user` | ObjectId | requerido, **referencia a `User`** (`ref: "User"`) |
| `event` | ObjectId | requerido, **referencia a `Event`** (`ref: "Event"`) |
| `status` | String | enum `confirmed` \| `pending` \| `cancelled`, por defecto `confirmed` |
| `quantity` | Number | requerido, entero `min: 1` |
| `reservationCode` | String | requerido, **único** — se genera en el service con `crypto.randomBytes` |
| `cancelledAt` | Date | por defecto `null` |

Habilita `timestamps` (`createdAt` / `updatedAt`) y dos índices:

- **Único parcial** `{ user, event }` con `status ≠ cancelled` → la BD garantiza un único ticket activo por usuario por evento.
- `{ event, status }` → optimiza el cálculo de cupos.

> El ticket **solo guarda referencias** (ObjectId): nunca se embebe el objeto del usuario ni el del evento. Los datos se resuelven con `populate` cuando hace falta.

---

## Tests

Suite de integración real con **Vitest + supertest**: levanta la app Express (sin abrir puerto) y la prueba por HTTP de punta a punta contra una **base de datos separada** (`backend-ii-test`), que se vacía entre tests y se elimina al terminar: **nunca toca la de desarrollo**.

```bash
npm test           # corre la suite completa
npm run test:watch # en modo watch (desarrollo)
```

| Archivo | Casos que cubre |
|---|---|
| `tests/events.test.js` (18) | Fecha pasada → `400`; `capacity` inválida → `400`; `price` negativo → `400`; campos faltantes → `400`; el evento nace siempre en `draft`; transiciones `draft → published → finished`, `finished → published` → `409`, `cancelled` terminal → `409`, no-op → `400`; ownership (`user` no crea → `403`, `organizer` no modifica ajeno → `403`, `admin` sí → `200`); filtro `organizer` combinado con `status`; `organizer` malformado → `400`; forma de la respuesta del listado; flujo real `register → login → current` con Passport. |
| `tests/tickets.test.js` (21) | Los **10 casos de la consigna de inscripciones**: inscripción exitosa `201` + email enviado; sin sesión `401`; evento inexistente `404`; evento cancelado/finalizado `409` y en `draft` `400`; sin cupos `409` con mensaje; duplicado activo `409`; cancelación propia que **libera el cupo**; cancelar ticket ajeno `403`; `GET /events/:id/tickets` como `user` `403` y como organizer de otro evento `403`. Además: `quantity` inválida `400`; el ticket cancelado **no se elimina**; ya cancelado `409`; inexistente `404`; `admin` cancela/consulta `200`; `my-tickets` solo devuelve los propios con `populate` del evento. |
| `tests/flow.test.js` (6) | **Flujo completo de la M8**: registro → login → crear evento → publicar → inscribirse → mis tickets → cancelar → cupo liberado. **Seguridad de DTOs**: `/current` sin password ni `__v`, registro sin password, `GET /api/users` sin password de nadie, ticket con populate sin password ni `role` del usuario, evento populado filtrado, y un error de negocio responde su código real (nunca `500`). |

Detalles del entorno de test (`tests/setup.js`):

- Fuerza `NODE_ENV=test` **antes** de importar cualquier módulo de `src/` → el mailer usa un transporte en memoria (`streamTransport`) y acumula cada email en el array `sentMails`, que los tests verifican (destinatario, asunto y código de reserva) sin depender de red.
- Usa `MONGO_URL` de test propio y `JWT_SECRET` por defecto si no hay `.env`.
- `fileParallelism: false` en `vitest.config.js`: los tests comparten una BD, así que corren en serie.

---

## Arquitectura por capas

```
Request → Routes → Controllers → Services → Repositories → DAO → Models (Mongoose) → MongoDB
                          ↓
                        DTO      (formatea cada respuesta ANTES de salir)
```

| Capa | Archivos | Responsabilidad | Estado |
|---|---|---|---|
| **Routes** | `src/routes` | Asocian cada endpoint con su estrategia de Passport / middlewares de protección y su controller. Sin lógica. | ✅ |
| **Middlewares** | `src/middlewares` | `authMiddleware` → sesión válida o `401`; `authorizeMiddleware(roles)` → rol permitido o `403`. Los de ownership (`authorizeEventOwnerOrAdmin`, `authorizeTicketOwnerOrAdmin`) **invocan la regla que vive en el service** y dejan el recurso en `req.event` / `req.ticket`. | ✅ |
| **Controllers** | `src/controllers` | **Solo coordinan request/response**: extraen datos de body/params/query, llaman al service y responden **pasando por el DTO**. No calculan cupos, no validan estados, no importan modelos. | ✅ |
| **Services** | `src/services` | **Toda la lógica de negocio**: validación de cupos, estados, duplicados, permisos sobre recursos propios y envío de email. Consumen repositories, **nunca DAOs ni modelos**. | ✅ |
| **Repositories** | `src/repositories` | Intermediarios de **dominio** (`findByEmail`, `findActiveTicket`, `sumActiveQuantities`, `cancelTicket`...). Clases que usan su DAO; **no importan modelos**. | ✅ |
| **DAO** | `src/dao` | Acceso **genérico** a datos (`create`, `findById`, `findOne`, `find`, `update`, `count`, `sum`). Clases `UserDAO`, `EventDAO`, `TicketDAO`: **únicos archivos que importan modelos de Mongoose**. | ✅ |
| **DTO** | `src/dto` | Definen qué campos expone cada respuesta. `sessionUserDTO` / `userDTO` (usuarios), `eventDTO` (eventos), `ticketDTO` (inscripciones, incluye los documentos populados). **Nunca exponen password** (ni hasheada) ni campos internos como `__v`. | ✅ |
| **Models** | `src/models` | Schemas y modelos de Mongoose (solo los consume el DAO). | ✅ |
| **Config** | `src/config/passport.config.js` | Estrategias `register`, `login` y `current` + traductor de errores de Passport. Usa el repository de usuarios. | ✅ |
| **Utils** | `src/utils` | Helpers reutilizables: JWT, bcrypt, `isValidObjectId` (sin Mongoose), `createError()` (errores con `status`) y Nodemailer. | ✅ |

### Reglas de dependencia (de arriba hacia abajo)

1. **Solo los DAO importan modelos de Mongoose** (`UserModel`, `eventModel`, `ticketModel`).
2. **Los repositories importan solo su DAO** y exponen operaciones del dominio, no queries crudas.
3. **Los services consumen solo repositories** (más `utils`): ninguna línea de Mongoose vive acá.
4. **Los controllers no importan modelos ni resuelven reglas de negocio**: pasan la request al service y formatean la response con el DTO.
5. **Toda respuesta pasa por un DTO** en las rutas sensibles (usuarios, eventos, tickets): si mañana el schema agrega un campo sensible, la API no lo expone por accidente.
6. **Un único error handler centralizado** en `src/app.js` da formato consistente a los errores: `400` datos inválidos · `401` no autenticado · `403` sin permisos · `404` no encontrado · `409` conflicto · `500` error interno (que nunca expone el mensaje interno).

Flujo del registro:

```
POST /api/sessions/register
  → routes/sessions.router.js            ( delega en passport.authenticate('register') )
  → config/passport.config.js            ( valida → normaliza email → chequea unicidad
                                           → hashPassword() → repositories → rol 'user'
                                           → done(null, userSinPassword) )
  → controllers/sessions.controller.js   ( res.status(201).json({ payload: req.user }) )
```

Flujo del login y de la ruta protegida:

```
POST /api/sessions/login
  → routes/sessions.router.js            ( delega en passport.authenticate('login') )
  → config/passport.config.js            ( busca por email → isValidPassword() → done(null, user) )
  → controllers/sessions.controller.js   ( generateToken({id,email,role}) + res.cookie("currentUser") )

GET /api/sessions/current                🔒
  → middlewares/auth.middleware.js       ( passport 'current' → lee cookie → verify JWT → req.user )
  → controllers/sessions.controller.js   ( responde con el payload )
```

Flujo de una ruta con autorización:

```
POST /api/events                         🔒 (organizer | admin)
  → middlewares/auth.middleware.js       ( ¿sesión válida? → si no: 401 "No autenticado" )
  → middlewares/authorize.middleware.js  ( ¿rol permitido? → si no: 403 "No tenés permisos..." )
  → controllers/events.controller.js    ( organizer = req.user.id → services → 201 con eventDTO )

PUT /api/events/:eventId               🔒 (organizer propio | admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( 403 si el rol es 'user' )
  → middlewares/authorize.middleware.js  ( authorizeEventOwnerOrAdmin → 404 si no existe,
                                           403 si el evento es ajeno y no sos admin )
  → controllers/events.controller.js    ( exige TODOS los campos → services
                                           ( valida fecha/capacity/precio → 400 | update → 200 ) )

PATCH /api/events/:eventId/status       🔒 (organizer propio | admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( 403 si el rol es 'user' )
  → middlewares/authorize.middleware.js  ( authorizeEventOwnerOrAdmin → 404 / 403 )
  → controllers/events.controller.js    ( lee req.body.status → services
                                           ( valida transición → 400/409 | update → 200 ) )

GET /api/users                           🔒 (solo admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( authorizeMiddleware('admin') → 403 si no es admin )
  → controllers/users.controller.js     ( services → repositories → dao → 200 con userDTO
                                           ( el DTO es lo que garantiza que no salga password ) )
```

Flujo de una inscripción (tickets):

```
POST /api/events/:eventId/tickets       🔒 (cualquier rol)
  → routes/events.router.js             ( router.use('/:eventId/tickets', eventTicketsRouter) )
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → controllers/tickets.controllers.js  ( quantity (default 1) + req.user → services )
  → services/tickets.services.js        ( evento existe → 404 | quantity → 400
                                           | estado del evento → 400/409
                                           | cupos: capacity − Σ activos → 409
                                           | duplicado activo → 409
                                           → repositories → dao.create (confirmed + reservationCode)
                                           → utils/mailer.js ( email de confirmación, mejor esfuerzo )
                                           → 201 )

GET /api/tickets/my-tickets             🔒 (propios)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → controllers/tickets.controllers.js  ( req.user.id → services )
  → services/tickets.services.js        ( findUserTickets → dao
                                           ( .find({ user }) .sort({ createdAt: -1 })
                                             .populate('event', 'title date location') ) )

GET /api/events/:eventId/tickets        🔒 (organizer del evento | admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( authorizeEventOwnerOrAdmin → invoca el service
                                           loadManagedEvent → 404 / 403 )
  → controllers/tickets.controllers.js  ( → services → repository.findEventTickets
                                           ( .find({ event }) .populate('user', ...) )
                                           → 200 con ticketsToDTO )

PATCH /api/tickets/:ticketId/cancel     🔒 (dueño del ticket | admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( authorizeTicketOwnerOrAdmin → invoca el service
                                           loadOwnedTicket → 404 si no existe,
                                           403 si el ticket es ajeno y no sos admin
                                           → deja req.ticket )
  → controllers/tickets.controllers.js  ( → services
                                           ( ¿ya cancelado? → 409
                                             | repository.cancelTicket(id) → 200
                                             | el cupo queda libre: cancelled no suma ) )
```

`src/app.js` solo configura Express (middlewares, `passport.initialize()`, rutas y error handler) y exporta la instancia; `src/server.js` es quien levanta el servidor — separación necesaria para testear la app sin abrir un puerto (así lo hace la suite de `tests/`).
