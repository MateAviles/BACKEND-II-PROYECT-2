

import { UserModel } from "../models/User.js";

export const findByEmail = async (email) => {
    const user = await UserModel.findOne({
        email
    });

    return user
}

export const createUser = async (userData) => {
    const newUser = await UserModel.create(userData); 

    return newUser;
}