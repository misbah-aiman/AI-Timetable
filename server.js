const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/** Prefer OPENAI_API_KEY; also accept REACT_APP_AI_API_KEY so one `.env` works with older CRA-style names. */
function getOpenAIApiKey() {
  const k = process.env.OPENAI_API_KEY || process.env.REACT_APP_AI_API_KEY;
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : '';
}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'AI_timetable';

if (!MONGODB_URI) {
  console.warn(
    'MONGODB_URI not set — Mongo-backed routes (/api/signup, etc.) return 503. AI route still works if OPENAI_API_KEY is set.'
  );
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let db;

async function initMongo() {
  if (!MONGODB_URI) {
    return;
  }
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error(
      'MongoDB connection failed — account APIs disabled. AI timetable still works if OPENAI_API_KEY is set.',
      err.message || err
    );
  }
}

function ensureDb(res) {
  if (!db) {
    res.status(503).json({
      success: false,
      message:
        'Database not configured. Set MONGODB_URI in .env if you need account APIs.',
    });
    return false;
  }
  return true;
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

function sendMongoConnectionError(res, error) {
  const msg = String(error?.message || '');
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('MongoNetwork') ||
    msg.includes('MongoServerSelection')
  ) {
    return res.status(500).json({
      success: false,
      message:
        'Cannot connect to MongoDB. Start MongoDB and check MONGODB_URI in your .env file.',
    });
  }
  return null;
}

app.post('/api/signup', async (req, res) => {
  try {
    if (!ensureDb(res)) return;
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
    const mongoErr = sendMongoConnectionError(res, error);
    if (mongoErr) return mongoErr;
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    if (!ensureDb(res)) return;
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
    const mongoErr = sendMongoConnectionError(res, error);
    if (mongoErr) return mongoErr;
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
  }
});

