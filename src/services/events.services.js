

import { getAllEvents, countEvents, saveEvent, findEventById, updateEvent } from "../repositories/events.repository.js";

const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'];
const SORTABLE_FIELDS = ['date', 'title', 'price', 'capacity', 'createdAt'];
const DEFAULT_LIMIT = 10;

const createError = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
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
    const date = new Date(rawDate);

    if(!rawDate || Number.isNaN(date.getTime())){
        throw createError(mensajeInvalida, 400);
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
        const value = Number(capacity);

        if(!Number.isInteger(value) || value <= 0){
            throw createError('La capacidad debe ser un numero entero mayor a 0', 400);
        }
    }

    if(price !== undefined){
        const value = Number(price);

        if(!Number.isFinite(value) || value < 0){
            throw createError('El precio no puede ser negativo', 400);
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
            const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(String(filters.dateTo).trim());

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

    const { title, description, category, date, location, capacity, price, status, organizer } = data || {};

    if(!title || !description || !category || !date || !location || capacity === undefined || !organizer){
        throw createError('Faltan campos obligatorios', 400);
    }

    const eventDate = parseEventDate(date, 'La fecha del evento es invalida');

    if(isPastDate(eventDate)){
        throw createError('La fecha del evento no puede ser anterior a hoy', 400);
    }

    validateCapacityAndPrice({ capacity, price });

    if(status !== undefined && !EVENT_STATUSES.includes(status)){
        throw createError(`El estado debe ser uno de: ${EVENT_STATUSES.join(', ')}`, 400);
    }

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

    if(status !== undefined){
        eventData.status = status;
    }

    const newEvent = await saveEvent(eventData);

    return newEvent;
};

export const fetchEventById = async (eventId) => {
    return await findEventById(eventId);
};

export const updateEventService = async (eventId, eventData, currentEvent) => {

    if(currentEvent.status === 'cancelled'){
        throw createError('El evento esta cancelado y no puede modificarse', 409);
    }

    if(Object.keys(eventData).length === 0){
        throw createError('Nada que actualizar', 400);
    }

    if(eventData.date !== undefined){
        const eventDate = parseEventDate(eventData.date, 'La fecha del evento es invalida');

        if(isPastDate(eventDate)){
            throw createError('La fecha del evento no puede ser anterior a hoy', 400);
        }

        eventData.date = eventDate;
    }

    validateCapacityAndPrice(eventData);

    const updatedEvent = await updateEvent(eventId, eventData);

    return updatedEvent;
};

export const updateEventStatusService = async (eventId, newStatus, currentEvent) => {

    if(!newStatus || !EVENT_STATUSES.includes(newStatus)){
        throw createError(`El estado debe ser uno de: ${EVENT_STATUSES.join(', ')}`, 400);
    }

    if(currentEvent.status === 'cancelled'){
        throw createError('El evento esta cancelado y no puede modificarse', 409);
    }

    if(currentEvent.status === 'finished'){
        throw createError('El evento esta finalizado y no puede modificarse', 409);
    }

    if(newStatus === currentEvent.status){
        throw createError('El evento ya tiene ese estado', 400);
    }

    const updatedEvent = await updateEvent(eventId, { status: newStatus });

    return updatedEvent;
};
