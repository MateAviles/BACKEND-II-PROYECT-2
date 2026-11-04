

import { createTicketService, fetchMyTickets, fetchEventTickets, cancelTicketService } from "../services/tickets.services.js";

export const createTicketController = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { quantity = 1 } = req.body;

        const ticket = await createTicketService({
            eventId,
            quantity,
            userId: req.user.id,
            userEmail: req.user.email
        });

        return res.status(201).json({
            status: 'success',
            payload: ticket
        });

    } catch (error) {
        return next(error);
    }
};


export const getMyTicketsController = async (req, res, next) => {
    try {
        const tickets = await fetchMyTickets(req.user.id);

        return res.status(200).json({
            status: 'success',
            payload: tickets
        });

    } catch (error) {
        return next(error);
    }
};


export const getEventTicketsController = async (req, res, next) => {
    try {
        const { eventId } = req.params;

        const tickets = await fetchEventTickets(eventId);

        return res.status(200).json({
            status: 'success',
            payload: tickets
        });

    } catch (error) {
        return next(error);
    }
};


export const cancelTicketController = async (req, res, next) => {
    try {
        const cancelledTicket = await cancelTicketService(req.ticket);

        return res.status(200).json({
            status: 'success',
            payload: cancelledTicket
        });

    } catch (error) {
        return next(error);
    }
};
