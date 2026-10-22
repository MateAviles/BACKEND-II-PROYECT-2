# Backend II — Plataforma de Eventos

API REST para la administración de eventos, construida con **Node.js + Express**, **MongoDB** y **Mongoose**, organizada por capas: `routes → controllers → services → repositories → dao → models`.

> **Estado:** Pre-entrega 5 — **roles y autorización**: los middlewares `auth` (401) y `authorize` (403) protegen las rutas según el rol (`user`, `organizer`, `admin`), incluyendo la propiedad de los eventos.

---

## Índice

1. [Temática](#temática)
2. [Tecnologías](#tecnologías)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación](#instalación)
5. [Variables de entorno](#variables-de-entorno)
6. [Autenticación con Passport.js](#autenticación-con-passportjs)
7. [Roles y autorización](#roles-y-autorización)
8. [Ejecución](#ejecución)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Rutas disponibles](#rutas-disponibles)
11. [Cómo probar la autenticación](#cómo-probar-la-autenticación)
12. [Cómo probar la autorización](#cómo-probar-la-autorización)
13. [Cómo probar el registro](#cómo-probar-el-registro)
14. [Modelos de datos](#modelos-de-datos)
15. [Arquitectura por capas](#arquitectura-por-capas)

---

## Temática

**Plataforma de eventos**: una API que permite consultar y administrar eventos (título, descripción, fecha, ubicación y capacidad) y gestionar a los usuarios que acceden a la aplicación.

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

Se cargan automáticamente con `dotenv` al levantar el servidor. La plantilla `.env.example` incluye las cinco variables requeridas:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor. Si no está definida, se usa `8080`. | `8080` |
| `NODE_ENV` | Entorno de ejecución. En `production` la cookie se marca `Secure`. | `development` |
| `MONGO_URL` | URI de conexión a MongoDB. | `mongodb://localhost:27017/` |
| `JWT_SECRET` | Secreto con el que se firman los tokens JWT. | `una-frase-secreta-super-larga` |
| `JWT_EXPIRES_IN` | Expiración del token (formato de `jsonwebtoken`). | `1h` |

> `.env` y `node_modules/` están en `.gitignore`: **nunca se suben al repositorio**. Para verificarlo antes de publicar: `git ls-files .env` no debe devolver nada.

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
| Consultar eventos publicados (`GET /api/events`) | ✅ | ✅ | ✅ |
| Crear eventos (`POST /api/events`) | ❌ | ✅ | ✅ |
| Modificar eventos propios (`PATCH /api/events/:eventId`) | ❌ | ✅ | ✅ |
| Modificar cualquier evento (`PATCH /api/events/:eventId`) | ❌ | ❌ | ✅ |
| Ver todos los usuarios (`GET /api/users`) | ❌ | ❌ | ✅ |

### Middlewares (reutilizables y separados de las rutas)

| Middleware | Archivo | Recibe | Respuesta en fallo |
|---|---|---|---|
| `authMiddleware` | `src/middlewares/auth.middleware.js` | — (lee el JWT de la cookie `currentUser` con Passport) | **`401`** `"No autenticado"` cuando no hay sesión válida |
| `authorizeMiddleware(...roles)` | `src/middlewares/authorize.middleware.js` | Lista de roles permitidos | **`403`** `"No tenés permisos para realizar esta acción"` cuando el rol no coincide |
| `authorizeEventOwnerOrAdmin` | `src/middlewares/authorize.middleware.js` | — (lee `req.params.eventId`) | `404` si el evento no existe, **`403`** `"No tenés permisos para modificar este evento"` si es de otro organizador y no sos `admin` |

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
| `PATCH /api/events/:eventId` | ✅ | `organizer` (solo eventos propios), `admin` (cualquiera) |
| `GET /api/users` | ✅ | `admin` |

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
├── .env.example          # Plantilla: PORT, NODE_ENV, MONGO_URL, JWT_SECRET, JWT_EXPIRES_IN
├── .gitignore            # Excluye .env y node_modules/
├── package.json          # type: module (ESM) + script start
├── package-lock.json
├── README.md
└── src/
    ├── app.js            # Configura Express (express.json(), cookieParser, passport.initialize(), rutas, error handler)
    ├── server.js         # Punto de entrada: dotenv, conexión a BD y app.listen
    ├── config/
    │   ├── db.js                     # Conexión a MongoDB con Mongoose
    │   └── passport.config.js        # Estrategias register / login / current + traductor de errores
    ├── routes/
    │   ├── events.router.js          # GET /api/events (público), POST y PATCH (protegidas)
    │   ├── sessions.router.js        # register, login, current (protegida), logout — delegan en passport.authenticate
    │   └── users.router.js           # GET /api/users — solo admin
    ├── controllers/
    │   ├── events.controller.js      # getEvents, createEventController, updateEventController
    │   ├── sessions.controller.js    # register, login (firma JWT y setea cookie), current, logout
    │   └── users.controller.js       # getUsers
    ├── services/
    │   ├── events.services.js        # fetchEvents, createEvent, fetchEventById, updateEventService
    │   └── users.services.js         # fetchUsers
    ├── repositories/
    │   ├── events.repository.js      # getAllEvents, saveEvent, findEventById, updateEvent
    │   └── users.repository.js       # findUserByEmail, saveUser, findAllUsers
    ├── dao/
    │   ├── events.dao.js             # consultas Mongoose de eventos
    │   └── users.dao.js              # consultas Mongoose de usuarios
    ├── models/
    │   ├── User.js                   # Schema de usuarios (role: user | organizer | admin)
    │   └── Event.js                  # Schema de eventos (organizer referenciado a User)
    ├── middlewares/
    │   ├── auth.middleware.js         # authMiddleware: JWT de la cookie → req.user o 401
    │   └── authorize.middleware.js    # authorizeMiddleware(roles) → 403 | authorizeEventOwnerOrAdmin → propiedad
    └── utils/
        ├── jwt.js                    # generateToken / verifyToken (jsonwebtoken)
        └── hash.js                   # hashPassword / isValidPassword (bcrypt)
```

> La lógica de autenticación vive en `config/passport.config.js`, la de autorización en `middlewares/`, la de JWT en `utils/jwt.js` y la de bcrypt en `utils/hash.js`: **ninguna se define en las rutas ni en `app.js`**.

---

## Rutas disponibles

Base URL: `http://localhost:8080`

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | Health check del servidor. | `200` |
| `GET` | `/api/events` | Listado de eventos publicados (público). | `200` |
| `POST` | `/api/events` | **Protegida**: crea un evento (`organizer` / `admin`). | `201` / `401` / `403` |
| `PATCH` | `/api/events/:eventId` | **Protegida**: modifica un evento propio o, siendo `admin`, cualquiera. | `200` / `401` / `403` / `404` |
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

Request: sin body.

```json
{ "status": "success", "payload": [] }
```

### `POST /api/events` 🔒 (`organizer` | `admin`)

Request:

```json
{
  "title": "Congreso Tech 2026",
  "description": "Evento nuevo",
  "date": "2026-12-01",
  "location": "Virtual",
  "capacity": 500,
  "published": true
}
```

> El `organizer` **siempre** se toma del usuario autenticado (`req.user.id`), nunca del body.

Respuesta `201`:

```json
{
  "status": "success",
  "payload": {
    "title": "Congreso Tech 2026",
    "date": "2026-12-01T00:00:00.000Z",
    "location": "Virtual",
    "capacity": 500,
    "organizer": "665f2a...",
    "published": true,
    "_id": "6690..."
  }
}
```

Errores:

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Rol `user` autenticado | `403` | `{ "status": "error", "message": "No tenés permisos para realizar esta acción" }` |

### `PATCH /api/events/:eventId` 🔒 (`organizer` propio | `admin`)

Request (se aceptan solo campos editables):

```json
{ "capacity": 200 }
```

Respuesta `200` con el evento actualizado.

Errores:

| Caso | Status | Respuesta |
|---|---|---|
| Sin cookie / token inválido | `401` | `{ "status": "error", "message": "No autenticado" }` |
| Rol `user` | `403` | `{ "status": "error", "message": "No tenés permisos para realizar esta acción" }` |
| `organizer` sobre evento **ajeno** | `403` | `{ "status": "error", "message": "No tenés permisos para modificar este evento" }` |
| Evento inexistente o id malformado | `404` | `{ "status": "error", "message": "Evento no encontrado" }` |
| Body sin campos editables | `400` | `{ "status": "error", "message": "Nada que actualizar" }` |

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
     -d '{ "title": "Congreso Tech 2026", "date": "2026-12-01", "location": "Virtual", "capacity": 500 }'

# 2) POST /api/events con rol user → 403 "No tenés permisos para realizar esta acción"
curl -b user.txt -X POST http://localhost:8080/api/events \
     -H "Content-Type: application/json" \
     -d '{ "title": "Congreso Tech 2026", "date": "2026-12-01", "location": "Virtual", "capacity": 500 }'

# 3) POST /api/events con rol organizer → 201 (el evento queda como propio)
curl -b organizer.txt -X POST http://localhost:8080/api/events \
     -H "Content-Type: application/json" \
     -d '{ "title": "Congreso Tech 2026", "date": "2026-12-01", "location": "Virtual", "capacity": 500 }'

# 4) Ruta administrativa GET /api/users con rol organizer → 403
curl -b organizer.txt http://localhost:8080/api/users

# 5) Ruta administrativa GET /api/users con rol admin → 200 (sin passwords)
curl -b admin.txt http://localhost:8080/api/users

# 6) PATCH evento AJENO con organizer → 403 "No tenés permisos para modificar este evento"
curl -b organizer.txt -X PATCH http://localhost:8080/api/events/ID_DE_OTRO \
     -H "Content-Type: application/json" -d '{ "capacity": 200 }'

# 7) PATCH evento propio con organizer → 200 | con admin → 200 aunque sea ajeno
curl -b organizer.txt -X PATCH http://localhost:8080/api/events/ID_PROPIO \
     -H "Content-Type: application/json" -d '{ "capacity": 200 }'
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
| `title` | String | requerido |
| `description` | String | por defecto `""` |
| `date` | Date | requerido |
| `location` | String | requerido |
| `capacity` | Number | requerido, `min: 1` |

---

## Arquitectura por capas

```
Request → Routes → Controllers → Services → Repositories → DAO → Models (Mongoose) → MongoDB
```

| Capa | Archivos | Responsabilidad | Estado |
|---|---|---|---|
| **Routes** | `src/routes` | Asocian cada endpoint con su estrategia de Passport / middlewares de protección y su controller. | ✅ |
| **Middlewares** | `src/middlewares/auth.middleware.js`, `authorize.middleware.js` | `authMiddleware` → sesión válida o `401`; `authorizeMiddleware(roles)` → rol permitido o `403`; `authorizeEventOwnerOrAdmin` → propiedad del evento. | ✅ |
| **Controllers** | `src/controllers` | En login firma el JWT y setea la cookie; en los demás responden con `req.user` / `req.body`. | ✅ |
| **Config** | `src/config/passport.config.js` | Estrategias `register`, `login` y `current` + traductor de errores de Passport. | ✅ |
| **Repositories** | `src/repositories` | Abstracción de las consultas (no dependen de Mongoose directamente). | ✅ |
| **DAO** | `src/dao` | Acceso concreto a la base de datos con Mongoose. | ✅ |
| **Models** | `src/models` | Schemas y modelos de Mongoose. | ✅ |
| **Utils** | `src/utils/jwt.js`, `src/utils/hash.js` | Helpers reutilizables: `generateToken()` / `verifyToken()` (JWT) y `hashPassword()` / `isValidPassword()` (bcrypt). | ✅ |

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
  → controllers/events.controller.js    ( organizer = req.user.id → services → 201 )

PATCH /api/events/:eventId               🔒 (organizer propio | admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( 403 si el rol es 'user' )
  → middlewares/authorize.middleware.js  ( authorizeEventOwnerOrAdmin → 404 si no existe,
                                           403 si el evento es ajeno y no sos admin )
  → controllers/events.controller.js    ( campos permitidos → services → 200 )

GET /api/users                           🔒 (solo admin)
  → middlewares/auth.middleware.js       ( 401 si no hay sesión )
  → middlewares/authorize.middleware.js  ( authorizeMiddleware('admin') → 403 si no es admin )
  → controllers/users.controller.js     ( services → repositories → dao (-password) → 200 )
```

`src/app.js` solo configura Express (middlewares, `passport.initialize()`, rutas y error handler) y exporta la instancia; `src/server.js` es quien levanta el servidor — separación necesaria para testear la app sin abrir un puerto.
