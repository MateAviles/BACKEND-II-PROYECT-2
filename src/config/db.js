

import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(
            process.env.MONGO_URL
        );
        console.log("conectado a mongodb"); 
    }catch(error){
        console.log("error al conectar a mongo", error.message);
        process.exit(1)
    }
};