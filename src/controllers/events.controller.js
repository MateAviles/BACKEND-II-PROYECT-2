

import { fetchEvents, loadEvent, createEvent, updateEventService, updateEventStatusService } from "../services/events.service.js";
import { EDITABLE_FIELDS } from "../services/events.service.js";
import { eventDTO, eventsToDTO } from "../dto/event.dto.js";

export const getEvents = async(req, res, next) => {
    try{
        const { status, category, location, organizer, dateFrom, dateTo, page, limit, sort } = req.query;

        const result = await fetchEvents({ status, category, location, organizer, dateFrom, dateTo, page, limit, sort });

        res.status(200).json({
            status: "success",
            data: eventsToDTO(result.data),
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        });
    }catch(error){
        return next(error);
    }
}

export const getEventByIdController = async(req, res, next) => {
    try{
        const event = await loadEvent(req.params.eventId);

        return res.status(200).json({
            status: 'success',
            payload: eventDTO(event)
        });

    }catch(error){
        return next(error);
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
            payload: eventDTO(newEvent)
        });

    }catch(error){
        return next(error);
    }
}


export const updateEventController = async (req, res, next) => {
    try {
        const eventId = req.event._id;

        const eventData = {};

        for (const field of EDITABLE_FIELDS) {
            eventData[field] = req.body[field];
        }

        const updatedEvent = await updateEventService(eventId, eventData, req.event);

        return res.status(200).json({
            status: 'success',
            payload: eventDTO(updatedEvent)
        });

    } catch (error) {
        return next(error);
    }
};


export const updateEventStatusController = async (req, res, next) => {
    try {
        const eventId = req.event._id;
        const { status: newStatus } = req.body;

        const updatedEvent = await updateEventStatusService(eventId, newStatus, req.event);

        return res.status(200).json({
            status: 'success',
            payload: eventDTO(updatedEvent)
        });

    }catch(error) {
        return next(error);
    }
}
