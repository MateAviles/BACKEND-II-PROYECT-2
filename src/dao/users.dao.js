

import { UserModel } from "../models/User.js";

export class UserDAO {

    async create(userData) {
        return await UserModel.create(userData);
    }

    async findById(id) {
        return await UserModel.findById(id);
    }

    async findOne(filter) {
        return await UserModel.findOne(filter);
    }

    async find(filter = {}, { sort, skip, limit, populate, select } = {}) {
        let query = UserModel.find(filter);

        if(select) query = query.select(select);
        if(sort) query = query.sort(sort);
        if(skip !== undefined) query = query.skip(skip);
        if(limit !== undefined) query = query.limit(limit);
        if(populate) query = query.populate(populate);

        return await query;
    }

    async update(id, userData) {
        return await UserModel.findByIdAndUpdate(
            id,
            userData,
            { returnDocument: "after", runValidators: true }
        );
    }

    async count(filter = {}) {
        return await UserModel.countDocuments(filter);
    }
}

export const userDAO = new UserDAO();
