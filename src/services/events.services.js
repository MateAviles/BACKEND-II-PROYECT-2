

import { getAllEvents, saveEvent, findEventById, updateEvent } from "../repositories/events.repository.js";

export const fetchEvents = async () => {
    const events = await getAllEvents();

    return events;
};


export const createEvent = async (eventData) => {
    const newEvent = await saveEvent(eventData);

    return newEvent;
};

export const fetchEventById = async (eventId) => {
    return await findEventById(eventId);
};

export const updateEventService = async (eventId, eventData) => {
    return await updateEvent(eventId, eventData);
};