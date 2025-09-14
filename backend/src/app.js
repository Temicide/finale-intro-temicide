import express from "express";
import cors from "cors";

import UserRoute from "./routes/userRoute.js";
import SessionRoute from "./routes/sessionRoute.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/user", UserRoute);
app.use("/session", SessionRoute);


export default app;