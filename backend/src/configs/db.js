import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.warn('MONGO_URI not set. Skipping MongoDB connection (dev mode).');
} else {
    mongoose.connect(mongoUri)
        .then(() => {
            console.log('MongoDB connected successfully');
        })
        .catch((error) => {
            console.error('MongoDB connection error:', error);
            process.exit(1);
        });
}