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

export async function getRoutine(userId: string): Promise<RoutinePayload | null> {
  const base = getApiBaseUrl();
  try {
    const response = await fetch(`${base}/api/routine/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok || !data?.success) {
      const message = data?.message ?? 'Failed to fetch your routine.';
      throw new Error(message);
    }
    
    return data.routine as RoutinePayload;
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error('Could not reach the server. Please check your connection.');
    }
    throw error;
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}/api/account/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    const message = data?.message ?? 'Failed to delete account. Please try again.';
    throw new Error(message);
  }
}
