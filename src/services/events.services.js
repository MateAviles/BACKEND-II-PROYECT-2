

import mongoose from "mongoose";

import { getAllEvents, countEvents, saveEvent, findEventById, updateEvent } from "../repositories/events.repository.js";
import { createError } from "../utils/errors.js";

const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'];
const SORTABLE_FIELDS = ['date', 'title', 'price', 'capacity', 'createdAt'];
const DEFAULT_LIMIT = 10;
const ALLOWED_TRANSITIONS = {
    draft: ['published', 'cancelled'],
    published: ['draft', 'cancelled', 'finished'],
    cancelled: [],
    finished: [] 
};



const parseSort = (sort) => {
    if(!sort || String(sort).trim() === ""){
        return { date: 1 };
    }

    const campo = String(sort).replace('-', '').trim();

    if(!SORTABLE_FIELDS.includes(campo)){
        return { date: 1 };
    }

    const orden = String(sort).startsWith('-') ? -1 : 1;

    return { [campo]: orden };
};


const parsePagination = (page, limit) => {
    const pageParsed = Number.parseInt(page, 10);
    const limitParsed = Number.parseInt(limit, 10);

    const pagina = Number.isInteger(pageParsed) && pageParsed > 0 ? pageParsed : 1;

    let porPagina = Number.isInteger(limitParsed) && limitParsed > 0 ? limitParsed : DEFAULT_LIMIT;
    if(porPagina > 100) porPagina = 100;

    return { page: pagina, limit: porPagina };
};


const parseEventDate = (rawDate, mensajeInvalida) => {
    if(typeof rawDate !== 'string'){
        throw createError(mensajeInvalida, 400);
    }

    const soloFecha = /^\d{4}-\d{2}-\d{2}$/;
    const fechaConHora = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

    if(!soloFecha.test(rawDate) && !fechaConHora.test(rawDate)){
        throw createError(mensajeInvalida, 400);
    }

    const date = new Date(rawDate);

    if(Number.isNaN(date.getTime())){
        throw createError(mensajeInvalida, 400);
    }

    if(soloFecha.test(rawDate)){
        const [year, month, day] = rawDate.split('-').map(Number);

        const fechaValida =
            date.getUTCFullYear() === year &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day;

        if(!fechaValida){
            throw createError(mensajeInvalida, 400);
        }
    }

    return date;
};


const isPastDate = (date) => {
    const hoy = new Date();
    const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

    return fechaUTC < hoyUTC;
};


const validateCapacityAndPrice = ({ capacity, price }) => {
    if(capacity !== undefined){
        if(typeof capacity !== "number" || !Number.isInteger(capacity) || capacity <= 0){
            throw createError('La capacidad debe ser un número entero mayor a 0', 400);
        }
    }

    if(price !== undefined){
        if(typeof price !== "number" || !Number.isFinite(price) || price < 0){
            throw createError('El precio debe ser un número finito mayor o igual a 0', 400);
        }
    }
};


export const fetchEvents = async (filters = {}) => {

    const query = {};

    if(filters.category && String(filters.category).trim() !== ""){
        query.category = filters.category;
    }

    if(filters.location && String(filters.location).trim() !== ""){
        query.location = filters.location;
    }

    if(filters.organizer && String(filters.organizer).trim() !== ""){
        if(!mongoose.isValidObjectId(filters.organizer)){
            throw createError('El organizador es invalido', 400);
        }

        query.organizer = filters.organizer;
    }

    if(filters.status && String(filters.status).trim() !== ""){
        if(!EVENT_STATUSES.includes(filters.status)){
            throw createError(`El estado debe ser uno de: ${EVENT_STATUSES.join(', ')}`, 400);
        }

        query.status = filters.status;
    }

    if(filters.dateFrom || filters.dateTo){
        query.date = {};

        let from;
        let to;

        if(filters.dateFrom){
            from = parseEventDate(filters.dateFrom, 'La fecha de inicio es invalida');
            query.date.$gte = from;
        }

        if(filters.dateTo){
            const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo);

            to = parseEventDate(filters.dateTo, 'La fecha de fin es invalida');

            if(soloFecha){
                to.setUTCHours(23, 59, 59, 999);
            }

            query.date.$lte = to;
        }

        if(from && to && from > to){
            throw createError('La fecha del inicio no debe ser posterior a la de fin', 400);
        }
    }

    const { page, limit } = parsePagination(filters.page, filters.limit);
    const sort = parseSort(filters.sort);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
        getAllEvents(query, { sort, skip, limit }),
        countEvents(query)
    ]);

    return {
        data: events,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    };
};


export const createEvent = async (data) => {

    const { title, description, category, date, location, capacity, price, organizer } = data || {};

    if(!title || !description || !category || !date || !location || capacity === undefined || !organizer){
        throw createError('Faltan campos obligatorios', 400);
    }

    const eventDate = parseEventDate(date, 'La fecha del evento es invalida');

    if(isPastDate(eventDate)){
        throw createError('La fecha del evento no puede ser anterior a hoy', 400);
    }

    validateCapacityAndPrice({ capacity, price });

    const eventData = {
        title,
        description,
        category,
        date: eventDate,
        location,
        capacity: Number(capacity),
        price: price !== undefined ? Number(price) : 0,
        organizer
    };

    const newEvent = await saveEvent(eventData);

    return newEvent;
};

export const fetchEventById = async (eventId) => {
    return await findEventById(eventId);
};

const validateRequiredFields = (eventData) => {
    const requiredFields = ['title', 'description', 'category', 'location'];

    return requiredFields.some(field => {
        const value = eventData[field];

        return (
            typeof value !== 'string' ||
            value.trim() === ''
        );
    });
};


export const updateEventService = async (eventId, eventData, currentEvent) => {

    if(currentEvent.status === 'cancelled' || currentEvent.status === "finished"){
        throw createError('El evento esta cancelado o finalizado y no puede modificarse', 409);
    }

    if(validateRequiredFields(eventData)){
        throw createError('Los campos obligatorios no pueden estar vacíos', 400);
    }

    const eventDate = parseEventDate(eventData.date, 'La fecha del evento es invalida');

    if(isPastDate(eventDate)){
        throw createError('La fecha del evento no puede ser anterior a hoy', 400);
    }

    eventData.date = eventDate;
    
    validateCapacityAndPrice(eventData);

    const updatedEvent = await updateEvent(eventId, eventData);

    return updatedEvent;
};


export const updateEventStatusService = async (eventId, newStatus, currentEvent) => {

    if(!newStatus || !EVENT_STATUSES.includes(newStatus)){
        throw createError(`El estado debe ser uno de: ${EVENT_STATUSES.join(', ')}`, 400);
    }

    if(newStatus === currentEvent.status){
        throw createError('El evento ya tiene ese estado', 400);
    }

    const allowedTransitions = ALLOWED_TRANSITIONS[currentEvent.status];

    if(!allowedTransitions.includes(newStatus)){
        throw createError(`No se permite cambiar el estado de ${currentEvent.status} a ${newStatus}`, 409);
    };

    const updatedEvent = await updateEvent(eventId, { status: newStatus });

    return updatedEvent;
};
