

import { Router } from 'express';

import { register, login, current, logout } from '../controllers/sessions.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/current', authMiddleware, current);
router.post('/logout', logout)

export default router;