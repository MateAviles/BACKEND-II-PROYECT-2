

import { userRepository } from "../repositories/users.repository.js";

export const fetchUsers = async () => {
    return await userRepository.findAll();
};
