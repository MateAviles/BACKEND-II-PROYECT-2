

import mongoose from "mongoose";
import { ticketModel } from "../models/Ticket.js";

export class TicketDAO {

    async create(ticketData, { populate } = {}) {
        const ticket = await ticketModel.create(ticketData);

        if(populate) await ticket.populate(populate);

        return ticket;
    }

    async findById(id) {
        return await ticketModel.findById(id);
    }

    async findOne(filter) {
        return await ticketModel.findOne(filter);
    }

    async find(filter = {}, { sort, skip, limit, populate, select } = {}) {
        let query = ticketModel.find(filter);

        if(select) query = query.select(select);
        if(sort) query = query.sort(sort);
        if(skip !== undefined) query = query.skip(skip);
        if(limit !== undefined) query = query.limit(limit);
        if(populate) query = query.populate(populate);

        return await query;
    }

    async update(id, ticketData, { populate } = {}) {
        const ticket = await ticketModel.findByIdAndUpdate(
            id,
            ticketData,
            { returnDocument: "after", runValidators: true }
        );

        if(populate && ticket) await ticket.populate(populate);

        return ticket;
    }

    async count(filter = {}) {
        return await ticketModel.countDocuments(filter);
    }

    async sum(filter, field) {
        const match = { ...filter };

        if(typeof match.event === "string"){
            match.event = new mongoose.Types.ObjectId(match.event);
        }

        const result = await ticketModel.aggregate([
            { $match: match },
            { $group: { _id: null, total: { $sum: `$${field}` } } }
        ]);

        return result[0]?.total ?? 0;
    }
}

export const ticketDAO = new TicketDAO();
