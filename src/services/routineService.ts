export type RoutinePayload = {
  studyHours: string;
  sleepTime: string;
  wakeTime: string;
  sleepHours: string;
  classesScheduleImage: string | null;
  hobbiesTime: string;
  scrollHours: string;
};

function getApiBaseUrl(): string {
  const url = process.env.REACT_APP_API_URL ?? '';
  return url.replace(/\/$/, '');
}

export async function saveRoutine(
  userId: string,
  routine: RoutinePayload
): Promise<void> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/routine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, routine }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    const message = data?.message ?? 'Failed to save your routine. Please try again.';
    throw new Error(message);
  }
}
