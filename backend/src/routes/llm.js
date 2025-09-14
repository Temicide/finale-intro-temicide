const express = require('express');
const router = express.Router();
const { llmRateLimiter } = require('../utils/llm');
// Note: Using dynamic import for ES6 module compatibility
let aiService;
async function loadAiService() {
  if (!aiService) {
    aiService = await import('../services/aiService.js');
  }
  return aiService;
}


// Meal suggestion endpoint
router.post('/suggest-meal', llmRateLimiter, async (req, res) => {
  try {
    const { 
      allergies, 
      dislikes, 
      goal, 
      additional_preferences,
      workout_type,
      meal_timing,
      current_weight,
      target_weight,
      activity_level
    } = req.body;
    
    if (!goal) {
      return res.status(400).json({ 
        success: false,
        error: 'Goal is required for meal suggestion.' 
      });
    }
    
    const service = await loadAiService();
    const response = await service.suggestMeal({ 
      allergies, 
      dislikes, 
      goal, 
      additional_preferences,
      workout_type,
      meal_timing,
      current_weight,
      target_weight,
      activity_level
    });
    
    res.json({
      success: true,
      data: response
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Meal suggestion failed.' 
    });
    console.log(err);
  }
});

// Full day meal plan endpoint
router.post('/meal-plan', llmRateLimiter, async (req, res) => {
  try {
    const {
      goal,
      current_weight,
      target_weight,
      activity_level,
      workout_days_per_week,
      workout_type,
      allergies,
      dislikes,
      daily_calories_target
    } = req.body;
    
    if (!goal) {
      return res.status(400).json({ 
        success: false,
        error: 'Goal is required for meal planning.' 
      });
    }
    
    const service = await loadAiService();
    const response = await service.createMealPlan({
      goal,
      current_weight,
      target_weight,
      activity_level,
      workout_days_per_week,
      workout_type,
      allergies,
      dislikes,
      daily_calories_target
    });
    
    res.json({
      success: true,
      data: response
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Meal plan creation failed.' 
    });
    console.log(err);
  }
});

// General prompt endpoint
router.post('/query', llmRateLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ 
        success: false,
        error: 'Prompt is required.' 
      });
    }
    
    const service = await loadAiService();
    const response = await service.processPrompt(prompt);
    res.json({ 
      success: true,
      data: response 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'LLM query failed.' 
    });
    console.log(err);
  }
});


module.exports = router;
