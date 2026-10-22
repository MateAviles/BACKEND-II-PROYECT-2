

import passport from "passport";


export const authMiddleware = (req, res, next) => {
    passport.authenticate('current', {session: false}, (err, user, info) => {
        if(err){
            return next(err);
        }
    
        if(!user){
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado'
            });
        }
    
        req.user = user;
    
        next();
    })(req, res, next);
}
