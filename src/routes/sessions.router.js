

import {Router} from 'express';

import {register} from '../controllers/sessions.controller.js';

const router = Router();

router.post('/register', register)

export default router;