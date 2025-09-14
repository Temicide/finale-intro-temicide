const express = require('express');
const router = express.Router();
const { llmRateLimiter, handleLLMQuery , parseGeminiJson } = require('../utils/llm');


// Accepts either a prompt string or structured meal suggestion input
router.post('/query', llmRateLimiter, async (req, res) => {
  // If structured meal suggestion input, use suggestMeal
  const { allergies, dislikes, goal, additional_preferences } = req.body;
  if (goal) {
    try {
      const { suggestMeal } = require('../utils/llm');
      const response = await suggestMeal({ allergies, dislikes, goal, additional_preferences });
      res.json(parseGeminiJson(response));
    } catch (err) {
      res.status(500).json({ error: 'Meal suggestion failed.' });
      console.log(err);
    }
    return;
  }
  // Otherwise, fallback to generic prompt
  /*try {
    const { queryLLM } = require('../utils/llm');
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    const result = await queryLLM(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'LLM query failed.' });
    console.log(err);
  }*/
});

// Meal suggestion endpoint

module.exports = router;
