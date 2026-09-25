

import { getAll } from "../dao/events.dao.js";

export const getAllEvents = async () => {
    const events = await getAll();

    return events;
};