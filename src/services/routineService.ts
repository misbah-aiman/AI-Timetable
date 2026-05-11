import { getApiBaseUrl } from '../config/apiBaseUrl';

export type RoutinePayload = {
  studyHours: string;
  sleepTime: string;
  wakeTime: string;
  sleepHours: string;
  classesScheduleImage: string | null;
  hobbiesTime: string;
  scrollHours: string;
  freeTime: string;
};

const routineStorageKey = (userId: string) => `ai-timetable:routine:${userId}`;

export async function saveRoutine(
  userId: string,
  routine: RoutinePayload
): Promise<void> {
  try {
    localStorage.setItem(
      routineStorageKey(userId),
      JSON.stringify(routine)
    );
  } catch (e) {
    console.error(e);
    throw new Error(
      'Failed to save your routine. Storage may be full or unavailable.'
    );
  }
}

export async function getRoutine(userId: string): Promise<RoutinePayload | null> {
  try {
    const raw = localStorage.getItem(routineStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as RoutinePayload;
  } catch {
    return null;
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  const base = getApiBaseUrl();
  const url = `${base}/api/account/${encodeURIComponent(userId)}`;
  const response = await fetch(url, { method: 'DELETE' });

  let data: { success?: boolean; message?: string } | null = null;
  try {
    data = (await response.json()) as { success?: boolean; message?: string };
  } catch {
    data = null;
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to delete account.');
  }

  // Clear browser-only app data after successful account deletion.
  localStorage.removeItem(`ai-timetable:routine:${userId}`);
  localStorage.removeItem('ai-timetable:sessions');
  localStorage.removeItem('ai-timetable:active-timer');
  localStorage.removeItem('ai-timetable:reminders');
  localStorage.removeItem('ai-timetable:last-weekly-plan');
  localStorage.removeItem('ai-timetable:daily-ai-plan');
  sessionStorage.removeItem('signup:needsRoutine');
}
