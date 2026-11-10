
const toPlain = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : { ...doc });

export const eventDTO = (event) => {
    const plain = toPlain(event);

    return {
        _id: String(plain._id),
        title: plain.title,
        description: plain.description,
        category: plain.category,
        date: plain.date,
        location: plain.location,
        capacity: plain.capacity,
        price: plain.price,
        status: plain.status,
        organizer: String(plain.organizer?._id ?? plain.organizer),
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
    };
};

export const eventsToDTO = (events) => events.map(eventDTO);
