

import passport from "passport";

import { createError } from "../utils/errors.js";


export const authMiddleware = (req, res, next) => {
    passport.authenticate('current', {session: false}, (err, user, info) => {
        if(err){
            return next(err);
        }
    
        if(!user){
            return next(createError('No autenticado', 401));
        }
    
        req.user = user;
    
        next();
    })(req, res, next);
}
