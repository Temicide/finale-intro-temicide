import https from "https";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_HOST = 'generativelanguage.googleapis.com';
const GEMINI_API_PATH = `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Parse Gemini JSON output, handling markdown/code block wrappers
function parseGeminiJson(raw) {
  // Remove markdown code block markers and trim
  let cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  // Try to find the first JSON object in the string
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (err) {
      // If parsing fails, return the raw string
      return { error: 'Failed to parse JSON', raw };
    }
  }
  return { error: 'No JSON found', raw };
}

// Core LLM query function
async function queryLLM(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not found in environment variables.');
  }
  
  const postData = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  });

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
          if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
            resolve(result.candidates[0].content.parts[0].text);
          } else {
            console.log('Unexpected Gemini response:', result);
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

// Generate AI response for fitness/nutrition chat with limited context
export async function generateChatResponse(userMessage, conversationHistory = [], contextLimit = 4) {
  try {
    let prompt = `You are a specialized AI fitness and nutrition coach. You help people with:
- Meal planning for different workout goals (muscle gain, weight loss, endurance)
- Pre and post-workout nutrition advice
- Macro calculations and meal timing
- Healthy recipe suggestions for active people
- Supplement guidance
- Hydration and recovery nutrition

Always provide practical, science-based advice. Ask follow-up questions when you need more details about their fitness goals, workout routine, or dietary preferences.

`;
    
    // Add only recent conversation history for context (limit to reduce tokens)
    if (conversationHistory.length > 0) {
      prompt += "Recent conversation:\n";
      conversationHistory.slice(-contextLimit).forEach(msg => {
        prompt += `${msg.sender === 'human' ? 'User' : 'Coach'}: ${msg.text}\n`;
      });
      prompt += "\n";
    }
    
    prompt += `User: ${userMessage}\nCoach:`;
    
    const response = await queryLLM(prompt);
    return response.trim();
  } catch (error) {
    console.error('AI chat response error:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Fitness-focused meal planning
export async function suggestMeal({ 
  allergies, 
  dislikes, 
  goal, 
  additional_preferences, 
  workout_type, 
  meal_timing, 
  current_weight, 
  target_weight,
  activity_level 
}) {
  if (!goal) {
    throw new Error('Fitness goal is required.');
  }
  
  let prompt = `As a fitness nutrition expert, suggest a meal for an active person with the following profile:

FITNESS PROFILE:
- Goal: ${goal} (muscle gain/weight loss/endurance/strength/maintenance)
- Current Weight: ${current_weight || 'not specified'} kg
- Target Weight: ${target_weight || 'not specified'} kg
- Activity Level: ${activity_level || 'moderate'} (sedentary/light/moderate/active/very active)
- Workout Type: ${workout_type || 'general fitness'} (strength training/cardio/HIIT/sports)
- Meal Timing: ${meal_timing || 'general'} (pre-workout/post-workout/general/rest day)

DIETARY RESTRICTIONS:
`;
  
  if (allergies && allergies.length) prompt += `- Allergies: ${allergies.join(', ')}\n`;
  if (dislikes && dislikes.length) prompt += `- Dislikes: ${dislikes.join(', ')}\n`;
  if (additional_preferences) prompt += `- Additional preferences: ${additional_preferences}\n`;
  
  prompt += `
Please provide a meal that optimizes nutrition for their fitness goals, considering:
- Proper macro balance (protein/carbs/fats) for their goal
- Meal timing benefits (if specified)
- Calorie density appropriate for their goal
- Micronutrients important for recovery and performance

