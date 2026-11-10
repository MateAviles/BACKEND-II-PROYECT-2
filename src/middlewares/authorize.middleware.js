

import { loadManagedEvent } from "../services/events.services.js";
import { loadOwnedTicket } from "../services/tickets.services.js";


export const authorizeMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.user){
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado'
            });
        }

        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({
                status: 'error',
                message: 'No tenés permisos para realizar esta acción'
            });
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
