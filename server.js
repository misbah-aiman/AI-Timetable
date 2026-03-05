const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'ai_timetable';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

let db;

async function initMongo() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB');
}

app.post('/api/login', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    if (!db) {
      return res.status(500).json({ success: false, message: 'Database not initialized yet.' });
    }

    const users = db.collection('users');

    const now = new Date();

    await users.updateOne(
      { email: email.toLowerCase().trim() },
      {
        $setOnInsert: { createdAt: now },
        $set: { lastLoginAt: now },
      },
      { upsert: true }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/login:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// In production, serve the React app (optional, for future use)
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

initMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize MongoDB:', err);
    process.exit(1);
  });

