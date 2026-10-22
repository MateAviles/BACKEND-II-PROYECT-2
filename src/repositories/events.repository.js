

import { getAll, create, getById, update } from "../dao/events.dao.js";

export const getAllEvents = async () => {
    const events = await getAll();

    return events;
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