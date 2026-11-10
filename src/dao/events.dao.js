

import { eventModel } from "../models/Event.js";

export class EventDAO {

    async create(eventData) {
        return await eventModel.create(eventData);
    }

    async findById(id) {
        return await eventModel.findById(id);
    }

    async findOne(filter) {
        return await eventModel.findOne(filter);
    }

    async find(filter = {}, { sort = { date: 1 }, skip, limit, populate, select } = {}) {
        let query = eventModel.find(filter);

        if(select) query = query.select(select);
        if(sort) query = query.sort(sort);
        if(skip !== undefined) query = query.skip(skip);
        if(limit !== undefined) query = query.limit(limit);
        if(populate) query = query.populate(populate);

        return await query;
    }

    async update(id, eventData) {
        return await eventModel.findByIdAndUpdate(
            id,
            eventData,
            { returnDocument: "after", runValidators: true }
        );
    }

    async count(filter = {}) {
        return await eventModel.countDocuments(filter);
    }
}

export const eventDAO = new EventDAO();
