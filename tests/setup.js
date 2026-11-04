

import dotenv from "dotenv";
import mongoose from "mongoose";
import { beforeAll, afterAll } from "vitest";

dotenv.config();

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-secret";
process.env.JWT_EXPIRES_IN ||= "1h";

process.env.MONGO_URL = "mongodb://localhost:27017/backend-ii-test";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

export const resetDB = async () => {
    const collections = mongoose.connection.collections;

    for(const name of Object.keys(collections)){
        await collections[name].deleteMany({});
    }
};
