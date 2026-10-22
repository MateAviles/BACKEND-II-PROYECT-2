

import { findByEmail, createUser, findAll } from "../dao/users.dao.js";

export const findUserByEmail = async (email) =>{
    const user = await findByEmail(email);

    return user;
} 

export const saveUser = async (data) => {
    const user = await createUser(data);

    return user;
}

export const findAllUsers = async () => {
    const users = await findAll();

    return users;
}