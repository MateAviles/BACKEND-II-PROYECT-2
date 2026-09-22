import mongoose from "mongoose";


const eventSchema = new mongoose.Schema(
    {
        title:{
            type: String,
            required: true
        },
        description:{
            type: String,
            required: true,
            default: ""
        },
        date:{
            type: Date,
            required: true
        },
        location:{
            type: String,
            required: true,
            
        }
    }
);

export const eventModel = mongoose.model("Event", eventSchema);