

import { fetchEvents } from "../services/events.services.js";

export const getEvents = async(req, res) => {
    try{
        const events = await fetchEvents()

        res.status(200).json({
            status: "success",
            payload: events
        });
    }catch(error){
        res.status(500).json({
            error: 'error al entregar listado de eventos'
        });
    }
}