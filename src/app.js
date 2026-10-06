

import express from 'express';
import cookieParser from 'cookie-parser';
import eventsRouter from './routes/events.router.js';
import sessionsRouter from './routes/sessions.router.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/events", eventsRouter);
app.use("/api/sessions", sessionsRouter);

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

    res.status(err.status || 500).json({
        status: "error",
        message: err.message || "Error interno del servidor"
    });
});

export default app;