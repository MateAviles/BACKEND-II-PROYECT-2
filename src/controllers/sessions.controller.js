

import { registerUser } from "../services/sessions.service.js";

export const register = async(req, res) => {
    try{

        const user = await registerUser(req.body || {})

        res.status(201).json({
            status: "success",
            payload: user
        });
    }catch(error){
        const statusCode = error.status || 500

        return res.status(statusCode).json({
            status: "error",
            message: error.message
        });
    }
}