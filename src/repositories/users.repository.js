

import { userDAO } from "../dao/users.dao.js";

export class UserRepository {

    constructor(dao = userDAO) {
        this.dao = dao;
    }

    async findByEmail(email) {
        return await this.dao.findOne({ email });
    }

    async findById(id) {
        return await this.dao.findById(id);
    }

    async save(userData) {
        return await this.dao.create(userData);
    }

    async findAll() {
        return await this.dao.find({});
    }
}

export const userRepository = new UserRepository();
