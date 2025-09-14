import mongoose from "mongoose";

// Connect to MongoDB immediately when this file is imported
mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });
