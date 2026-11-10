

import { userRepository } from "../repositories/users.repository.js";
import { createError } from "../utils/errors.js";
import { hashPassword, isValidPassword } from "../utils/hash.js";

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export const registerUser = async ({ first_name, last_name, email, password }) => {

    if(!first_name || !last_name || !email || !password){
        throw createError('Faltan campos obligatorios', 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if(!EMAIL_REGEX.test(normalizedEmail)){
        throw createError('Email inválido', 400);
    }

    if(password.length < MIN_PASSWORD_LENGTH){
        throw createError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, 400);
    }

    const existingUser = await userRepository.findByEmail(normalizedEmail);

    if(existingUser){
        throw createError('El email ya está registrado', 409);
    }

    const hashedPassword = await hashPassword(password);

    let savedUser;

    try{
        savedUser = await userRepository.save({
            first_name,
            last_name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'user'
        });
    }catch(error){

        if(error.code === 11000){
            throw createError('El email ya está registrado', 409);
        }

        throw error;
    }

    const { _id, password: _pass, ...rest } = savedUser.toObject();

    return { id: _id, ...rest };
};


export const loginUser = async ({ email, password }) => {

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await userRepository.findByEmail(normalizedEmail);

    if(!user){
        throw createError('Credenciales inválidas', 401);
    }

    const validPassword = await isValidPassword(password, user.password);

    if(!validPassword){
        throw createError('Credenciales inválidas', 401);
    }

    return user;
};


export const fetchUsers = async () => {
    return await userRepository.findAll();
};
