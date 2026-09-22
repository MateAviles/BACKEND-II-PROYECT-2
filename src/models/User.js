

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        first_name:{
            type: String,
            required: true,
            trim: true
        },
        last_name:{
            type: String,
            required: true,
            trim: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 6
        },
        password:{
            type: String,
            required: true
        },
        role:{
            type: String,
            enum: ["user", "admin", "organizer"],
            default: "user"
        }
    },
    {
        timestamps: true
    }
);

export const UserModel = mongoose.model('User', userSchema);