

import mongoose from "mongoose";
import { ticketModel } from "../models/Ticket.js";

export const create = async (ticketData) => {
    const newTicket = await ticketModel.create(ticketData);
    return newTicket;
};

export const getById = async (ticketId) => {
    return await ticketModel.findById(ticketId);
};

export const findActiveByUserAndEvent = async (userId, eventId) => {
    return await ticketModel.findOne({
        user: userId,
        event: eventId,
        status: { $in: ['confirmed', 'pending'] }
    });
};

export const sumActiveQuantityByEvent = async (eventId) => {
    const result = await ticketModel.aggregate([
        {
            $match: {
                event: new mongoose.Types.ObjectId(eventId),
                status: { $in: ['confirmed', 'pending'] }
            }
        },
        {
            $group: { _id: null, total: { $sum: "$quantity" } }
        }
    ]);

    return result[0]?.total ?? 0;
};

export const findByUser = async (userId) => {
    return await ticketModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .populate('event', 'title date location');
};

export const findByEvent = async (eventId) => {
    return await ticketModel
        .find({ event: eventId })
        .sort({ createdAt: -1 })
        .populate('user', 'first_name last_name email');
};

export const update = async (ticketId, ticketData) => {
    return await ticketModel.findByIdAndUpdate(
        ticketId,
        ticketData,
        { returnDocument: 'after', runValidators: true }
    );
};
