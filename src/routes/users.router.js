

import { Router } from 'express';

import { getUsers } from '../controllers/users.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeMiddleware } from '../middlewares/authorize.middleware.js';

const router = Router();

// Ruta administrativa: solo admin puede ver el listado de usuarios
router.get('/', authMiddleware, authorizeMiddleware('admin'), getUsers);

export default router;
