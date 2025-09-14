import express from "express";
import cors from "cors";

import UserRoute from "./routes/userRoute.js";
import SessionRoute from "./routes/sessionRoute.js";
import MongoRoute from "./routes/mongo.js";
import LLMRoute from "./routes/llm.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/user", UserRoute);
app.use("/session", SessionRoute);
app.use("/mongo/favouriteMeals", MongoRoute);
app.use("/llm", LLMRoute);

export default app;