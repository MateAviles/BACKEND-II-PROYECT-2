

import { findUserByEmail, saveUser } from "../repositories/users.repository.js";

import { hashPassword } from "../utils/hash.js";

export const registerUser = async (data) => {

    const createError = (message, status) => {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    const {first_name, last_name, email, password} = data;

    if(!first_name || !last_name || !email || !password){
        throw createError('invalid data', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!emailRegex.test(email)){
        throw createError('email invalid format', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await findUserByEmail(normalizedEmail);

    if(existingUser){
        throw createError('Este email ya existe', 409);
    }

    const hashedPassword = await hashPassword(password);

    const userData  = {first_name, last_name, email: normalizedEmail, password: hashedPassword, role : "user"};

    const savedUser = await saveUser(userData);

    const userObject = savedUser.toObject();

    const { password: _pass, ...safeUser } = userObject;

    return safeUser;
}
