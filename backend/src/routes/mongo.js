const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'test';

let client;
let db;

async function connectMongo() {
  if (!client) {
    client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db(DB_NAME);
  }
  return db;
}

async function getCollection() {
  const database = await connectMongo();
  return database.collection("favouriteMeals");
}

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
    const col = await getCollection();
    const docs = await col.find({user_id}).toArray();
    res.json({
      success: true,
      data: docs,
      count: docs.length
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
    // Validate meal suggestion structure first
    const data = req.body;
    const valid = (
      typeof data.name === 'string' &&
      typeof data.description === 'string' &&
      Array.isArray(data.ingredients) &&
      Array.isArray(data.instructions) &&
      typeof data.nutritional_info === 'object' &&
      typeof data.nutritional_info.calories === 'number' &&
      typeof data.nutritional_info.protein === 'number' &&
      typeof data.nutritional_info.carbohydrates === 'number' &&
      typeof data.nutritional_info.fat === 'number' &&
      typeof data.user_id === 'string'
    );
    
    if (!valid) {
      return res.status(400).json({ error: 'Invalid meal suggestion structure.' });
    }

    const col = await getCollection();
    const result = await col.insertOne(data);
    
    // Return structured response
    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: 'Meal added to favorites successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const col = await getCollection();
    const meal = await col.findOne({_id: new ObjectId(id)});
    
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
    const col = await getCollection();
    const { id } = req.params;
    const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: 'Meal updated successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const col = await getCollection();
    const { id } = req.params;
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found'
      });
    }
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: 'Meal deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

module.exports = router;
