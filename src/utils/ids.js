

export const isValidObjectId = (value) => {
    return /^[0-9a-fA-F]{24}$/.test(String(value));
};
