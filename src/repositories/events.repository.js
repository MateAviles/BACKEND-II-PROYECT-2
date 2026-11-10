

import { eventDAO } from "../dao/events.dao.js";

export class EventRepository {

    constructor(dao = eventDAO) {
        this.dao = dao;
    }

    async findEvents(query = {}, options = {}) {
        return await this.dao.find(query, options);
    }

    async countEvents(query = {}) {
        return await this.dao.count(query);
    }

    async findById(id) {
        return await this.dao.findById(id);
    }

    async save(eventData) {
        return await this.dao.create(eventData);
    }

    async update(id, eventData) {
        return await this.dao.update(id, eventData);
    }
}

export const eventRepository = new EventRepository();
