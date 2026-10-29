

import mongoose from "mongoose";

import { fetchEvents, fetchEventById, createEvent, updateEventService, updateEventStatusService } from "../services/events.services.js";

export const getEvents = async(req, res, next) => {
    try{
        const { status, category, location, dateFrom, dateTo, page, limit, sort } = req.query;

        const result = await fetchEvents({ status, category, location, dateFrom, dateTo, page, limit, sort });

        res.status(200).json({
            status: "success",
            data: result.data,
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
        const { eventId } = req.params;

        if(!mongoose.isValidObjectId(eventId)){
            return res.status(404).json({
                status: 'error',
                message: 'Evento no encontrado'
            });
        }

        const event = await fetchEventById(eventId);

        if(!event){
            return res.status(404).json({
                status: 'error',
                message: 'Evento no encontrado'
            });
        }

        return res.status(200).json({
            status: 'success',
            payload: event
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
            payload: newEvent
        });

    }catch(error){
        return next(error);
    }
}


export const updateEventController = async (req, res, next) => {
    try {
        const eventId = req.event._id;

        const allowedFields = [ 'title', 'description', 'date', 'location', 'capacity', 'category', 'price' ];

        let eventData = {};

        for(const field of allowedFields){
            if(req.body[field] !== undefined){
                eventData[field] = req.body[field];
            }
        }

        const updatedEvent = await updateEventService(eventId, eventData, req.event);

        return res.status(200).json({
            status: 'success',
            payload: updatedEvent
        });

    }catch(error) {
        return next(error);
    }
}


export const updateEventStatusController = async (req, res, next) => {
    try {
        const eventId = req.event._id;
        const { status: newStatus } = req.body;

        const updatedEvent = await updateEventStatusService(eventId, newStatus, req.event);

        return res.status(200).json({
            status: 'success',
            payload: updatedEvent
        });

    }catch(error) {
        return next(error);
    }
}
