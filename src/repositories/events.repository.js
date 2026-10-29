

import { getAll, countAll, create, getById, update } from "../dao/events.dao.js";

export const getAllEvents = async (query, options) => {
    const events = await getAll(query, options);

    return events;
};

export const countEvents = async (query) => {
    const total = await countAll(query);

    return total;
};

export const saveEvent = async (eventData) => {
    const newEvent = await create(eventData);

    return newEvent;
};

export const findEventById = async (eventId) => {
    return await getById(eventId);
};

export const updateEvent = async (eventId, eventData) => {
    return await update(eventId, eventData);
}
