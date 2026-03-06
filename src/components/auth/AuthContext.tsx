import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !data.user) {
        const message =
          data?.message || 'Unable to log in with those credentials.';
        throw new Error(message);
      }

      persistUser(data.user as AuthUser);
    },
    [persistUser]
  );

  const signup = useCallback(
    async (email: string, password: string, name?: string) => {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !data.user) {
        const message =
          data?.message || 'Unable to create an account right now.';
        throw new Error(message);
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

