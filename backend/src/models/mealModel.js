import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  ingredients: [{ type: String, required: true }],
  instructions: [{ type: String, required: true }],
  nutritional_info: {
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbohydrates: { type: Number, required: true },
    fat: { type: Number, required: true },
    fiber: { type: Number, default: 0 }
  },
  user_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("FavouriteMeal", mealSchema);
