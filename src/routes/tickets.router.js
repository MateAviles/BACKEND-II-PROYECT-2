

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMiddleware, authorizeEventOwnerOrAdmin, authorizeTicketOwnerOrAdmin } from "../middlewares/authorize.middleware.js";
import { createTicketController, getMyTicketsController, getEventTicketsController, cancelTicketController } from "../controllers/tickets.controller.js";

export const eventTicketsRouter = Router({ mergeParams: true });

eventTicketsRouter.post('/', authMiddleware, createTicketController);

eventTicketsRouter.get(
    '/',
    authMiddleware,
    authorizeMiddleware('organizer', 'admin'),
    authorizeEventOwnerOrAdmin,
    getEventTicketsController
);

export const ticketsRouter = Router();

ticketsRouter.get('/my-tickets', authMiddleware, getMyTicketsController);
ticketsRouter.patch('/:ticketId/cancel', authMiddleware, authorizeTicketOwnerOrAdmin, cancelTicketController);
