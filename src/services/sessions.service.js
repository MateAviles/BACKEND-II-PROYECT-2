

import { findUserByEmail, saveUser } from "../repositories/users.repository.js";

import { hashPassword, isValidPassword } from "../utils/hash.js";

import { generateToken } from "../utils/jwt.js"; 

const MIN_PASSWORD_LENGTH = 6;

export const registerUser = async (data) => {

    const createError = (message, status) => {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    const {first_name, last_name, email, password} = data || {};

    if(!first_name || !last_name || !email || !password){
        throw createError('Faltan campos obligatorios', 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!emailRegex.test(normalizedEmail)){
        throw createError('Faltan campos obligatorios', 400);
    }

    if(password.length < MIN_PASSWORD_LENGTH){
        throw createError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, 400);
    }

    const existingUser = await findUserByEmail(normalizedEmail);

    if(existingUser){
        throw createError('El email ya está registrado', 409);
    }

    const hashedPassword = await hashPassword(password);

    const userData  = {first_name, last_name, email: normalizedEmail, password: hashedPassword, role : "user"};

    let savedUser;

    try{
        savedUser = await saveUser(userData);
    }catch(error){
        if(error.code === 11000){
            throw createError('El email ya está registrado', 409);
        }
        throw error;
    }

    const { _id, password: _pass, ...rest } = savedUser.toObject();

    return { id: _id, ...rest };
}

export const loginUser = async (data) => {

    const createError = (message, status) => {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    const {email, password} = data || {};

    if(!email || !password){
        throw createError('Credenciales inválidas', 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await findUserByEmail(normalizedEmail);

    if(!user){
        throw createError('Credenciales inválidas', 401);
    }

    const validPassword = await isValidPassword(password, user.password);

    if(!validPassword){
        throw createError('Credenciales inválidas', 401);
    }

    const payload = {
        id : user._id,
        email : user.email,
        role: user.role
    }

    const token = generateToken(payload);

    return token;
}
