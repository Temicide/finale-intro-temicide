import express from "express";
import FavouriteMeal from "../models/mealModel.js";

const router = express.Router();

// GET /api/mongo/favoriteMeals - List all documents
router.get('/', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id query parameter is required.' 
      });
    }
    
    const meals = await FavouriteMeal.find({ user_id }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: meals,
      count: meals.length
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// POST /api/mongo/favoriteMeals - Insert a document
router.post('/', async (req, res) => {
  try {
    const mealData = req.body;
    
    // Create new meal using Mongoose model (validation handled by schema)
    const newMeal = new FavouriteMeal(mealData);
    const savedMeal = await newMeal.save();
    
    res.status(201).json({
      success: true,
      data: savedMeal,
      message: 'Meal added to favorites successfully'
    });
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid meal data',
        details: err.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await FavouriteMeal.findById(id);
    
    if (!meal) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    res.json({
      success: true,
      data: meal
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMeal = await FavouriteMeal.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updatedMeal) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedMeal,
      message: 'Meal updated successfully'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid meal data',
        details: err.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMeal = await FavouriteMeal.findByIdAndDelete(id);
    
    if (!deletedMeal) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    res.json({
      success: true,
      data: deletedMeal,
      message: 'Meal deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

export default router;
