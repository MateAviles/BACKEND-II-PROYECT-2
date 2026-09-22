# Backend II — Plataforma de Eventos

API REST para la administración de eventos, construida con **Node.js + Express** y **MongoDB**, organizada por capas (routes → controllers → services → repositories → dao → models).

> **Estado:** Pre-entrega 1 — refactor arquitectónico inicial. El servidor, el ruteo y los modelos base están funcionales; la lógica de persistencia de eventos y la autenticación (JWT) se implementarán en próximas entregas.

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
9. [Modelos de datos](#modelos-de-datos)
10. [Arquitectura por capas](#arquitectura-por-capas)

---

## Temática

**Plataforma de eventos**: una API que permite consultar el listado de eventos (título, descripción, fecha y ubicación) y administrar los usuarios que se registran para acceder a la aplicación.

En esta primera etapa se entrega la **base arquitectónica**: servidor Express funcionando, estructura de carpetas por capas, rutas y controladores propios para los recursos `events` y `sessions`, y los modelos base de `User` y `Event`.

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 18 | Runtime de JavaScript |
| [Express](https://expressjs.com/) | ^5.2.1 | Framework web / ruteo de la API |
| [Mongoose](https://mongoosejs.com/) | ^9.10.1 | ODM para MongoDB |
| [dotenv](https://github.com/motdotla/dotenv) | ^18.0.1 | Variables de entorno |
| [MongoDB](https://www.mongodb.com/) | — | Base de datos |
| JSON Web Token | — | Autenticación (previsto, `JWT_SECRET`) |

> El proyecto usa **ECMA Modules** (`"type": "module"` en `package.json`): todos los archivos se comunican con `import` / `export`.

---

## Requisitos previos

- **Node.js** ≥ 18 y **npm**
- **MongoDB** corriendo localmente (`mongodb://localhost:27017/`) o una instancia en la nube (MongoDB Atlas)

---

## Instalación

```bash
# 1. Clonar el repositorio (debe ser público en GitHub)
git clone <url-del-repositorio>
cd proyecto-eventos

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno a partir de la plantilla
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

Completá `.env` con tus valores (ver siguiente sección).

---

## Variables de entorno

Se cargan automáticamente con `dotenv` al levantar el servidor. La plantilla `.env.example` incluye las cuatro variables requeridas:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor. Si no está definida, se usa `8080`. | `8080` |
| `NODE_ENV` | Entorno de ejecución: `development`, `production`, etc. | `development` |
| `MONGO_URL` | URI de conexión a MongoDB. | `mongodb://localhost:27017/` |
| `JWT_SECRET` | Secreto para firmar los tokens JWT (futuro login). | `una-frase-secreta-super-larga` |

> `.env` y `node_modules/` están en `.gitignore`: **nunca se suben al repositorio**. Antes de publicar, verificá que `.env` no esté trackeado (`git ls-files .env` no debe devolver nada).

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
proyecto-eventos/
├── .env                  # Variables de entorno (NO se versiona)
├── .env.example          # Plantilla: PORT, NODE_ENV, MONGO_URL, JWT_SECRET
├── .gitignore            # Excluye .env y node_modules/
├── package.json          # type: module (ESM) + script start
├── package-lock.json
├── README.md
└── src/
    ├── app.js            # Configura Express: express.json() + rutas (NO levanta el server)
    ├── server.js         # Punto de entrada: dotenv, conexión a BD y app.listen
    ├── config/
    │   └── db.js         # Conexión a MongoDB con Mongoose
    ├── routes/
    │   ├── events.router.js      # GET  /api/events
    │   └── sessions.router.js    # POST /api/sessions
    ├── controllers/
    │   ├── events.controller.js  # getEvents
    │   └── sessions.controller.js# register
    ├── services/                  # Lógica de negocio (próximas entregas)
    ├── repositories/              # Abstracción de consultas (próximas entregas)
    ├── dao/                       # Acceso a datos (próximas entregas)
    ├── models/
    │   ├── User.js        # Schema de usuarios (roles user/admin)
    │   └── Event.js       # Schema de eventos
    ├── middlewares/               # Auth, validaciones, manejo de errores
    └── utils/                     # Helpers y utilidades compartidas
```

Las carpetas `services/`, `repositories/`, `dao/`, `middlewares/` y `utils/` existen vacías a propósito: son la base sobre la que crecerá la arquitectura.

---

## Rutas disponibles

Base URL: `http://localhost:8080`

| Método | Ruta | Descripción | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | Health check del servidor. | `200` |
| `GET` | `/api/events` | Listado de eventos (sin lógica todavía). | `200` |
| `POST` | `/api/sessions` | Estructura inicial de sessions. | `201` |

### Ejemplos de respuesta

**`GET /api/health`**
```json
{ "status": "ok", "message": "Servidor activo" }
```

**`GET /api/events`**
```json
{ "status": "success", "payload": [] }
```

**`POST /api/sessions`**
```json
{ "status": "success", "payload": "sessions funciona correctamente" }
```

### Prueba con curl

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/events

curl -X POST http://localhost:8080/api/sessions \
     -H "Content-Type: application/json" \
     -d '{}'
```

> Todas las respuestas son JSON. El body de las peticiones se parsea con `express.json()`.

---

## Modelos de datos

### `User` — `src/models/User.js`

| Campo | Tipo | Restricciones |
|---|---|---|
| `first_name` | String | requerido, `trim` |
| `last_name` | String | requerido, `trim` |
| `email` | String | requerido, único, `lowercase`, `trim`, `minlength: 6` |
| `password` | String | requerido (se hasheará antes de persistir) |
| `role` | String | enum `user` \| `admin`, por defecto `user` |

Habilita `timestamps` (`createdAt` / `updatedAt`).

### `Event` — `src/models/Event.js`

| Campo | Tipo | Restricciones |
|---|---|---|
| `title` | String | requerido |
| `description` | String | requerido, por defecto `""` |
| `date` | Date | requerido |
| `location` | String | requerido |

---

## Arquitectura por capas

```
Request → Routes → Controllers → Services → Repositories → DAO → Models (Mongoose) → MongoDB
```

| Capa | Responsabilidad | Estado |
|---|---|---|
| **Routes** (`src/routes`) | Asocian cada endpoint con su controller. | ✅ Implementada |
| **Controllers** (`src/controllers`) | Reciben la request y devuelven la respuesta (status + JSON). | ✅ Implementada |
| **Services** (`src/services`) | Lógica de negocio. | 🕓 Próxima entrega |
| **Repositories** (`src/repositories`) | Abstracción de las consultas. | 🕓 Próxima entrega |
| **DAO** (`src/dao`) | Acceso concreto a la base de datos. | 🕓 Próxima entrega |
| **Models** (`src/models`) | Schemas y modelos de Mongoose. | ✅ Implementada |

`src/app.js` solo configura Express (middlewares y ruteo) y exporta la instancia; `src/server.js` es quien levanta el servidor — separación necesaria para testear la app sin abrir un puerto.
