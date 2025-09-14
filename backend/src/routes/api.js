import express from "express";

const router = express.Router();

const llmRouter = require('./llm');
router.use('/llm', llmRouter);
router.use('/mongo/favouriteMeals', mongoRouter);

module.exports = router;
