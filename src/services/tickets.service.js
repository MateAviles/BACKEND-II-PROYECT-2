

import { randomBytes } from "node:crypto";

import { ticketRepository } from "../repositories/tickets.repository.js";
import { loadEvent } from "./events.service.js";
import { createError } from "../utils/errors.js";
import { isValidObjectId } from "../utils/ids.js";
import { sendTicketConfirmation } from "../utils/mailer.js";


const generateReservationCode = () => {
    return `TKT-${randomBytes(6).toString('hex').toUpperCase()}`;
};

export const createTicketService = async ({ eventId, quantity, userId, userEmail }) => {

    const event = await loadEvent(eventId);

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

    const occupied = await ticketRepository.sumActiveQuantities(eventId);
    const available = event.capacity - occupied;

    if(quantity > available){
        throw createError(`No hay cupos suficientes: quedan ${Math.max(available, 0)} disponibles`, 409);
    }

    const existingTicket = await ticketRepository.findActiveTicket(userId, eventId);

    if(existingTicket){
        throw createError('Ya tenés una inscripción activa para este evento', 409);
    }

    let ticket;

    try{
        ticket = await ticketRepository.createTicket({
            user: userId,
            event: eventId,
            quantity,
            status: 'confirmed',
            reservationCode: generateReservationCode()
        });
    }catch(error){

        if(error.code === 11000){
            throw createError('Ya tenés una inscripción activa para este evento', 409);
        }

        throw error;
    }

    try {
        await sendTicketConfirmation({ ticket, event, userEmail });
    }catch(error){
        console.error(`[mail] no se pudo enviar la confirmación: ${error.message}`);
    }

    return ticket;
};


export const fetchMyTickets = async (userId) => {
    return await ticketRepository.findUserTickets(userId);
};


export const fetchEventTickets = async (eventId) => {
    return await ticketRepository.findEventTickets(eventId);
};


export const loadOwnedTicket = async (ticketId, user) => {

    if(!isValidObjectId(ticketId)){
        throw createError('Ticket no encontrado', 404);
    }

    const ticket = await ticketRepository.findTicketById(ticketId);

    if(!ticket){
        throw createError('Ticket no encontrado', 404);
    }

    const isAdmin = user.role === 'admin';
    const isOwner = ticket.user.toString() === user.id;

    if(!isAdmin && !isOwner){
        throw createError('No tenés permisos para cancelar este ticket', 403);
    }

    return ticket;
};


export const cancelTicketService = async (ticket) => {

    if(ticket.status === 'cancelled'){
        throw createError('El ticket ya está cancelado', 409);
    }

    const cancelledTicket = await ticketRepository.cancelTicket(ticket._id);

    return cancelledTicket;
};
