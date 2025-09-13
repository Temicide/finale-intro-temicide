const express = require('express');
const router = express.Router();
const { llmRateLimiter, handleLLMQuery } = require('../utils/llm');

router.post('/query', llmRateLimiter, handleLLMQuery);

module.exports = router;