Generate Output in this specific JSON format: {
  "meal_suggestion": {
    "name": "name of the dish",
    "description": "why this meal fits their fitness goal and timing",
    "ingredients": [
      "list of ingredients with approximate amounts"
    ],
    "instructions": [
      "step-by-step preparation instructions"
    ],
    "nutritional_info": {
      "calories": estimated total calories,
      "protein": estimated grams of protein,
      "carbohydrates": estimated grams of carbohydrates,
      "fat": estimated grams of fat,
      "fiber": estimated grams of fiber
    },
    "fitness_benefits": [
      "specific benefits for their workout goal"
    ],
    "timing_notes": "when to eat this meal relative to workouts (if applicable)"
  }
}`;
  
  const response = await queryLLM(prompt);
  return parseGeminiJson(response);
}

// Create a full day meal plan for workout people
export async function createMealPlan({
  goal,
  current_weight,
  target_weight,
  activity_level,
  workout_days_per_week,
  workout_type,
  allergies,
  dislikes,
  daily_calories_target
}) {
  if (!goal) {
    throw new Error('Fitness goal is required for meal planning.');
  }

  let prompt = `As a fitness nutrition expert, create a complete daily meal plan for:

FITNESS PROFILE:
- Goal: ${goal}
- Current Weight: ${current_weight || 'not specified'} kg
- Target Weight: ${target_weight || 'not specified'} kg
- Activity Level: ${activity_level || 'moderate'}
- Workout Frequency: ${workout_days_per_week || '3-4'} days per week
- Workout Type: ${workout_type || 'general fitness'}
- Daily Calorie Target: ${daily_calories_target || 'calculate based on profile'} kcal

DIETARY RESTRICTIONS:
`;

  if (allergies && allergies.length) prompt += `- Allergies: ${allergies.join(', ')}\n`;
  if (dislikes && dislikes.length) prompt += `- Dislikes: ${dislikes.join(', ')}\n`;

  prompt += `
Create a balanced daily meal plan with proper macro distribution, meal timing, and portions. Consider pre/post workout nutrition.

Generate Output in this specific JSON format: {
  "daily_meal_plan": {
    "total_calories": estimated daily calories,
    "total_macros": {
      "protein": total daily protein in grams,
      "carbohydrates": total daily carbs in grams,
      "fat": total daily fat in grams,
      "fiber": total daily fiber in grams
    },
    "meals": [
      {
        "meal_type": "breakfast/lunch/dinner/snack/pre-workout/post-workout",
        "name": "meal name",
        "description": "brief description",
        "ingredients": ["ingredient list"],
        "calories": meal calories,
        "protein": grams,
        "carbs": grams,
        "fat": grams,
        "timing": "recommended time to eat"
      }
    ],
    "hydration_notes": "daily water intake recommendations",
    "supplement_suggestions": ["if any basic supplements are recommended"],
    "notes": "additional tips for this meal plan"
  }
}`;

  const response = await queryLLM(prompt);
  return parseGeminiJson(response);
}

// General fitness-focused prompt function
export async function processPrompt(prompt) {
  try {
    // Add fitness context to general prompts
    const fitnessPrompt = `You are a fitness and nutrition expert AI. When answering questions, always consider the fitness and health perspective. If the question is about food, nutrition, exercise, or health, provide detailed, science-based advice.

User question: ${prompt}

