
import mongoose from "mongoose";

import { fetchEventById } from "../services/events.services.js"; 


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
    
        const isAdmin = req.user.role === "admin";
        const isOwner = event.organizer.toString() === req.user.id;
    
        if(!isAdmin && !isOwner){
            return res.status(403).json({
                status: 'error',
                message: 'No tenés permisos para modificar este evento'
            });
        }
    
        req.event = event;
    
        next();
    }catch(error){
        return next(error);
    }
}