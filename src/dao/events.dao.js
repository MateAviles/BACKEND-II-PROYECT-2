

import { eventModel } from '../models/Event.js';

export const getAll = async () => {
    const events = await eventModel.find({ published: true });

    return events;
};

export const create = async (eventData) => {
    const newEvent = await eventModel.create(eventData);

    return newEvent;
};

export const getById = async (eventId) => {
    const event = await eventModel.findById(eventId);
    return event;
};


export const update = async (eventId, eventData) => {
    const eventUpdated = await eventModel.findByIdAndUpdate(
        eventId, 
        eventData, 
        {new: true, runValidators: true}
    );
    
    return eventUpdated;
}