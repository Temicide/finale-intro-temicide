import express from 'express';
import { llmRateLimiter } from '../utils/llm.js';
let aiService;
const router = express.Router();
async function loadAiService() {
  if (!aiService) {
    aiService = await import('../services/aiService.js');
  }
  return aiService;
}

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
      daily_calories_target,
      protein_target,
      fat_target,
      additional_preferences
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
      daily_calories_target,
      protein_target,
      fat_target,
      additional_preferences
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
    const response = await service.generateChatResponse(prompt);
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

export default router;
