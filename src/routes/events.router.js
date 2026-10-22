

import { Router } from "express";
import { getEvents, createEventController, updateEventController } from "../controllers/events.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMiddleware, authorizeEventOwnerOrAdmin } from "../middlewares/authorize.middleware.js";

const router = Router();

router.get('/', getEvents);

router.post(
    '/', authMiddleware, 
    authorizeMiddleware('organizer', 'admin'), 
    createEventController
);

router.patch(
    '/:eventId', 
    authMiddleware, 
    authorizeMiddleware('organizer', 'admin'),
    authorizeEventOwnerOrAdmin, 
    updateEventController
);



export default router;