

import { eventRepository } from "../repositories/events.repository.js";
import { ticketRepository } from "../repositories/tickets.repository.js";
import { createError } from "../utils/errors.js";
import { isValidObjectId } from "../utils/ids.js";

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


const isPastDate = (rawDate) => {
    const [year, month, day] = String(rawDate).slice(0, 10).split('-').map(Number);

    const fecha = Date.UTC(year, month - 1, day);

    const hoy = new Date();
    const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    return fecha < hoyUTC;
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
        if(!isValidObjectId(filters.organizer)){
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
        eventRepository.findEvents(query, { sort, skip, limit }),
        eventRepository.countEvents(query)
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

    if(isPastDate(date)){
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

    const newEvent = await eventRepository.save(eventData);

    return newEvent;
};


export const fetchEventById = async (eventId) => {
    return await eventRepository.findById(eventId);
};


export const loadEvent = async (eventId) => {

    if(!isValidObjectId(eventId)){
        throw createError('Evento no encontrado', 404);
    }

    const event = await fetchEventById(eventId);

    if(!event){
        throw createError('Evento no encontrado', 404);
    }

    return event;
};


export const loadManagedEvent = async (eventId, user) => {
    const event = await loadEvent(eventId);

    const isAdmin = user.role === 'admin';
    const isOwner = event.organizer.toString() === user.id;

    if(!isAdmin && !isOwner){
        throw createError('No tenés permisos para modificar este evento', 403);
    }

    return event;
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


export const EDITABLE_FIELDS = ['title', 'description', 'date', 'location', 'capacity', 'category', 'price'];


export const updateEventService = async (eventId, eventData, currentEvent) => {

    const hasMissingFields = EDITABLE_FIELDS.some(field => eventData[field] === undefined);

    if(hasMissingFields){
        throw createError('Faltan campos obligatorios para modificar el evento', 400);
    }

    if(currentEvent.status === 'cancelled' || currentEvent.status === "finished"){
        throw createError('El evento esta cancelado o finalizado y no puede modificarse', 409);
    }

    if(validateRequiredFields(eventData)){
        throw createError('Los campos obligatorios no pueden estar vacíos', 400);
    }

    const eventDate = parseEventDate(eventData.date, 'La fecha del evento es invalida');

    if(isPastDate(eventData.date)){
        throw createError('La fecha del evento no puede ser anterior a hoy', 400);
    }

    eventData.date = eventDate;
    
    validateCapacityAndPrice(eventData);

    const occupied = await ticketRepository.sumActiveQuantities(eventId);

    if(eventData.capacity < occupied){
        throw createError(`La capacidad no puede ser menor a las inscripciones activas (${occupied})`, 409);
    }

    const updatedEvent = await eventRepository.update(eventId, eventData);

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

    const updatedEvent = await eventRepository.update(eventId, { status: newStatus });

    return updatedEvent;
};
