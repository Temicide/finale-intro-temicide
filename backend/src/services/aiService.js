import https from "https";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_HOST = 'generativelanguage.googleapis.com';
const GEMINI_API_PATH = `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Utility: Parse Gemini JSON output
function parseGeminiJson(raw) {
  let cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (err) {
      return { error: 'Failed to parse JSON', raw };
    }
  }
  return { error: 'No JSON found', raw };
}

// Core Gemini API query
async function queryLLM(prompt) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not found.');

  const postData = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

  const options = {
    hostname: GEMINI_API_HOST,
    path: GEMINI_API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(result);
          if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            resolve(result.candidates[0].content.parts[0].text);
          } else {
            reject(new Error('Invalid response from Gemini API'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Gemini response: ' + err.message));
        }
      });
    });
    req.on('error', err => reject(new Error('Failed to query Gemini: ' + err.message)));
    req.write(postData);
    req.end();
  });
}

// Optimized full-day meal plan
export async function createMealPlan({
  goal,
  current_weight,
  target_weight,
  activity_level = "moderate",
  workout_days_per_week = 3,
  workout_type = "general",
  allergies = [],
  dislikes = [],
  daily_calories_target,
  protein_target,
  fat_target,
  additional_preferences = "",
  favorite_foods = []
}) {
  if (!goal) throw new Error('Fitness goal is required.');

  const prompt = `
You are a fitness and nutrition AI coach. Create a **full-day meal plan** for a user.

FITNESS PROFILE:
- Goal: ${goal}
- Current Weight: ${current_weight || 'not specified'} kg
- Target Weight: ${target_weight || 'not specified'} kg
- Activity Level: ${activity_level}
- Workout Frequency: ${workout_days_per_week} days/week
- Workout Type: ${workout_type}
- Daily Calorie Target: ${daily_calories_target || 'calculate based on profile'}
- Macro Targets: Protein ${protein_target || 'calculate'}g, Fat ${fat_target || 'calculate'}g

DIETARY RESTRICTIONS:
- Allergies: ${allergies.join(", ") || 'none'}
- Dislikes: ${dislikes.join(", ") || 'none'}
- Additional Preferences: ${additional_preferences || 'none'}
- Favorite Foods: ${favorite_foods.join(", ") || 'none'}

Instructions:
1. Provide Breakfast, Lunch, Dinner, and optional Snacks.
2. Optimize for calories, macros, and meal timing.
3. Use realistic, home-cookable ingredients.
4. Include step-by-step instructions.
5. Friendly, motivating language.
6. Return structured JSON for frontend rendering.
7. Ensure food suggestions are familiar and culturally relevant if a country is mentioned in additional preferences.

JSON format:
{
  "daily_meal_plan": {
    "title": "Personalized Daily Meal Plan",
    "introduction": "Friendly intro",
    "total_calories": estimated daily calories,
    "total_macros": {
      "protein": grams,
      "carbohydrates": grams,
      "fat": grams,
      "fiber": grams
    },
    "meals": [
      {
        "meal_type": "Breakfast",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      },
      {
        "meal_type": "Lunch",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      },
      {
        "meal_type": "Dinner",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      },
      {
        "meal_type": "Snack (Optional)",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      }
    ],
    "hydration_notes": "Recommended water intake",
    "supplement_suggestions": ["if any"],
    "notes": "Additional tips"
  }
}`;

  const response = await queryLLM(prompt);
  return parseGeminiJson(response);
}

// General chat with fitness context
export async function generateChatResponse(userMessage, conversationHistory = [], contextLimit = 4) {
  try {
    let prompt = `You are a fitness and nutrition AI coach. Provide practical, science-based advice.
Include meal planning, macros, workouts, and nutrition guidance.
Ask follow-up questions if needed.

