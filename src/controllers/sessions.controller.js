

import { generateToken } from "../utils/jwt.js";

export const register = async(req, res) => {

        res.status(201).json({
            status: "success",
            payload: req.user
        });
}


export const login = async (req, res) => {
    try{

        const payload = {
            id: req.user._id,
            email: req.user.email,
            role: req.user.role
        }

        const token = generateToken(payload);

        res.cookie("currentUser", token, {
            httpOnly : true,
            maxAge: 3600000,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        })

        res.status(200).json({
            status: 'success',
            message: 'Login correcto'
        })

    }catch(error){
        const statusCode = error.status || 500

        return res.status(statusCode).json({
            status: 'error',
            message: error.message
        })
    }
}

export const current = async (req, res) => {
    return res.status(200).json({
        status: 'success',
        payload: req.user
    });
}

export const logout = async (req, res) => {
    res.clearCookie('currentUser');

    return res.status(200).json({
        status: 'success',
        message: 'Sesión cerrada'
    });
}