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

async function getCollection(name) {
  const database = await connectMongo();
  return database.collection(name);
}

// GET /api/mongo/:collection - List all documents
router.get('/:collection', async (req, res) => {
  try {
    const col = await getCollection(req.params.collection);
    const docs = await col.find({}).toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mongo/:collection - Insert a document
router.post('/:collection', async (req, res) => {
  try {
    const col = await getCollection(req.params.collection);
    const result = await col.insertOne(req.body);
    res.json({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mongo/:collection/:id - Update a document by _id
router.put('/:collection/:id', async (req, res) => {
  try {
    const col = await getCollection(req.params.collection);
    const { id } = req.params;
    const result = await col.updateOne({ _id: ObjectId(id) }, { $set: req.body });
    res.json({ modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mongo/:collection/:id - Delete a document by _id
router.delete('/:collection/:id', async (req, res) => {
  try {
    const col = await getCollection(req.params.collection);
    const { id } = req.params;
    const result = await col.deleteOne({ _id: ObjectId(id) });
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