`;
    if (conversationHistory.length) {
      prompt += "Recent conversation:\n";
      conversationHistory.slice(-contextLimit).forEach(msg => {
        prompt += `${msg.sender === 'human' ? 'User' : 'Coach'}: ${msg.text}\n`;
      });
      prompt += "\n";
    }

    prompt += `User: ${userMessage}\nCoach:`;
    const response = await queryLLM(prompt);
    return response.trim();
  } catch (err) {
    console.error('AI chat response error:', err);
    throw new Error('Failed to generate AI response');
  }
}

// Profile collection system
export function getProfileQuestion(step, currentProfile = {}) {
  const questions = [
    {
      id: 'goal',
      question: 'What is your fitness goal?',
      type: 'text',
      options: ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Specific Sport'],
      default: currentProfile.goal || 'General Fitness'
    },
    {
      id: 'current_weight',
      question: 'What is your current weight?',
      type: 'number',
      default: currentProfile.current_weight || ''
    },
    {
      id: 'target_weight',
      question: 'What is your target weight?',
      type: 'number',
      default: currentProfile.target_weight || ''
    },
    {
      id: 'activity_level',
      question: 'What is your activity level?',
      type: 'select',
      options: ['Sedentary (little or no exercise)', 'Lightly Active (light exercise/sports 1-3 days/week)', 'Moderately Active (moderate exercise/sports 3-5 days/week)', 'Very Active (hard exercise/sports 6-7 days a week)', 'Extra Active (very hard exercise/physical job & exercise 2x/day)'],
      default: currentProfile.activity_level || 'Moderately Active'
    },
    {
      id: 'workout_type',
      question: 'What type of workouts do you prefer?',
      type: 'select',
      options: ['Strength Training', 'Cardio', 'Yoga', 'Crossfit', 'Other'],
      default: currentProfile.workout_type || 'Strength Training'
    },
    {
      id: 'meal_timing',
      question: 'What is your preferred meal timing?',
      type: 'select',
      options: ['Before Workout', 'After Workout', 'Before Bed', 'Anytime'],
      default: currentProfile.meal_timing || 'Anytime'
    },
    {
      id: 'allergies',
      question: 'Do you have any dietary allergies?',
      type: 'multi-select',
      options: ['Dairy', 'Eggs', 'Peanuts', 'Tree Nuts', 'Shellfish', 'Soy', 'Wheat', 'Other'],
      default: currentProfile.allergies || []
    },
    {
      id: 'dislikes',
      question: 'Do you have any dietary dislikes?',
      type: 'multi-select',
      options: ['Meat', 'Fish', 'Dairy', 'Eggs', 'Soy', 'Wheat', 'Other'],
      default: currentProfile.dislikes || []
    },
    {
      id: 'additional_preferences',
      question: 'Do you have any additional preferences or restrictions?',
      type: 'text',
      default: currentProfile.additional_preferences || ''
    }
  ];
  return questions[step];
}

export function parseProfileAnswer(answer, field, currentProfile = {}) {
  if (field === 'goal') {
    return answer.toLowerCase();
  }
  if (field === 'current_weight') {
    return parseFloat(answer);
  }
  if (field === 'target_weight') {
    return parseFloat(answer);
  }
  if (field === 'activity_level') {
    const levels = ['sedentary', 'lightly active', 'moderately active', 'very active', 'extra active'];
    const lowerAnswer = answer.toLowerCase();
    for (const level of levels) {
      if (lowerAnswer.includes(level)) {
        return level;
      }
    }
    return 'moderately active'; // Default
  }
  if (field === 'workout_type') {
    const types = ['strength training', 'cardio', 'yoga', 'crossfit', 'other'];
    const lowerAnswer = answer.toLowerCase();
    for (const type of types) {
      if (lowerAnswer.includes(type)) {
        return type;
      }
    }
    return 'strength training'; // Default
  }
  if (field === 'meal_timing') {
    const timings = ['before workout', 'after workout', 'before bed', 'anytime'];
    const lowerAnswer = answer.toLowerCase();
    for (const timing of timings) {
      if (lowerAnswer.includes(timing)) {
        return timing;
      }
    }
    return 'anytime'; // Default
  }
  if (field === 'allergies') {
    return answer.map(item => item.toLowerCase());
  }
  if (field === 'dislikes') {
    return answer.map(item => item.toLowerCase());
  }
  if (field === 'additional_preferences') {
    return answer;
  }
  return answer; // Default for other fields
}

export function detectMealPlanIntent(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('meal plan') || lowerMessage.includes('meal') || lowerMessage.includes('food')) {
    return 'meal_plan';
  }
  return null;
}

// Advanced meal plan editing functions
export function detectEditIntent(message, currentMealPlan) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('update')) {
    return 'edit';
  }
  return null;
}

export async function editMealPlan(currentMealPlan, editInstruction, userProfile) {
  const prompt = `
You are a fitness and nutrition AI coach. You are given a current meal plan and an edit instruction.

CURRENT MEAL PLAN:
${JSON.stringify(currentMealPlan, null, 2)}

EDIT INSTRUCTION:
${editInstruction}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

Instructions:
1. Apply the edit instruction to the current meal plan.
2. Ensure the nutritional values are still within reasonable ranges for the user's goal.
3. Return the updated meal plan in JSON format.

JSON format:
{
  "updated_meal_plan": {
    "title": "Updated Daily Meal Plan",
    "introduction": "Friendly intro",
    "total_calories": estimated daily calories,
    "total_macros": {
      "protein": grams,
      "carbohydrates": grams,
      "fat": grams,
      "fiber": grams
    },
    "meals": [
      {
        "meal_type": "Breakfast",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      },
      {
        "meal_type": "Lunch",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      },
      {
        "meal_type": "Dinner",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      },
      {
        "meal_type": "Snack (Optional)",
        "name": "Meal name",
        "description": "Brief description",
        "ingredients": ["ingredient list with amounts"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "Recommended eating time"
      }
    ],
    "hydration_notes": "Recommended water intake",
    "supplement_suggestions": ["if any"],
    "notes": "Additional tips"
  }
}`;

  const response = await queryLLM(prompt);
  return parseGeminiJson(response);
}

export function generateEditSuggestions(mealPlan, userProfile) {
  const suggestions = [];
  // Example suggestions:
  // 1. Add a pre-workout snack
  // 2. Increase protein intake for muscle gain
  // 3. Adjust meal timing for better absorption
  // 4. Add a post-workout protein shake
  // 5. Reduce fat intake for weight loss
  // 6. Increase fiber intake for better digestion
  // 7. Add a bedtime snack for better sleep
  // 8. Adjust meal timing for better energy levels
  // 9. Add a morning protein smoothie
  // 10. Reduce carbohydrate intake for better fat burning

  // In a real application, this would be more sophisticated,
  // analyzing user's goals, activity, and current plan.
  // For now, we'll just return a few generic suggestions.
  suggestions.push('Add a pre-workout snack.');
  suggestions.push('Increase protein intake for muscle gain.');
  suggestions.push('Adjust meal timing for better absorption.');
  suggestions.push('Add a post-workout protein shake.');
  suggestions.push('Reduce fat intake for weight loss.');
  suggestions.push('Increase fiber intake for better digestion.');
  suggestions.push('Add a bedtime snack for better sleep.');
  suggestions.push('Adjust meal timing for better energy levels.');
  suggestions.push('Add a morning protein smoothie.');
  suggestions.push('Reduce carbohydrate intake for better fat burning.');

  return suggestions;
}

export { parseGeminiJson, queryLLM };
