import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import UserRoute from "./routes/userRoute.js";
import SessionRoute from "./routes/sessionRoute.js";
import MongoRoute from "./routes/mongo.js";
import LLMRoute from "./routes/llm.js";

const app = express();

// No server-side sessions; using stateless auth

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (mounted under /api to match frontend)
app.use("/api/user", UserRoute);
app.use("/api/session", SessionRoute);
app.use("/api/mongo/favouriteMeals", MongoRoute);
app.use("/api/llm", LLMRoute);

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

export default app;