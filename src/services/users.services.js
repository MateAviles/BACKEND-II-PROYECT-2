

import { findAllUsers } from "../repositories/users.repository.js";

export const fetchUsers = async () => {
    const users = await findAllUsers();

    return users;
};
