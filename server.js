const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
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
app.use(express.json({ limit: '10mb' }));

let db;

async function initMongo() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB');
}

function getUsersCollection() {
  if (!db) {
    throw new Error('Database not initialized yet.');
  }
  return db.collection('users');
}

function getRoutinesCollection() {
  if (!db) {
    throw new Error('Database not initialized yet.');
  }
  return db.collection('routines');
}

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Valid email is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const users = getUsersCollection();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await users.findOne({ email: normalizedEmail });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Email is already registered.' });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await users.insertOne({
      email: normalizedEmail,
      name: name && typeof name === 'string' ? name.trim() : null,
      passwordHash,
      createdAt: now,
      lastLoginAt: now,
    });

    return res.json({
      success: true,
      user: {
        id: result.insertedId.toString(),
        email: normalizedEmail,
        name: name && typeof name === 'string' ? name.trim() : null,
      },
    });
  } catch (error) {
    console.error('Error in /api/signup:', error);
    if (error.message === 'Database not initialized yet.') {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Valid email is required.' });
    }

    if (!password || typeof password !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Password is required.' });
    }

    const users = getUsersCollection();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password.' });
    }

    const now = new Date();
    await users.updateOne(
      { _id: user._id },
      {
        $set: { lastLoginAt: now },
      }
    );

    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name || null,
      },
    });
  } catch (error) {
    console.error('Error in /api/login:', error);
    if (error.message === 'Database not initialized yet.') {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
  }
});

app.post('/api/routine', async (req, res) => {
  try {
    const { userId, routine } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required.' });
    }

    if (!routine || typeof routine !== 'object') {
      return res
        .status(400)
        .json({ success: false, message: 'Routine data is required.' });
    }

    const routines = getRoutinesCollection();
    const now = new Date();

    const doc = {
      userId,
      studyHours: routine.studyHours ?? '',
      sleepTime: routine.sleepTime ?? '',
      wakeTime: routine.wakeTime ?? '',
      sleepHours: routine.sleepHours ?? '',
      classesScheduleImage: routine.classesScheduleImage ?? null,
      hobbiesTime: routine.hobbiesTime ?? '',
      scrollHours: routine.scrollHours ?? '',
      updatedAt: now,
    };

    await routines.updateOne(
      { userId },
      { $set: doc },
      { upsert: true }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/routine:', error);
    if (error.message === 'Database not initialized yet.') {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
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
