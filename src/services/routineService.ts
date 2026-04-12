import { deleteLocalUserAccount } from './localAuthStorage';

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
  deleteLocalUserAccount(userId);
}