app.get('/api/routine/:userId', async (req, res) => {
  try {
    if (!ensureDb(res)) return;
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required.' });
    }

    const routines = getRoutinesCollection();
    const routine = await routines.findOne({ userId });

    if (!routine) {
      return res
        .status(404)
        .json({ success: false, message: 'Routine not found.' });
    }

    return res.json({
      success: true,
      routine: {
        studyHours: routine.studyHours ?? '',
        sleepTime: routine.sleepTime ?? '',
        wakeTime: routine.wakeTime ?? '',
        sleepHours: routine.sleepHours ?? '',
        classesScheduleImage: routine.classesScheduleImage ?? null,
        hobbiesTime: routine.hobbiesTime ?? '',
        scrollHours: routine.scrollHours ?? '',
        freeTime: routine.freeTime ?? '',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/routine/:userId:', error);
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
    if (!ensureDb(res)) return;
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
      freeTime: routine.freeTime ?? '',
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

app.delete('/api/account/:userId', async (req, res) => {
  try {
    if (!ensureDb(res)) return;
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'User ID is required.' });
    }

    const users = getUsersCollection();
    const routines = getRoutinesCollection();

    // Delete user account
    const { ObjectId } = require('mongodb');
    let userObjectId;
    try {
      userObjectId = new ObjectId(userId);
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid user ID format.' });
    }

    const userResult = await users.deleteOne({ _id: userObjectId });

    if (userResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found.' });
    }

    // Delete associated routine
    await routines.deleteOne({ userId });

    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/account/:userId:', error);
    if (error.message === 'Database not initialized yet.') {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
  }
});

function routineForPrompt(r) {
  const copy = { ...r };
  if (
    copy.classesScheduleImage &&
    typeof copy.classesScheduleImage === 'string' &&
    copy.classesScheduleImage.length > 120
  ) {
    copy.classesScheduleImage =
      '[user uploaded a class schedule image — infer typical class hours if needed]';
  }
  return JSON.stringify(copy);
}

function buildDailyPlanPromptBody(routine, date, dayName) {
  return `You are building ONE concrete day schedule (a real timetable), not a summary of the user's goals.

Return JSON with keys:
- analysis (string): 2–4 sentences on how today's timed schedule fits their sleep, study goals, scroll limits, hobbies, and free time.
- blocks (array): REQUIRED — at least 8 chronological items. Each is { startTime, endTime, title, category, detail? } for the full waking day through bedtime.
  - This MUST be an hour-by-hour (or finer) plan with real clock times. Do NOT restate goals as a bullet list (wrong: "Study for 7 hours"). Do split the day into segments (right: "09:00–10:30 Deep study").
  - Do NOT invent course codes, university course names, or subject labels the user did not give you. Use generic study titles such as "Study session", "Deep work", "Review", "Practice" unless their routine text explicitly names a subject.
  - startTime/endTime: 24h "HH:MM" strings, end after start, blocks in order, no gaps longer than 90 minutes without a labeled break/meal/free block.
  - category: one of sleep, wake, study, break, meal, class, hobby, scroll, free, other.
  - title: short label (e.g. "Focused study", "Lunch", "Scroll / social (cap)").
  - detail: optional extra line.
- tips (array of strings): 2–5 practical tips for sticking to the plan today.

Context:
- Date: ${date} (${dayName})
- User routine: ${routineForPrompt(routine)}

Rules:
- Honor wake time (${routine.wakeTime || 'unknown'}) and sleep time (${routine.sleepTime || 'unknown'}) and approximate sleep hours (${routine.sleepHours || 'unknown'}).
- Allocate roughly the stated daily study hours (${routine.studyHours || 'unknown'}) across multiple distinct study/break blocks with specific times.
- Reflect scroll limit (${routine.scrollHours || 'unknown'}), hobbies (${routine.hobbiesTime || 'unknown'}), and free time (${routine.freeTime || 'unknown'}) as named timed blocks.
- Use contiguous blocks; no overlaps; cover from first wake activity through sleep.

Return only the JSON object.`;
}

const DAILY_BLOCK_CATEGORIES = new Set([
  'sleep',
  'wake',
  'study',
  'break',
  'meal',
  'class',
  'hobby',
  'scroll',
  'free',
  'other',
]);

function normalizeDailyPlan(raw) {
  const analysis = typeof raw.analysis === 'string' ? raw.analysis : '';
  const tips = Array.isArray(raw.tips)
    ? raw.tips.filter((t) => typeof t === 'string' && t.trim().length > 0)
    : [];
  const blocks = (Array.isArray(raw.blocks) ? raw.blocks : [])
    .filter(
      (b) =>
        b &&
        typeof b.startTime === 'string' &&
        typeof b.endTime === 'string' &&
        typeof b.title === 'string' &&
        b.startTime.trim().length >= 4 &&
        b.endTime.trim().length >= 4
    )
    .map((b) => ({
      startTime: b.startTime.trim(),
      endTime: b.endTime.trim(),
      title: b.title.trim(),
      category: DAILY_BLOCK_CATEGORIES.has(b.category) ? b.category : 'other',
      detail:
        typeof b.detail === 'string' && b.detail.trim().length > 0
          ? b.detail.trim()
          : undefined,
    }));
  return { analysis, blocks, tips };
}

function parseHour(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
}

/** Parse "HH:MM" to minutes since midnight; invalid → fallbackMinutes */
function timeToMinutes(value, fallbackMinutes) {
  const m = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallbackMinutes;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return fallbackMinutes;
  }
  return h * 60 + min;
}

function minutesToHHMM(total) {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildFallbackDailyPlan(routine, dayName) {
  const sleep = routine?.sleepTime || '23:00';
  const studyHours = Math.max(1, Math.round(parseHour(routine?.studyHours, 4)));
  const scrollHours = Math.max(0, Math.round(parseHour(routine?.scrollHours, 1)));
  const hobbyHours = Math.max(0, Math.round(parseHour(routine?.hobbiesTime, 1)));
  const freeHours = Math.max(1, Math.round(parseHour(routine?.freeTime, 2)));

  const wakeM = timeToMinutes(routine?.wakeTime, 7 * 60);
  let t = wakeM;

  const pushBlock = (durMin, title, category, detail) => {
    const start = t;
    const end = t + durMin;
    const block = {
      startTime: minutesToHHMM(start),
      endTime: minutesToHHMM(end),
      title,
      category,
    };
    if (detail) block.detail = detail;
    t = end;
    return block;
  };

  const blocks = [];
  blocks.push(
    pushBlock(30, 'Morning routine', 'wake', 'Hydrate, quick planning, and set top priorities.')
  );
  blocks.push(pushBlock(30, 'Breakfast', 'meal'));
  blocks.push(pushBlock(120, 'Study', 'study'));
  blocks.push(pushBlock(20, 'Short break', 'break'));
  blocks.push(pushBlock(100, 'Study', 'study'));
  blocks.push(pushBlock(60, 'Lunch + reset', 'meal'));
  blocks.push(pushBlock(60, 'Study', 'study'));
  blocks.push(pushBlock(60, 'Study', 'study'));
  blocks.push(
    pushBlock(
      60,
      'Free block',
      'free',
      `Use for pending tasks or rest (${freeHours}h target total free time).`
    )
  );
  blocks.push(
    pushBlock(60, hobbyHours > 0 ? 'Hobby / exercise' : 'Light movement / rest', hobbyHours > 0 ? 'hobby' : 'free')
  );
  blocks.push(
    pushBlock(
      60,
      'Study',
      'study',
      `${studyHours}h study target spread across study blocks today.`
    )
  );
  blocks.push(pushBlock(60, 'Dinner', 'meal'));
  blocks.push(
    pushBlock(
      60,
      'Scroll / social window',
      scrollHours > 0 ? 'scroll' : 'free',
      scrollHours > 0 ? `Keep total scrolling within ${scrollHours} hour(s).` : undefined
    )
  );

  const sleepM = timeToMinutes(sleep, 23 * 60);
  const windStart = t;
  if (windStart < sleepM) {
    blocks.push({
      startTime: minutesToHHMM(windStart),
      endTime: minutesToHHMM(sleepM),
      title: 'Wind-down + prep for tomorrow',
      category: 'free',
    });
  }

  return {
    analysis: `Generated a practical ${dayName} timetable from your routine targets. This is an offline fallback because OpenAI quota is currently unavailable — no specific subjects are assumed.`,
    blocks,
    tips: [
      'Use a timer for each study block and start exactly on time.',
      'Keep breaks short to protect deep-work sessions.',
      'If a block slips, shift the next free block first instead of sleep.',
    ],
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    openaiConfigured: Boolean(getOpenAIApiKey()),
    mongoConfigured: Boolean(MONGODB_URI),
    mongoConnected: Boolean(db),
  });
});

/** Generate daily timetable via OpenAI (API key stays on server). */
app.post('/api/ai/daily-timetable', async (req, res) => {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message:
          'No OpenAI API key on the server. Add OPENAI_API_KEY (or REACT_APP_AI_API_KEY) to `.env` next to server.js and restart `npm run server`.',
      });
    }

    const { routine, date, dayName } = req.body || {};
    if (!routine || typeof routine !== 'object') {
      return res
        .status(400)
        .json({ success: false, message: 'Request body must include a routine object.' });
    }

    const dateStr =
      typeof date === 'string' && date.length >= 8
        ? date
        : new Date().toISOString().slice(0, 10);
    const dayStr =
      typeof dayName === 'string' && dayName.length > 0
        ? dayName
        : new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
          });

    const openai = new OpenAI({ apiKey });
    const userContent = buildDailyPlanPromptBody(routine, dateStr, dayStr);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful study planner. Always respond with a single JSON object only, no markdown code fences or extra text. The JSON must include analysis, blocks (array), and tips (array).',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (raw == null || raw === '') {
      return res
        .status(502)
        .json({ success: false, message: 'Empty response from OpenAI.' });
    }

    const trimmed = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '');
    let plan;
    try {
      plan = JSON.parse(trimmed);
    } catch (e) {
      console.error('daily-timetable JSON parse:', e, raw.slice(0, 500));
      return res
        .status(502)
        .json({ success: false, message: 'Model returned invalid JSON.' });
    }

    const normalized = normalizeDailyPlan(plan);
    if (normalized.blocks.length < 6) {
      return res.status(502).json({
        success: false,
        message:
          'The model returned too few timed blocks. Try again, or switch OPENAI_MODEL to gpt-4o-mini / gpt-4o.',
      });
    }

    return res.json({
      success: true,
      plan: normalized,
    });
  } catch (error) {
    console.error('POST /api/ai/daily-timetable:', error);
    const status = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || '');
    const quotaExceeded =
      status === 429 ||
      message.includes('429') ||
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('billing');
    if (quotaExceeded) {
      const { routine, dayName } = req.body || {};
      const fallback = buildFallbackDailyPlan(
        routine && typeof routine === 'object' ? routine : {},
        typeof dayName === 'string' && dayName ? dayName : 'today'
      );
      return res.json({
        success: true,
        plan: fallback,
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error.',
    });
  }
});

// In production, serve the React app (optional, for future use)
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

initMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    if (!getOpenAIApiKey()) {
      console.warn(
        'No OpenAI key (OPENAI_API_KEY or REACT_APP_AI_API_KEY) — POST /api/ai/daily-timetable will return 503.'
      );
    }
  });
});
