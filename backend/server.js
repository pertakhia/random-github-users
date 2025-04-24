
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

console.log(process.env.MONGO_URI);

let totalVisits = 0;
let onlineUsers = 0;
const STATISTICS_ID = 'global';

const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const dbName = 'memoryGame';

async function getStatisticsCollection() {
  const db = client.db(dbName);
  return db.collection('statistics');
}

async function initializeStats() {
  await client.connect();
  const collection = await getStatisticsCollection();
  const existing = await collection.findOne({ _id: STATISTICS_ID });

  if (!existing) {
    await collection.insertOne({ _id: STATISTICS_ID, totalVisits: 0 });
    totalVisits = 0;
  } else {
    totalVisits = existing.totalVisits || 0;
  }

  console.log('Loaded totalVisits from DB:', totalVisits);
}

initializeStats().catch(console.error);

app.get('/best-time', async (req, res) => {
  try {
    const db = client.db(dbName);
    const collection = db.collection('records');

    const best = await collection.findOne({}, { sort: { time: 1 } });
    res.json(best || { time: null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/best-time', async (req, res) => {
  const { time } = req.body;
  try {
    const db = client.db(dbName);
    const collection = db.collection('records');

    const best = await collection.findOne({}, { sort: { time: 1 } });
    if (!best || time < best.time) {
      await collection.deleteMany({});
      await collection.insertOne({ time });
    }

    res.json({ message: 'Time updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/enter', async (req, res) => {
  onlineUsers++;

  totalVisits++;
  try {
    const collection = await getStatisticsCollection();
    await collection.updateOne(
      { _id: STATISTICS_ID },
      { $set: { totalVisits } },
      { upsert: true }
    );
    res.json({ message: 'Entered', totalVisits, onlineUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update statistics' });
  }
});

app.post('/leave', (req, res) => {
  if (onlineUsers > 0) onlineUsers--;
  res.json({ message: 'Left', onlineUsers });
});

app.get('/stats', (req, res) => {
  res.json({ totalVisits, onlineUsers });
});

app.get("/", (req, res) => {
    res.send("Hello World!");
    }   
);

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
