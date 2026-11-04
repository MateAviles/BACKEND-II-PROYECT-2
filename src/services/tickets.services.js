

import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

import { saveTicket, findTicketById, findActiveTicket, occupiedQuantity, findUserTickets, findEventTickets, updateTicket } from "../repositories/tickets.repository.js";
import { fetchEventById } from "./events.services.js";
import { createError } from "../utils/errors.js";
import { sendTicketConfirmation } from "../utils/mailer.js";

const ACTIVE_STATUSES = ['confirmed', 'pending'];


const generateReservationCode = () => {
    return `TKT-${randomBytes(6).toString('hex').toUpperCase()}`;
};

export const createTicketService = async ({ eventId, quantity, userId, userEmail }) => {

    if(!mongoose.isValidObjectId(eventId)){
        throw createError('Evento no encontrado', 404);
    }

    const event = await fetchEventById(eventId);

    if(!event){
        throw createError('Evento no encontrado', 404);
    }

    if(typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0){
        throw createError('La cantidad debe ser un número entero mayor a 0', 400);
    }

    if(event.status === 'cancelled'){
        throw createError('El evento está cancelado y no admite inscripciones', 409);
    }

    if(event.status === 'finished'){
        throw createError('El evento está finalizado y no admite inscripciones', 409);
    }

    if(event.status !== 'published'){
        throw createError('El evento no está publicado y no admite inscripciones', 400);
    }

    const occupied = await occupiedQuantity(eventId);
    const available = event.capacity - occupied;

    if(quantity > available){
        throw createError(`No hay cupos suficientes: quedan ${Math.max(available, 0)} disponibles`, 409);
    }

    const existingTicket = await findActiveTicket(userId, eventId);

    if(existingTicket){
        throw createError('Ya tenés una inscripción activa para este evento', 409);
    }

    const ticket = await saveTicket({
        user: userId,
        event: eventId,
        quantity,
        status: 'confirmed',
        reservationCode: generateReservationCode()
    });

    await ticket.populate('event', 'title date location');

    try {
        const mail = await sendTicketConfirmation({ ticket, event, userEmail });
        console.log(`[mail] confirmación enviada → ${mail.previewUrl || mail.messageId}`);
    }catch(error){
        console.error(`[mail] no se pudo enviar la confirmación: ${error.message}`);
    }

    return ticket;
};


export const fetchMyTickets = async (userId) => {
    return await findUserTickets(userId);
};


export const fetchEventTickets = async (eventId) => {
    return await findEventTickets(eventId);
};

export const cancelTicketService = async (ticket) => {

    if(ticket.status === 'cancelled'){
        throw createError('El ticket ya está cancelado', 409);
    }

    const cancelledTicket = await updateTicket(ticket._id, {
        status: 'cancelled',
        cancelledAt: new Date()
    });

    await cancelledTicket.populate('event', 'title date location');

    return cancelledTicket;
};


export { findTicketById, ACTIVE_STATUSES };
