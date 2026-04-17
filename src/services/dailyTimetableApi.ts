import { getApiBaseUrl } from '../config/apiBaseUrl';
import type { GeneratedDailyPlan } from './aiService';
import type { RoutinePayload } from './routineService';

function parseHour(value: unknown, fallback: number): number {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
}

function timeToMinutes(value: unknown, fallbackMinutes: number): number {
  const m = String(value ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallbackMinutes;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) {
    return fallbackMinutes;
  }
  return h * 60 + min;
}

function minutesToHHMM(total: number): string {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildFallbackDailyPlan(
  routine: RoutinePayload,
  dayName: string,
  reason: string
): GeneratedDailyPlan {
  const sleep = routine?.sleepTime || '23:00';
  const studyHours = Math.max(1, Math.round(parseHour(routine?.studyHours, 4)));
  const scrollHours = Math.max(0, Math.round(parseHour(routine?.scrollHours, 1)));
  const hobbyHours = Math.max(0, Math.round(parseHour(routine?.hobbiesTime, 1)));
  const freeHours = Math.max(1, Math.round(parseHour(routine?.freeTime, 2)));

  const wakeM = timeToMinutes(routine?.wakeTime, 7 * 60);
  let t = wakeM;
  const blocks: GeneratedDailyPlan['blocks'] = [];

  const pushBlock = (
    durMin: number,
    title: string,
    category: GeneratedDailyPlan['blocks'][number]['category'],
    detail?: string
  ) => {
    const start = t;
    const end = t + durMin;
    blocks.push({
      startTime: minutesToHHMM(start),
      endTime: minutesToHHMM(end),
      title,
      category,
      detail,
    });
    t = end;
  };

  pushBlock(30, 'Morning routine', 'wake', 'Hydrate and set today priorities.');
  pushBlock(30, 'Breakfast', 'meal');
  pushBlock(120, 'Focused study', 'study');
  pushBlock(20, 'Short break', 'break');
  pushBlock(100, 'Study session', 'study');
  pushBlock(60, 'Lunch + reset', 'meal');
  pushBlock(60, 'Study session', 'study');
  pushBlock(60, hobbyHours > 0 ? 'Hobby / exercise' : 'Light movement', hobbyHours > 0 ? 'hobby' : 'free');
  pushBlock(
    60,
    'Free block',
    'free',
    `Use for pending tasks or rest (${freeHours}h target total free time).`
  );
  pushBlock(
    60,
    'Scroll / social window',
    scrollHours > 0 ? 'scroll' : 'free',
    scrollHours > 0 ? `Keep scrolling within ${scrollHours} hour(s).` : undefined
  );
  pushBlock(
    60,
    'Review and prep',
    'study',
    `${studyHours}h study target spread across the day.`
  );

  const sleepM = timeToMinutes(sleep, 23 * 60);
  if (t < sleepM) {
    blocks.push({
      startTime: minutesToHHMM(t),
      endTime: minutesToHHMM(sleepM),
      title: 'Wind-down',
      category: 'free',
    });
  }

  return {
    analysis: `Generated a practical ${dayName} timetable from your routine. (${reason})`,
    blocks,
    tips: [
      'Start each study block with a timer.',
      'Keep breaks short to protect focus.',
      'If you fall behind, adjust free-time blocks first instead of sleep.',
    ],
  };
}

/** Calls server POST /api/ai/daily-timetable (OpenAI runs on backend only). */
export async function fetchDailyTimetable(
  routine: RoutinePayload,
  date: string,
  dayName: string
): Promise<GeneratedDailyPlan> {
  const base = getApiBaseUrl();
  const url = `${base}/api/ai/daily-timetable`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routine, date, dayName }),
    });
  } catch {
    return buildFallbackDailyPlan(
      routine,
      dayName,
      'Server unavailable, using local fallback plan'
    );
  }
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    plan?: GeneratedDailyPlan;
  };
  if (!res.ok) {
    // Vercel static deployments may return 404/405 for POST /api/* when no backend function exists.
    if (res.status === 404 || res.status === 405) {
      return buildFallbackDailyPlan(
        routine,
        dayName,
        'Backend route not available in this deployment, using local fallback plan'
      );
    }
    if (res.status === 429 || res.status >= 500) {
      return buildFallbackDailyPlan(
        routine,
        dayName,
        `Service temporarily unavailable (${res.status}), using local fallback plan`
      );
    }
  }

  if (
    typeof data.message === 'string' &&
    /openai api key|no openai|quota|billing|rate limit|cannot reach/i.test(data.message)
  ) {
    return buildFallbackDailyPlan(
      routine,
      dayName,
      'AI service unavailable, using local fallback plan'
    );
  }

  if (!res.ok || !data.success || !data.plan) {
    throw new Error(
      typeof data.message === 'string'
        ? data.message
        : `Request failed (${res.status})`
    );
  }
  const plan = data.plan;
  if (!Array.isArray(plan.blocks) || plan.blocks.length === 0) {
    throw new Error(
      'The server returned an empty timetable. Check OPENAI_API_KEY and try again.'
    );
  }
  return plan;
}
