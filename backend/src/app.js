import express from "express";
import cors from "cors";
import path from "path";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Import routes
const apiRouter = require('./routes/api');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

app.use('/api', apiRouter);

export default app;