

import { ticketDAO } from "../dao/tickets.dao.js";

const ACTIVE_STATUSES = ["confirmed", "pending"];

export class TicketRepository {

    constructor(dao = ticketDAO) {
        this.dao = dao;
    }

    async createTicket(ticketData) {
        return await this.dao.create(ticketData);
    }

    async findTicketById(ticketId) {
        return await this.dao.findById(ticketId);
    }

    async findActiveTicket(userId, eventId) {
        return await this.dao.findOne({
            user: userId,
            event: eventId,
            status: { $in: ACTIVE_STATUSES }
        });
    }

    async countActiveTickets(eventId) {
        return await this.dao.count({
            event: eventId,
            status: { $in: ACTIVE_STATUSES }
        });
    }

    async sumActiveQuantities(eventId) {
        return await this.dao.sum(
            { event: eventId, status: { $in: ACTIVE_STATUSES } },
            "quantity"
        );
    }

    async findUserTickets(userId) {
        return await this.dao.find(
            { user: userId },
            { sort: { createdAt: -1 }, populate: { path: "event", select: "title date location" } }
        );
    }

    async findEventTickets(eventId) {
        return await this.dao.find(
            { event: eventId },
            { sort: { createdAt: -1 }, populate: { path: "user", select: "first_name last_name email" } }
        );
    }

    async cancelTicket(ticketId) {
        return await this.dao.update(ticketId, {
            status: "cancelled",
            cancelledAt: new Date()
        });
    }
}

export const ticketRepository = new TicketRepository();
