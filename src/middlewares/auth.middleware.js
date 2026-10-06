

import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (req, res, next) => {

    const token = req.cookies.currentUser

    if(!token){
        return res.status(401).json({
            status: 'error',
            message: 'No autenticado'
        })
    }

    try{
        const payload = verifyToken(token);

        req.user = payload;

        next();
    }catch(errror){
        return res.status(401).json({
            status: 'error',
            message: 'No autenticado'
        });
    }
}