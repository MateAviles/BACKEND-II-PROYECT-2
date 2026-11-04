

import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import eventsRouter from './routes/events.router.js';
import sessionsRouter from './routes/sessions.router.js';
import usersRouter from './routes/users.router.js';
import { ticketsRouter } from './routes/tickets.router.js';

import { translatePassportError } from './config/passport.config.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/events", eventsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Servidor activo"
    });
});


app.use((err, req, res, next) => {
    if(err.type === 'entity.parse.failed'){
        return res.status(400).json({
            status: "error",
            message: "JSON inválido en el cuerpo de la petición"
        });
    }
    
    const passportMessage = translatePassportError(err, req.path);

    if(passportMessage){
        return res.status(err.status).json({
            status: "error",
            message: passportMessage
        });
    }

    const status = err.status || 500;

    res.status(status).json({
        status: "error",
        message: status >= 500
            ? "Error interno del servidor"
            : err.message
    });
});

export default app;