Your expert response:`;
    
    const response = await queryLLM(fitnessPrompt);
    return response;
  } catch (error) {
    console.error('AI prompt processing error:', error);
    throw new Error('Failed to process prompt');
  }
}

// Profile collection system
export function getProfileQuestion(step, currentProfile = {}) {
  const questions = [
    {
      question: "Hi! I'd love to help you with meal planning. What's your main fitness goal?",
      options: ["🏃 Weight Loss", "💪 Muscle Gain", "⚖️ Maintenance", "🏃‍♂️ Endurance"],
      field: "goal"
    },
    {
      question: "Do you have any food allergies I should know about?",
      hint: "Type 'none' if no allergies, or list them (e.g., 'nuts, dairy, shellfish')",
      field: "allergies"
    },
    {
      question: "Any foods you dislike or want to avoid?",
      hint: "Type 'none' if no dislikes, or list them (e.g., 'broccoli, fish, spicy food')",
      field: "dislikes"
    },
    {
      question: "What's your current weight and target weight?",
      hint: "Format: 'current kg, target kg' (e.g., '70, 65')",
      field: "weight"
    },
    {
      question: "How active are you?",
      options: ["😴 Sedentary", "🚶 Light Activity", "🏃 Moderate", "💪 Active", "🔥 Very Active"],
      field: "activity_level"
    },
    {
      question: "What type of workouts do you do?",
      options: ["🏋️ Strength Training", "🏃 Cardio", "⚡ HIIT", "⚽ Sports", "🏃‍♀️ General Fitness"],
      field: "workout_type"
    },
    {
      question: "How many days per week do you work out?",
      hint: "Enter a number (e.g., '3' or '5')",
      field: "workout_days"
    },
    {
      question: "When do you typically want meal suggestions?",
      options: ["🌅 Pre-workout", "💪 Post-workout", "🍽️ General meals", "😴 Rest days"],
      field: "meal_timing"
    }
  ];

  if (step >= questions.length) {
    return {
      question: "Perfect! I have all the information I need. Let me create your personalized meal plan...",
      completed: true
    };
  }

  return { ...questions[step], step: step + 1, total: questions.length };
}

export function parseProfileAnswer(answer, field, currentProfile = {}) {
  const cleanAnswer = answer.toLowerCase().trim();
  
  switch (field) {
    case "goal":
      if (cleanAnswer.includes("weight") || cleanAnswer.includes("loss") || cleanAnswer.includes("lose")) return "weight_loss";
      if (cleanAnswer.includes("muscle") || cleanAnswer.includes("gain") || cleanAnswer.includes("build")) return "muscle_gain";
      if (cleanAnswer.includes("endurance") || cleanAnswer.includes("stamina")) return "endurance";
      return "maintenance";
      
    case "allergies":
    case "dislikes":
      if (cleanAnswer === "none" || cleanAnswer === "no" || cleanAnswer === "nothing") return [];
      return cleanAnswer.split(",").map(item => item.trim()).filter(item => item.length > 0);
      
    case "weight":
      const weights = cleanAnswer.match(/(\d+)/g);
      if (weights && weights.length >= 2) {
        return { current_weight: parseInt(weights[0]), target_weight: parseInt(weights[1]) };
      }
      return { current_weight: null, target_weight: null };
      
    case "activity_level":
      if (cleanAnswer.includes("sedentary") || cleanAnswer.includes("desk")) return "sedentary";
      if (cleanAnswer.includes("light")) return "light";
      if (cleanAnswer.includes("moderate")) return "moderate";
      if (cleanAnswer.includes("very") || cleanAnswer.includes("intense")) return "very_active";
      return "active";
      
    case "workout_type":
      if (cleanAnswer.includes("strength") || cleanAnswer.includes("weight") || cleanAnswer.includes("lift")) return "strength";
      if (cleanAnswer.includes("cardio") || cleanAnswer.includes("running") || cleanAnswer.includes("cycling")) return "cardio";
      if (cleanAnswer.includes("hiit") || cleanAnswer.includes("interval")) return "hiit";
      if (cleanAnswer.includes("sport") || cleanAnswer.includes("basketball") || cleanAnswer.includes("football")) return "sports";
      return "general";
      
    case "workout_days":
      const days = cleanAnswer.match(/(\d+)/);
      return days ? parseInt(days[0]) : 3;
      
    case "meal_timing":
      if (cleanAnswer.includes("pre") || cleanAnswer.includes("before")) return "pre_workout";
      if (cleanAnswer.includes("post") || cleanAnswer.includes("after")) return "post_workout";
      if (cleanAnswer.includes("rest")) return "rest_day";
      return "general";
      
    default:
      return answer;
  }
}

export function detectMealPlanIntent(message) {
  const msg = message.toLowerCase();
  const mealPlanKeywords = ["meal plan", "diet plan", "nutrition plan", "food plan", "meal planning", "weekly plan"];
  const editKeywords = ["edit", "change", "modify", "update", "fix", "adjust", "replace", "swap", "substitute"];
  
  return {
    wantsMealPlan: mealPlanKeywords.some(keyword => msg.includes(keyword)),
    wantsEdit: editKeywords.some(keyword => msg.includes(keyword)),
    isQuestion: msg.includes("?")
  };
}

// Advanced meal plan editing functions
export function detectEditIntent(message, currentMealPlan) {
  const msg = message.toLowerCase();
  
  // Detect what they want to edit
  const mealTypes = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];
  const editTypes = {
    replace_ingredient: ["replace", "swap", "substitute", "change"],
    adjust_portion: ["more", "less", "bigger", "smaller", "increase", "decrease"],
    remove_meal: ["remove", "delete", "skip"],
    change_meal: ["different", "another", "new"],
    fix_nutrition: ["too many calories", "too much", "too little", "reduce", "add more"]
  };
  
  const detected = {
    editType: null,
    targetMeal: null,
    targetIngredient: null,
    instruction: message
  };
  
  // Find target meal
  detected.targetMeal = mealTypes.find(meal => msg.includes(meal));
  
  // Find edit type
  for (const [type, keywords] of Object.entries(editTypes)) {
    if (keywords.some(keyword => msg.includes(keyword))) {
      detected.editType = type;
      break;
    }
  }
  
  // Find target ingredient (simple detection)
  const commonIngredients = ["chicken", "beef", "fish", "salmon", "eggs", "rice", "pasta", "bread", "banana", "apple"];
  detected.targetIngredient = commonIngredients.find(ingredient => msg.includes(ingredient));
  
  return detected;
}

export async function editMealPlan(currentMealPlan, editInstruction, userProfile) {
  const editIntent = detectEditIntent(editInstruction);
  
  let prompt = `You are a nutrition expert. I need you to modify an existing meal plan based on user feedback.

