

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeEventOwnerOrAdmin, authorizeTicketOwnerOrAdmin } from "../middlewares/authorize.middleware.js";
import { createTicketController, getMyTicketsController, getEventTicketsController, cancelTicketController } from "../controllers/tickets.controllers.js";

export const eventTicketsRouter = Router({ mergeParams: true });

eventTicketsRouter.post('/', authMiddleware, createTicketController);
eventTicketsRouter.get('/', authMiddleware, authorizeEventOwnerOrAdmin, getEventTicketsController);

export const ticketsRouter = Router();

ticketsRouter.get('/my-tickets', authMiddleware, getMyTicketsController);
ticketsRouter.patch('/:ticketId/cancel', authMiddleware, authorizeTicketOwnerOrAdmin, cancelTicketController);
