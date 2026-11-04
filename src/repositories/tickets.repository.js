

import { create, getById, findActiveByUserAndEvent, sumActiveQuantityByEvent, findByUser, findByEvent, update } from "../dao/tickets.dao.js";

export const saveTicket = async (ticketData) => {
    return await create(ticketData);
};

export const findTicketById = async (ticketId) => {
    return await getById(ticketId);
};

export const findActiveTicket = async (userId, eventId) => {
    return await findActiveByUserAndEvent(userId, eventId);
};

export const occupiedQuantity = async (eventId) => {
    return await sumActiveQuantityByEvent(eventId);
};

export const findUserTickets = async (userId) => {
    return await findByUser(userId);
};

export const findEventTickets = async (eventId) => {
    return await findByEvent(eventId);
};

export const updateTicket = async (ticketId, ticketData) => {
    return await update(ticketId, ticketData);
};