CURRENT MEAL PLAN:
${JSON.stringify(currentMealPlan, null, 2)}

USER PROFILE:
- Goal: ${userProfile.goal}
- Weight: ${userProfile.current_weight}kg → ${userProfile.target_weight}kg
- Activity: ${userProfile.activity_level}
- Allergies: ${userProfile.allergies?.join(", ") || "none"}
- Dislikes: ${userProfile.dislikes?.join(", ") || "none"}

USER REQUEST: "${editInstruction}"

Please modify the meal plan according to the user's request while:
1. Maintaining nutritional balance for their goal
2. Keeping total daily calories appropriate
3. Respecting allergies and dislikes
4. Making minimal changes (only what was requested)

Return the COMPLETE modified meal plan in the same JSON format as the original.`;

  const response = await queryLLM(prompt);
  return parseGeminiJson(response);
}

export function generateEditSuggestions(mealPlan, userProfile) {
  const suggestions = [];
  
  // Analyze current plan for potential improvements
  if (mealPlan.daily_meal_plan) {
    const plan = mealPlan.daily_meal_plan;
    
    // Calorie suggestions
    if (userProfile.goal === "weight_loss" && plan.total_calories > 1800) {
      suggestions.push("💡 Your plan has " + plan.total_calories + " calories. Would you like me to reduce portions for faster weight loss?");
    }
    
    if (userProfile.goal === "muscle_gain" && plan.total_calories < 2200) {
      suggestions.push("💡 For muscle gain, you might want more calories. Should I add a protein shake or extra snack?");
    }
    
    // Protein suggestions
    if (plan.total_macros?.protein < 100) {
      suggestions.push("💡 Your protein is a bit low. Want me to add more protein-rich foods?");
    }
    
    // Meal timing suggestions
    if (userProfile.workout_type === "strength" && !plan.meals?.some(meal => meal.meal_type === "post-workout")) {
      suggestions.push("💡 As a strength trainer, would you like me to add a dedicated post-workout meal?");
    }
  }
  
  return suggestions;
}

export { parseGeminiJson };
