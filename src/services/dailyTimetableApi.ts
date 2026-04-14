import { getApiBaseUrl } from '../config/apiBaseUrl';
import type { GeneratedDailyPlan } from './aiService';
import type { RoutinePayload } from './routineService';

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
    throw new Error(
      'Cannot reach the server. Run `npm run server` (port 5000) in a separate terminal alongside `npm start`.'
    );
  }
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    plan?: GeneratedDailyPlan;
  };
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
