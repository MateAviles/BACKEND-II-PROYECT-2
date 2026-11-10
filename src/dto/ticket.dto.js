

const toPlain = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : { ...doc });

const isPopulated = (value) =>
    value !== null &&
    typeof value === "object" &&
    typeof value.toHexString !== "function";

const userRefDTO = (user) => {
    if (!isPopulated(user)) {
        return String(user);
    }

    const plain = toPlain(user);

    return {
        _id: String(plain._id),
        first_name: plain.first_name,
        last_name: plain.last_name,
        email: plain.email
    };
};

const eventRefDTO = (event) => {
    if (!isPopulated(event)) {
        return String(event);
    }

    const plain = toPlain(event);

    return {
        _id: String(plain._id),
        title: plain.title,
        date: plain.date,
        location: plain.location
    };
};

export const ticketDTO = (ticket) => {
    const plain = toPlain(ticket);

    return {
        _id: String(plain._id),
        user: userRefDTO(plain.user),
        event: eventRefDTO(plain.event),
        status: plain.status,
        quantity: plain.quantity,
        reservationCode: plain.reservationCode,
        cancelledAt: plain.cancelledAt ?? null,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};

export const ticketsToDTO = (tickets) => tickets.map(ticketDTO);
