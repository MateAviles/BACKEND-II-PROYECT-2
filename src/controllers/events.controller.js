

import { fetchEvents, createEvent, updateEventService } from "../services/events.services.js";

export const getEvents = async(req, res) => {
    try{
        const events = await fetchEvents()

        res.status(200).json({
            status: "success",
            payload: events
        });
    }catch(error){
        res.status(500).json({
            error: 'Error al entregar listado de eventos'
        });
    }
}

export const createEventController = async (req, res, next) => {
    try{
        const eventData = {
            ...req.body,
            organizer : req.user.id
        }

        const newEvent = await createEvent(eventData);

        return res.status(201).json({
            status: 'success',
            payload: newEvent
        });

    }catch(error){
        return next(error);
    }
}


export const updateEventController = async (req, res, next) => {
    try {

        const eventId = req.event._id;

        const allowedFields = [ 'title', 'description', 'date', 'location', 'capacity', 'published' ];

        let eventData = {};

        for(const field of allowedFields){
            if(req.body[field] !== undefined){
                eventData[field] = req.body[field];
            }
        }

        if(Object.keys(eventData).length === 0){
            return res.status(400).json({
                status: 'error',
                message: 'Nada que actualizar'
            });
        }

        const updatedEvent = await updateEventService(eventId, eventData);

        return res.status(200).json({
            status: 'success',
            payload: updatedEvent
        });

    }catch(error) {
        return next(error);
    }
}