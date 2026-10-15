

import { Router } from 'express';
import passport from 'passport';

import { register, login, current, logout } from '../controllers/sessions.controller.js';

const router = Router();

router.post('/register', passport.authenticate('register', {
        session: false,
        failWithError: true
    }),
    register
);

router.post('/login', passport.authenticate('login',{
        session: false,
        failWithError: true
    }),
    login
);

router.get('/current', passport.authenticate('current', {
    session: false,
    failWithError: true
    }),
    current
);

router.post('/logout', logout)

export default router;