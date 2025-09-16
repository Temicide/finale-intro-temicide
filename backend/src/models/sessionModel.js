import mongoose from "mongoose";

// Flexible content schema for different types of AI responses
const contentSchema = new mongoose.Schema({
  // For meal suggestions
  meal_suggestion: {
    name: String,
    description: String,
    ingredients: [String],
    instructions: [String],
    nutritional_info: {
      calories: Number,
      protein: Number,
      carbohydrates: Number,
      fat: Number,
      fiber: Number
    },
    fitness_benefits: [String],
    timing_notes: String
  },
  // For meal plans
  daily_meal_plan: {
    total_calories: Number,
    total_macros: {
      protein: Number,
      carbohydrates: Number,
      fat: Number,
      fiber: Number
    },
    meals: [{
      meal_type: String,
      name: String,
      description: String,
      ingredients: [String],
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      timing: String
    }],
    hydration_notes: String,
    supplement_suggestions: [String],
    notes: String
  }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["human", "ai"], required: true },
  text: { type: String },
  content_type: { 
    type: String, 
    enum: ["text", "meal_suggestion", "meal_plan", "recipe"], 
    default: "text" 
  },
  structured_content: contentSchema,
  createdAt: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sessionId: { type: String },
  title: { type: String, default: "New Chat" },
  session_type: { 
    type: String, 
    enum: ["chat", "meal_planning", "recipe_generation"], 
    default: "chat" 
  },
  // User profile for meal planning
  user_profile: {
    goal: { type: String, enum: ["weight_loss", "muscle_gain", "maintenance", "endurance"] },
    allergies: [String],
    dislikes: [String],
    meal_timing: { type: String, enum: ["pre_workout", "post_workout", "general", "rest_day"] },
    current_weight: Number,
    target_weight: Number,
    activity_level: { type: String, enum: ["sedentary", "light", "moderate", "active", "very_active"] },
    workout_type: { type: String, enum: ["strength", "cardio", "hiit", "sports", "general"] },
    workout_days_per_week: Number,
    collected: { type: Boolean, default: false },
    collection_step: { type: Number, default: 0 }
  },
  // Current session state
  chat_state: {
    mode: { type: String, enum: ["normal", "collecting_profile", "generating_meal_plan", "editing_meal_plan"], default: "normal" },
    current_meal_plan_id: String, // Reference to message with meal plan
    last_ai_question: String
  },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now }
});

sessionSchema.path("sessionId").validate(function (value) {
  if (!this.userId && !value) {
    throw new Error("Session must have either userId or sessionId");
  }
  return true;
});

export default mongoose.model("Session", sessionSchema);
