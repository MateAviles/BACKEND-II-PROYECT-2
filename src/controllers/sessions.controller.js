

import { generateToken } from "../utils/jwt.js";
import { sessionUserDTO } from "../dto/user.dto.js";

const parseExpiresInMs = (value) => {
    const match = /^(\d+)\s*(s|m|h|d)?$/.exec(String(value ?? '').trim());

    if(!match){
        return 3600000;
    }

    const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

    return Number(match[1]) * (unitMs[match[2] ?? 's'] ?? 1000);
};

export const register = async(req, res, next) => {
    try{

        res.status(201).json({
            status: "success",
            payload: sessionUserDTO(req.user)
        });

    }catch(error){
        return next(error);
    }
}


export const login = async (req, res, next) => {
    try{

        const payload = {
            id: req.user._id,
            email: req.user.email,
            role: req.user.role
        }

        const token = generateToken(payload);

        res.cookie("currentUser", token, {
            httpOnly : true,
            maxAge: parseExpiresInMs(process.env.JWT_EXPIRES_IN),
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        })

        res.status(200).json({
            status: 'success',
            message: 'Login correcto'
        })

    }catch(error){
        return next(error);
    }
}

export const current = async (req, res) => {
    return res.status(200).json({
        status: 'success',
        payload: sessionUserDTO(req.user)
    });
}

export const logout = async (req, res) => {
    res.clearCookie('currentUser');

    return res.status(200).json({
        status: 'success',
        message: 'Sesión cerrada'
    });
}
