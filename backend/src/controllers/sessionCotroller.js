import Session from "../models/sessionModel.js";
import crypto from "crypto";
import { 
  generateChatResponse, 
  getProfileQuestion, 
  parseProfileAnswer, 
  detectMealPlanIntent,
  createMealPlan,
  detectEditIntent,
  editMealPlan,
  generateEditSuggestions
} from "../services/aiService.js";

export const createSession = async (req, res) => {
  try {
    const { title, userId } = req.body;
    const sessionData = {
      title: title || "New Chat",
      messages: []
    };

    if (userId) sessionData.userId = userId;
    else sessionData.sessionId = crypto.randomUUID();

    const newSession = await Session.create(sessionData);
    res.status(201).json(newSession);
  } catch (err) {
    res.status(500).json({ message: "สร้าง session ไม่สำเร็จ", error: err.message });
  }
};

export const listSessions = async (req, res) => {
  try {
    const { userId, sessionId } = req.query;

    if (!userId && !sessionId)return res.status(400).json({ message: "ต้องส่ง userId หรือ sessionId" });
    

    const filter = userId ? { userId } : { sessionId };
    const sessions = await Session.find(filter).sort({ createdAt: -1 });

    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({ message: "ดึงรายการ session ไม่สำเร็จ", error: err.message });
  }
};

export const getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: "ไม่พบ session" });

    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

export const addMessage = async (req, res) => {
  try {
    const { id } = req.params; 
    const { sender, text, content_type = "text" } = req.body;

    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: "ไม่พบ session" });

    // Initialize chat_state and user_profile if not exists
    if (!session.chat_state) {
      session.chat_state = { mode: "normal" };
    }
    if (!session.user_profile) {
      session.user_profile = { collected: false, collection_step: 0 };
    }

    // Add user message
    session.messages.push({ 
      sender, 
      text, 
      content_type: content_type || "text" 
    });

    if (sender === "human") {
      try {
        let aiResponse;
        let responseContentType = "text";
        let structuredContent = null;

        // 1. Handle profile collection mode
        if (session.chat_state.mode === "collecting_profile") {
          const result = await handleProfileCollection(session, text);
          aiResponse = result.response;
          
          if (result.completed) {
            // Generate meal plan automatically when profile is complete
            const mealPlan = await generateMealPlanFromProfile(session.user_profile);
            structuredContent = { daily_meal_plan: mealPlan.daily_meal_plan };
            responseContentType = "meal_plan";
            session.chat_state.mode = "normal";
            session.chat_state.current_meal_plan_id = session.messages.length + 1; // Next message index
          }
          
        } else {
          // 2. Detect intent in normal chat
          const intent = detectMealPlanIntent(text);
          
          if (intent.wantsMealPlan && !session.user_profile.collected) {
            // Start profile collection
            session.chat_state.mode = "collecting_profile";
            session.user_profile.collection_step = 0;
            const questionData = getProfileQuestion(0);
            aiResponse = formatProfileQuestion(questionData);
            session.chat_state.last_ai_question = questionData.field;
            
          } else if (intent.wantsMealPlan && session.user_profile.collected) {
            // Generate meal plan with existing profile
            const mealPlan = await generateMealPlanFromProfile(session.user_profile);
            structuredContent = { daily_meal_plan: mealPlan.daily_meal_plan };
            responseContentType = "meal_plan";
            aiResponse = `Based on your profile, I've created a new meal plan with ${mealPlan.daily_meal_plan?.meals?.length || 0} meals!`;
            session.chat_state.current_meal_plan_id = session.messages.length + 1;
            
            // Add improvement suggestions
            const suggestions = generateEditSuggestions(mealPlan, session.user_profile);
            if (suggestions.length > 0) {
              aiResponse += "\n\n" + suggestions.slice(0, 2).join("\n");
            }
            
          } else if (intent.wantsEdit && session.chat_state.current_meal_plan_id) {
            // Edit existing meal plan
            const result = await handleMealPlanEdit(session, text);
            aiResponse = result.response;
            if (result.updatedPlan) {
              structuredContent = { daily_meal_plan: result.updatedPlan.daily_meal_plan };
              responseContentType = "meal_plan";
            }
            
          } else {
            // Regular chat
            const contextMessages = session.messages.slice(-4, -1);
            aiResponse = await generateChatResponse(text, contextMessages, 3);
          }
        }

        session.messages.push({ 
          sender: "ai", 
          text: aiResponse,
          content_type: responseContentType,
          structured_content: structuredContent
        });

      } catch (error) {
        console.error('AI response error:', error);
        session.messages.push({ 
          sender: "ai", 
          text: "ขออภัย เกิดข้อผิดพลาดในการตอบกลับ กรุณาลองใหม่อีกครั้ง",
          content_type: "text"
        });
      }
    }

    await session.save();
    
    res.status(200).json({
      success: true,
      data: session.messages.slice(-10),
      total_messages: session.messages.length,
      chat_state: session.chat_state,
      profile_completed: session.user_profile?.collected || false
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "เพิ่มข้อความไม่สำเร็จ", 
      error: err.message 
    });
  }
};

