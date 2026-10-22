

import { fetchUsers } from "../services/users.services.js";

export const getUsers = async (req, res, next) => {
    try{
        const users = await fetchUsers();

        return res.status(200).json({
            status: 'success',
            payload: users
        });
    }catch(error){
        return next(error);
    }
}
