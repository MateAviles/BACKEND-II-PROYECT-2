# Backend II — Plataforma de Eventos

API REST para la administración de eventos, construida con **Node.js + Express**, **MongoDB** y **Mongoose**, organizada por capas: `routes → controllers → services → repositories → dao → models`.

> **Estado:** Pre-entrega 3 — autenticación con JWT y cookies: registro, login, ruta protegida `/current` y logout.

---

## Índice

1. [Temática](#temática)
2. [Tecnologías](#tecnologías)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación](#instalación)
5. [Variables de entorno](#variables-de-entorno)
6. [Ejecución](#ejecución)
7. [Estructura del proyecto](#estructura-del-proyecto)
8. [Rutas disponibles](#rutas-disponibles)
9. [Cómo probar la autenticación](#cómo-probar-la-autenticación)
10. [Cómo probar el registro](#cómo-probar-el-registro)
11. [Modelos de datos](#modelos-de-datos)
12. [Arquitectura por capas](#arquitectura-por-capas)

---

## Temática

**Plataforma de eventos**: una API que permite consultar y administrar eventos (título, descripción, fecha, ubicación y capacidad) y gestionar a los usuarios que acceden a la aplicación.

La autenticación es **segura**: el registro valida los datos, normaliza el email y hashea la contraseña con bcrypt; el login compara con bcrypt, firma un **JWT** con `JWT_SECRET` y lo entrega en una cookie **HttpOnly** (`currentUser`) que nunca es accesible desde JavaScript, protegiendo así la ruta `/current` y el logout.

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 18 | Runtime de JavaScript |
| [Express](https://expressjs.com/) | ^5.2.1 | Framework web / ruteo de la API |
| [Mongoose](https://mongoosejs.com/) | ^9.10.1 | ODM para MongoDB |
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
    ├── app.js            # Configura Express (express.json(), cookieParser, rutas, error handler)
    ├── server.js         # Punto de entrada: dotenv, conexión a BD y app.listen
    ├── config/
    │   └── db.js                     # Conexión a MongoDB con Mongoose
    ├── routes/
    │   ├── events.router.js          # GET  /api/events
    │   └── sessions.router.js        # register, login, current (protegida), logout
    ├── controllers/
    │   ├── events.controller.js      # getEvents
    │   └── sessions.controller.js    # register, login, current, logout
    ├── services/
    │   ├── events.services.js        # fetchEvents
    │   └── sessions.service.js       # registerUser, loginUser
    ├── repositories/
    │   ├── events.repository.js      # getAllEvents
    │   └── users.repository.js       # findUserByEmail, saveUser
    ├── dao/
    │   ├── events.dao.js             # consultas Mongoose de eventos
    │   └── users.dao.js              # consultas Mongoose de usuarios
    ├── models/
    │   ├── User.js                   # Schema de usuarios
    │   └── Event.js                  # Schema de eventos
    ├── middlewares/
    │   └── auth.middleware.js         # authMiddleware: lee cookie, verifica JWT → req.user
    └── utils/
        ├── jwt.js                    # generateToken / verifyToken (jsonwebtoken)
        └── hash.js                   # hashPassword / isValidPassword (bcrypt)
```

> La lógica de JWT vive en `utils/jwt.js`, la de bcrypt en `utils/hash.js` y la verificación de la sesión en `middlewares/auth.middleware.js`: **ninguna de las dos se define en las rutas ni en `app.js`**.

---

## Rutas disponibles

Base URL: `http://localhost:8080`

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | Health check del servidor. | `200` |
| `GET` | `/api/events` | Listado de eventos. | `200` |
| `POST` | `/api/sessions/register` | Registro de usuario nuevo. | `201` |
| `POST` | `/api/sessions/login` | Login: genera JWT y setea la cookie `currentUser`. | `200` / `401` |
| `GET` | `/api/sessions/current` | **Protegida**: devuelve el usuario de la cookie. | `200` / `401` |
| `POST` | `/api/sessions/logout` | Elimina la cookie `currentUser`. | `200` |

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
| **Routes** | `src/routes` | Asocian cada endpoint con su controller. | ✅ |
| **Controllers** | `src/controllers` | Reciben la request, ejecutan el service y devuelven la respuesta (status + JSON). Manejo de errores centralizado. | ✅ |
| **Services** | `src/services` | Lógica de negocio: validaciones, normalización, hash y orquestación. | ✅ |
| **Repositories** | `src/repositories` | Abstracción de las consultas (no dependen de Mongoose directamente). | ✅ |
| **DAO** | `src/dao` | Acceso concreto a la base de datos con Mongoose. | ✅ |
| **Models** | `src/models` | Schemas y modelos de Mongoose. | ✅ |
| **Utils** | `src/utils/jwt.js`, `src/utils/hash.js` | Helpers reutilizables: `generateToken()` / `verifyToken()` (JWT) y `hashPassword()` / `isValidPassword()` (bcrypt). | ✅ |
| **Middlewares** | `src/middlewares/auth.middleware.js` | `authMiddleware`: lee la cookie, verifica el JWT y carga `req.user` o responde `401`. | ✅ |

Ejemplo del flujo de registro:

```
POST /api/sessions/register
  → routes/sessions.router.js     (asocia /register con register)
  → controllers/sessions.controller.js  ( llama registerUser(req.body) y arma la respuesta )
  → services/sessions.service.js  ( valida → normaliza email → hashea → persiste → quita password )
  → repositories/users.repository.js
  → dao/users.dao.js              ( UserModel.findOne / UserModel.create )
  → models/User.js                ( MongoDB )
```

Flujo de login y acceso a la ruta protegida:

```
POST /api/sessions/login
  → controllers/sessions.controller.js  ( llama loginUser() y hace res.cookie("currentUser", token) )
  → services/sessions.service.js        ( busca usuario → isValidPassword() → generateToken() )
  → utils/jwt.js                        ( jwt.sign con JWT_SECRET y JWT_EXPIRES_IN )

GET /api/sessions/current                🔒
  → middlewares/auth.middleware.js       ( lee req.cookies.currentUser → verifyToken() → req.user )
  → controllers/sessions.controller.js   ( responde con el payload { id, email, role } )
```

`src/app.js` solo configura Express (middlewares, rutas y error handler) y exporta la instancia; `src/server.js` es quien levanta el servidor — separación necesaria para testear la app sin abrir un puerto.
