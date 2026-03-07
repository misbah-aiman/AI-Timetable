import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFarcaster } from '../context/FarcasterContext';
import { useAuth } from '../components/auth';
import { Button, Input } from '../components/ui';

const LoginPage: React.FC = () => {
  const { isReady, user: fcUser } = useFarcaster();
  const { login, loginWithFarcaster } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFarcasterSubmitting, setIsFarcasterSubmitting] = useState(false);

  const handleFarcasterContinue = () => {
    if (!fcUser) return;
    setIsFarcasterSubmitting(true);
    loginWithFarcaster(
      fcUser.fid,
      fcUser.username,
      fcUser.displayName
    );
    navigate('/dashboard', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      // If we were sent here from /routine (e.g. auth wasn't ready right after signup), go back to routine onboarding
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      if (fromPath === '/routine') {
        navigate('/routine', { replace: true, state: { fromSignup: true } });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-primary-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-soft ring-1 ring-primary-200/60">
        <h2 className="text-center text-2xl font-semibold text-primary-900">
          Sign in
        </h2>
        <p className="text-center text-sm text-primary-600">
          Sign in to your account
        </p>

        {fcUser && (
          <div className="space-y-3">
            <Button
              type="button"
              fullWidth
              isLoading={isFarcasterSubmitting}
              onClick={handleFarcasterContinue}
            >
              Continue as {fcUser.displayName || fcUser.username || `@${fcUser.fid}`}
            </Button>
            <p className="text-center text-xs text-primary-500">or sign in with email</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="login-password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-xs font-medium text-rose-600">{error}</p>
          )}
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <div className="text-center text-xs text-primary-600">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            className="font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2"
            onClick={() => navigate('/signup')}
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
