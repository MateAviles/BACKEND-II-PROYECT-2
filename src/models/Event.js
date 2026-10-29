

import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title:{
            type: String,
            required: true,
            trim: true
        },
        description:{
            type: String,
            required: true,
            trim: true
        },
        category:{
            type: String,
            ref: 'Category',
            required: true
        },
        date:{
            type: Date,
            required: true
        },
        location:{
            type: String,
            required: true,
            trim: true
        },
        capacity: {
        type: Number,
        required: true,
        min: 1
        },
        price:{
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        status:{
            type: String,
            required: true,
            enum: ['draft', 'published', 'cancelled', 'finished'],
            default: 'draft'
        },
        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    }
);

eventSchema.index({ date: 1 });
eventSchema.index({ status: 1, date: 1 });

export const eventModel = mongoose.model("Event", eventSchema);