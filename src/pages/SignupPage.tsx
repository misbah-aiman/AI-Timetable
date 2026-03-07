import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth';
import { Button, Input } from '../components/ui';

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email, password, name || undefined);
      // Mark that we need routine onboarding (survives redirect if auth state isn't ready yet)
      sessionStorage.setItem('signup:needsRoutine', '1');
      // Defer navigation so auth state can update before ProtectedRoute runs
      setTimeout(() => {
        navigate('/routine', { replace: true, state: { fromSignup: true } });
      }, 0);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to create your account. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft ring-1 ring-primary-200/60">
        <h2 className="mb-2 text-center text-2xl font-semibold text-primary-900">
          Create your account
        </h2>
        <p className="mb-6 text-center text-sm text-primary-600">
          Set up your profile
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            id="signup-name"
            type="text"
            label="Name (optional)"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="signup-email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="signup-password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            id="signup-confirm-password"
            type="password"
            label="Confirm password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && (
            <p className="text-xs font-medium text-rose-600">{error}</p>
          )}
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
          >
            Sign up
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-primary-600">
          Already have an account?{' '}
          <button
            type="button"
            className="font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2"
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
};

