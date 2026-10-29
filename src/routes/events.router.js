

import { Router } from "express";
import { getEvents, getEventByIdController, createEventController, updateEventController, updateEventStatusController } from "../controllers/events.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMiddleware, authorizeEventOwnerOrAdmin } from "../middlewares/authorize.middleware.js";

const router = Router();

router.get('/', getEvents);
router.get('/:eventId', getEventByIdController);

router.post(
    '/',
    authMiddleware, 
    authorizeMiddleware('organizer', 'admin'), 
    createEventController
);

router.put(
    '/:eventId', 
    authMiddleware, 
    authorizeMiddleware('organizer', 'admin'),
    authorizeEventOwnerOrAdmin, 
    updateEventController
);

router.patch(
    '/:eventId/status', 
    authMiddleware, 
    authorizeMiddleware('organizer', 'admin'),
    authorizeEventOwnerOrAdmin, 
    updateEventStatusController
);

export default router;
