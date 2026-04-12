import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getApiBaseUrl } from '../../config/apiBaseUrl';

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginWithFarcaster: (fid: number, username?: string, displayName?: string) => void;
  logout: () => void;
};

const STORAGE_KEY = 'ai-timetable:auth-user';

type ApiEnvelope = {
  success?: boolean;
  message?: string;
  user?: AuthUser;
};

async function postJson<T extends ApiEnvelope>(
  path: string,
  body: unknown
): Promise<{ response: Response; data: T | null; parseFailed: boolean }> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: T | null = null;
  let parseFailed = false;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
      parseFailed = true;
    }
  }
  return { response, data, parseFailed };
}

function interpretAuthFailure(
  response: Response,
  data: ApiEnvelope | null,
  parseFailed: boolean,
  fallback: string
): string {
  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }
  if (parseFailed || (response.ok && data === null)) {
    return 'The API did not return JSON. Run `npm run server` on port 5000 with MongoDB and MONGODB_URI set in `.env`.';
  }
  if (response.status >= 500) {
    return 'Server error. Check MongoDB is running and MONGODB_URI in `.env` is correct.';
  }
  if (
    response.status === 404 ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504
  ) {
    return 'Cannot reach the API on port 5000. Run `npm run server` (or `npm run dev`) with MongoDB running.';
  }
  return fallback;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed && parsed.id && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (error) {
      // Swallow storage errors; start unauthenticated
      console.error('Failed to read auth user from storage', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to write auth user to storage', error);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      let response: Response;
      let data: ApiEnvelope | null;
      let parseFailed: boolean;
      try {
        const result = await postJson<ApiEnvelope>('/api/login', { email, password });
        response = result.response;
        data = result.data;
        parseFailed = result.parseFailed;
      } catch {
        throw new Error(
          'Could not reach port 5000. Start the API with `npm run server` and ensure MongoDB is running (MONGODB_URI in `.env`).'
        );
      }
      if (!response.ok || !data?.success || !data.user) {
        throw new Error(
          interpretAuthFailure(
            response,
            data,
            parseFailed,
            'Unable to log in with those credentials.'
          )
        );
      }
      persistUser(data.user as AuthUser);
    },
    [persistUser]
  );

  const signup = useCallback(
    async (email: string, password: string, name?: string) => {
      let response: Response;
      let data: ApiEnvelope | null;
      let parseFailed: boolean;
      try {
        const result = await postJson<ApiEnvelope>('/api/signup', {
          email,
          password,
          name,
        });
        response = result.response;
        data = result.data;
        parseFailed = result.parseFailed;
      } catch {
        throw new Error(
          'Could not reach port 5000. Start the API with `npm run server` and ensure MongoDB is running (MONGODB_URI in `.env`).'
        );
      }
      if (!response.ok || !data?.success || !data.user) {
        throw new Error(
          interpretAuthFailure(
            response,
            data,
            parseFailed,
            'Unable to create an account. Please try again.'
          )
        );
      }
      persistUser(data.user as AuthUser);
    },
    [persistUser]
  );

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  const loginWithFarcaster = useCallback(
    (fid: number, username?: string, displayName?: string) => {
      persistUser({
        id: String(fid),
        email: `${username ?? fid}@farcaster.user`,
        name: displayName ?? username ?? undefined,
      });
    },
    [persistUser]
  );

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    signup,
    loginWithFarcaster,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

