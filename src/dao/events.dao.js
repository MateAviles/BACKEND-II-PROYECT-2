

import { eventModel } from '../models/Event.js';

export const getAll = async (query = {}, { sort = { date: 1 }, skip, limit } = {}) => {
    const events = await eventModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

    return events;
};

export const countAll = async (query = {}) => {
    const total = await eventModel.countDocuments(query);

    return total;
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
