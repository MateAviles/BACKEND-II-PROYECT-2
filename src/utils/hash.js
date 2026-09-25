

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async password => {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

export const isValidPassword = async (password, hashPassword) => {
    return await bcrypt.compare(password, hashPassword);
}