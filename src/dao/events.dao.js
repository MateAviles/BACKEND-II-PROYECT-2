

import { eventModel } from '../models/Event.js';

export const getAll = async () => {
    const events = await eventModel.find();

    return events;
};

