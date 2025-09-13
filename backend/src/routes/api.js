

const express = require('express');
const router = express.Router();

const llmRouter = require('./llm');
const mongoRouter = require('./mongo');


router.use('/llm', llmRouter);
router.use('/mongo', mongoRouter);

module.exports = router;
