

const toPlain = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : { ...doc });

export const sessionUserDTO = (user) => {
    const plain = toPlain(user);

    return {
        id: String(plain.id ?? plain._id),
        first_name: plain.first_name,
        last_name: plain.last_name,
        email: plain.email,
        role: plain.role,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};

export const userDTO = (user) => {
    const plain = toPlain(user);

    return {
        _id: String(plain._id ?? plain.id),
        first_name: plain.first_name,
        last_name: plain.last_name,
        email: plain.email,
        role: plain.role,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};

export const usersToDTO = (users) => users.map(userDTO);
