import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth';
import { Button, Input } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: { pathname?: string } };
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      const from = location.state?.from?.pathname || '/routine';
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to log in. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-8 shadow-xl ring-1 ring-slate-700">
        <h2 className="mb-2 text-center text-2xl font-semibold text-slate-50">
          Welcome back
        </h2>
        <p className="mb-6 text-center text-sm text-slate-400">
          Sign in to access your AI-powered timetable.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
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
            <p className="text-xs font-medium text-rose-400">{error}</p>
          )}
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
          >
            Log in
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-400">
          New here?{' '}
          <button
            type="button"
            className="font-medium text-indigo-300 hover:text-indigo-200"
            onClick={() => navigate('/signup')}
          >
            Create an account
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300"
        >
          Back to splash
        </button>
      </div>
    </div>
  );
};

