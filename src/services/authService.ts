import { getApiBaseUrl } from '../config/apiBaseUrl';

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
};

type AuthSuccessResponse = {
  success: true;
  user: AuthUserPayload;
};

type AuthErrorResponse = {
  success: false;
  message?: string;
};

async function postAuth(
  path: '/api/signup' | '/api/login',
  body: Record<string, unknown>
): Promise<AuthUserPayload> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data: AuthSuccessResponse | AuthErrorResponse | null = null;
  try {
    data = (await response.json()) as AuthSuccessResponse | AuthErrorResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && 'message' in data && data.message
        ? data.message
        : path === '/api/signup'
          ? 'Signup failed. Please try again.'
          : 'Login failed. Please try again.';
    throw new Error(message);
  }

  if (!data || !('success' in data) || !data.success || !('user' in data) || !data.user) {
    throw new Error('Invalid auth response from server.');
  }

  return data.user;
}

export async function signupWithDatabase(
  email: string,
  password: string,
  name?: string
): Promise<AuthUserPayload> {
  return postAuth('/api/signup', { email, password, name });
}

export async function loginWithDatabase(
  email: string,
  password: string
): Promise<AuthUserPayload> {
  return postAuth('/api/login', { email, password });
}
