/**
 * Email/password accounts stored only in localStorage (browser).
 * Passwords are stored as SHA-256(email:password) — fine for local-only demos, not for production.
 */

export const LOCAL_USERS_KEY = 'ai-timetable:local-users';

type StoredUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
};

async function hashCredential(email: string, password: string): Promise<string> {
  const normalized = `${email.toLowerCase().trim()}:${password}`;
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export async function signupLocal(
  email: string,
  password: string,
  name?: string
): Promise<{ id: string; email: string; name: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();
  const users = readUsers();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('Email is already registered.');
  }
  const id = crypto.randomUUID();
  const passwordHash = await hashCredential(normalizedEmail, password);
  const trimmedName = name?.trim() || null;
  users.push({
    id,
    email: normalizedEmail,
    name: trimmedName,
    passwordHash,
  });
  writeUsers(users);
  return { id, email: normalizedEmail, name: trimmedName };
}

export async function loginLocal(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();
  const users = readUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }
  const passwordHash = await hashCredential(normalizedEmail, password);
  if (passwordHash !== user.passwordHash) {
    throw new Error('Invalid email or password.');
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

const routineKey = (userId: string) => `ai-timetable:routine:${userId}`;

/** Other app data keys (not namespaced per user) cleared on account delete. */
const APP_WIDE_KEYS = [
  'ai-timetable:sessions',
  'ai-timetable:active-timer',
  'ai-timetable:reminders',
  'ai-timetable:last-weekly-plan',
] as const;

/** Removes saved credentials, routine, and app data for this browser. Caller should call `logout()` to clear the session. */
export function deleteLocalUserAccount(userId: string): void {
  const users = readUsers().filter((u) => u.id !== userId);
  writeUsers(users);
  localStorage.removeItem(routineKey(userId));
  for (const key of APP_WIDE_KEYS) {
    localStorage.removeItem(key);
  }
  try {
    sessionStorage.removeItem('signup:needsRoutine');
  } catch {
    /* ignore */
  }
}