// Profile collection helper functions
async function handleProfileCollection(session, userAnswer) {
  const currentStep = session.user_profile.collection_step;
  const questionData = getProfileQuestion(currentStep);
  
  if (!questionData.field) {
    // Collection complete
    session.user_profile.collected = true;
    session.chat_state.mode = "generating_meal_plan";
    return {
      response: "Perfect! I have all the information I need. Let me create your personalized meal plan...",
      completed: true
    };
  }

  // Parse the user's answer
  const parsedAnswer = parseProfileAnswer(userAnswer, questionData.field, session.user_profile);
  
  // Update profile with parsed answer
  if (questionData.field === "weight") {
    session.user_profile.current_weight = parsedAnswer.current_weight;
    session.user_profile.target_weight = parsedAnswer.target_weight;
  } else if (questionData.field === "workout_days") {
    session.user_profile.workout_days_per_week = parsedAnswer;
  } else {
    session.user_profile[questionData.field] = parsedAnswer;
  }

  // Move to next question
  session.user_profile.collection_step = currentStep + 1;
  const nextQuestion = getProfileQuestion(session.user_profile.collection_step);
  
  if (nextQuestion.completed) {
    session.user_profile.collected = true;
    return {
      response: nextQuestion.question,
      completed: true
    };
  }

  session.chat_state.last_ai_question = nextQuestion.field;
  return {
    response: formatProfileQuestion(nextQuestion),
    completed: false
  };
}

function formatProfileQuestion(questionData) {
  let response = `**Question ${questionData.step}/${questionData.total}**\n\n${questionData.question}`;
  
  if (questionData.options) {
    response += "\n\n**Options:**\n" + questionData.options.map(opt => `• ${opt}`).join("\n");
  }
  
  if (questionData.hint) {
    response += `\n\n*${questionData.hint}*`;
  }
  
  return response;
}

async function generateMealPlanFromProfile(profile) {
  const mealPlanParams = {
    goal: profile.goal,
    current_weight: profile.current_weight,
    target_weight: profile.target_weight,
    activity_level: profile.activity_level,
    workout_days_per_week: profile.workout_days_per_week,
    workout_type: profile.workout_type,
    allergies: profile.allergies || [],
    dislikes: profile.dislikes || []
  };
  
  return await createMealPlan(mealPlanParams);
}

async function handleMealPlanEdit(session, editInstruction) {
  try {
    // Find the current meal plan in messages
    const mealPlanMessageIndex = session.chat_state.current_meal_plan_id - 1;
    const mealPlanMessage = session.messages[mealPlanMessageIndex];
    
    if (!mealPlanMessage || !mealPlanMessage.structured_content?.daily_meal_plan) {
      return {
        response: "I don't see a current meal plan to edit. Would you like me to create a new one?",
        updatedPlan: null
      };
    }

    const currentPlan = mealPlanMessage.structured_content;
    const editIntent = detectEditIntent(editInstruction, currentPlan);
    
    // Generate contextual response based on edit intent
    let progressResponse = "";
    if (editIntent.editType === "replace_ingredient") {
      progressResponse = `I'll replace ${editIntent.targetIngredient || "that ingredient"} in your ${editIntent.targetMeal || "meal"}...`;
    } else if (editIntent.editType === "adjust_portion") {
      progressResponse = `I'll adjust the portion sizes for your ${editIntent.targetMeal || "meals"}...`;
    } else if (editIntent.editType === "change_meal") {
      progressResponse = `I'll create a different ${editIntent.targetMeal || "meal"} option for you...`;
    } else {
      progressResponse = "Let me modify your meal plan based on your feedback...";
    }

    // Edit the meal plan using AI
    const updatedPlan = await editMealPlan(currentPlan, editInstruction, session.user_profile);
    
    // Update the original message with the new plan
    session.messages[mealPlanMessageIndex].structured_content = updatedPlan;
    
    // Generate summary of changes
    const changesSummary = generateChangesSummary(currentPlan, updatedPlan, editIntent);
    
    return {
      response: `${progressResponse}\n\n✅ **Updated!**\n${changesSummary}`,
      updatedPlan: updatedPlan
    };
    
  } catch (error) {
    console.error('Meal plan edit error:', error);
    return {
      response: "I had trouble modifying your meal plan. Could you try rephrasing your request?",
      updatedPlan: null
    };
  }
}

function generateChangesSummary(oldPlan, newPlan, editIntent) {
  const changes = [];
  
  if (oldPlan.daily_meal_plan && newPlan.daily_meal_plan) {
    const oldCalories = oldPlan.daily_meal_plan.total_calories;
    const newCalories = newPlan.daily_meal_plan.total_calories;
    
    if (Math.abs(oldCalories - newCalories) > 50) {
      const direction = newCalories > oldCalories ? "increased" : "decreased";
      changes.push(`📊 Total calories ${direction} from ${oldCalories} to ${newCalories}`);
    }
    
    if (editIntent.targetMeal) {
      changes.push(`🍽️ Modified your ${editIntent.targetMeal}`);
    }
    
    if (editIntent.targetIngredient) {
      changes.push(`🔄 Replaced ${editIntent.targetIngredient} as requested`);
    }
  }
  
  if (changes.length === 0) {
    changes.push("🔧 Made adjustments to better fit your preferences");
  }
  
  return changes.join("\n");
}

// Get meal plan editing suggestions
export const getMealPlanSuggestions = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: "Session not found" 
      });
    }

    if (!session.user_profile?.collected) {
      return res.status(400).json({
        success: false,
        message: "User profile not complete"
      });
    }

    // Find current meal plan
    const mealPlanMessageIndex = session.chat_state?.current_meal_plan_id - 1;
    const mealPlanMessage = session.messages[mealPlanMessageIndex];
    
    if (!mealPlanMessage?.structured_content?.daily_meal_plan) {
      return res.status(404).json({
        success: false,
        message: "No active meal plan found"
      });
    }

    const suggestions = generateEditSuggestions(
      mealPlanMessage.structured_content, 
      session.user_profile
    );

    res.json({
      success: true,
      data: {
        suggestions,
        current_plan_calories: mealPlanMessage.structured_content.daily_meal_plan.total_calories,
        user_goal: session.user_profile.goal
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to get suggestions",
      error: err.message
    });
  }
};
