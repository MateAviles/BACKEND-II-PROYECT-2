

import { getAllEvents } from "../repositories/events.repository.js";

export const fetchEvents = async () => {
    const events = await getAllEvents();

    return events;
};