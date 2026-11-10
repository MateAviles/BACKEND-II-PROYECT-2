

import { fetchUsers } from "../services/users.service.js";
import { usersToDTO } from "../dto/user.dto.js";

export const getUsers = async (req, res, next) => {
    try{
        const users = await fetchUsers();

        return res.status(200).json({
            status: 'success',
            payload: usersToDTO(users)
        });
    }catch(error){
        return next(error);
    }
}
