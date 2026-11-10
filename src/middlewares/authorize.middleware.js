

import { createError } from "../utils/errors.js";
import { loadManagedEvent } from "../services/events.service.js";
import { loadOwnedTicket } from "../services/tickets.service.js";


export const authorizeMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.user){
            return next(createError('No autenticado', 401));
        }

        if(!allowedRoles.includes(req.user.role)){
            return next(createError('No tenés permisos para realizar esta acción', 403));
        }

        next();
    }
}


export const authorizeEventOwnerOrAdmin = async (req, res, next) => {
    try{

        req.event = await loadManagedEvent(req.params.eventId, req.user);

        next();
    }catch(error){
        return next(error);
    }
}


export const authorizeTicketOwnerOrAdmin = async (req, res, next) => {
    try{

        req.ticket = await loadOwnedTicket(req.params.ticketId, req.user);

        next();
    }catch(error){
        return next(error);
    }
}
