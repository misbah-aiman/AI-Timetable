import React, { useMemo, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth, ProtectedRoute } from './components/auth';
import { LoginPage, SignupPage } from './pages';

type Theme = 'light' | 'dark';

type RoutineAnswers = {
  wakeTime: string;
  sleepTime: string;
  studyHours: string;
  scrollHours: string;
};

const defaultRoutine: RoutineAnswers = {
  wakeTime: '',
  sleepTime: '',
  studyHours: '',
  scrollHours: '',
};

const AppShell: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [theme, setTheme] = useState<Theme>('light');
  const [routine, setRoutine] = useState<RoutineAnswers>(defaultRoutine);
  const [todayPlan, setTodayPlan] = useState<string[]>([]);

  const handleLogout = () => {
    logout();
    setRoutine(defaultRoutine);
    setTodayPlan([]);
  };

  const handleRoutineComplete = (answers: RoutineAnswers) => {
    setRoutine(answers);
    // Very simple "plan" derived from routine
    const plan: string[] = [];
    if (answers.studyHours) {
      plan.push(`Study for ${answers.studyHours} hours`);
    }
    if (answers.scrollHours) {
      plan.push(`Limit scrolling to ${answers.scrollHours} hours`);
    }
    if (answers.wakeTime && answers.sleepTime) {
      plan.push(`Sleep from ${answers.sleepTime} to ${answers.wakeTime}`);
    }
    setTodayPlan(plan);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const appClasses = useMemo(
    () =>
      theme === 'light'
        ? 'min-h-screen bg-slate-50 text-slate-900'
        : 'min-h-screen bg-slate-900 text-slate-50',
    [theme]
  );

  return (
    <div className={appClasses}>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <SplashScreen />
            )
          }
        />
        <Route
          path="/auth"
          element={
            <Navigate to="/login" replace />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/routine" replace /> : <LoginPage />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/routine" replace />
            ) : (
              <SignupPage />
            )
          }
        />
        <Route
          path="/routine"
          element={
            <ProtectedRoute>
              <RoutineInputScreen
                initial={routine}
                onComplete={handleRoutineComplete}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze"
          element={
            <ProtectedRoute>
              <AnalyzeScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout
                theme={theme}
                onToggleTheme={toggleTheme}
                todayPlan={todayPlan}
                routine={routine}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400 px-4 text-center text-slate-50">
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-xl ring-2 ring-white/40">
        <span className="text-3xl font-semibold tracking-tight">AI</span>
      </div>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        AI Timetable
      </h1>
      <p className="mb-10 max-w-md text-sm text-slate-100/90 sm:text-base">
        Build a smarter daily routine with AI-powered planning and gentle
        tracking of your time, sleep and screen habits.
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="rounded-full bg-white px-8 py-3 text-sm font-medium text-indigo-700 shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-50"
      >
        Continue to login
      </button>
    </div>
  );
};

type AuthScreenProps = {
  onLogin: () => void;
};

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        // You can surface this error in the UI later if needed
        console.error('Login API failed', await response.text());
        return;
      }

      const data = (await response.json()) as { success?: boolean };
      if (!data.success) {
        console.error('Login API responded with failure');
        return;
      }

      onLogin();
      navigate('/routine');
    } catch (error) {
      console.error('Error while calling login API', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-8 shadow-xl ring-1 ring-slate-700">
        <h2 className="mb-2 text-center text-2xl font-semibold text-slate-50">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="mb-6 text-center text-sm text-slate-400">
          AI Timetable keeps your routine and time tracking in one place.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-indigo-500/50 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2"
              placeholder="you@example.com"
            />
          </div>
          <div className="text-left">
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-indigo-500/50 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600"
          >
            {mode === 'login' ? 'Login' : 'Sign up'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button
                type="button"
                className="font-medium text-indigo-300 hover:text-indigo-200"
                onClick={() => setMode('signup')}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-medium text-indigo-300 hover:text-indigo-200"
                onClick={() => setMode('login')}
              >
                Log in
              </button>
            </>
          )}
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

type RoutineInputScreenProps = {
  initial: RoutineAnswers;
  onComplete: (answers: RoutineAnswers) => void;
};

const RoutineInputScreen: React.FC<RoutineInputScreenProps> = ({
  initial,
  onComplete,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<RoutineAnswers>(initial);

  const questions: {
    id: keyof RoutineAnswers;
    label: string;
    placeholder: string;
    helper?: string;
  }[] = [
    {
      id: 'wakeTime',
      label: 'What time do you usually wake up?',
      placeholder: 'e.g. 7:00 AM',
    },
    {
      id: 'sleepTime',
      label: 'What time do you usually go to sleep?',
      placeholder: 'e.g. 11:30 PM',
    },
    {
      id: 'studyHours',
      label: 'How many hours do you want to study today?',
      placeholder: 'e.g. 4',
      helper: 'A rough estimate is enough.',
    },
    {
      id: 'scrollHours',
      label: 'Maximum hours you want to spend scrolling?',
      placeholder: 'e.g. 1.5',
      helper: 'Social media, random browsing, etc.',
    },
  ];

  const current = questions[step];

  const handleChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      onComplete(answers);
      navigate('/analyze');
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate('/auth');
    } else {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-50">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900/80 p-8 shadow-xl ring-1 ring-slate-800">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-indigo-300">
          Routine Setup
        </p>
        <h2 className="mb-6 text-2xl font-semibold">
          Question {step + 1} of {questions.length}
        </h2>
        <div className="mb-6">
          <p className="mb-3 text-base font-medium">{current.label}</p>
          {current.helper && (
            <p className="mb-3 text-sm text-slate-400">{current.helper}</p>
          )}
          <input
            type="text"
            value={answers[current.id]}
            onChange={(e) => handleChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-indigo-500/50 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2"
            placeholder={current.placeholder}
          />
        </div>
        <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            Progress {step + 1}/{questions.length}
          </span>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{
                width: `${((step + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            {step === 0 ? 'Back to login' : 'Back'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            {step === questions.length - 1 ? 'Finish & analyze' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalyzeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 10;
        if (next >= 100) {
          clearInterval(interval);
          navigate('/dashboard');
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-50">
      <h2 className="mb-2 text-2xl font-semibold">Analyzing your routine</h2>
      <p className="mb-6 text-sm text-slate-400">
        We are creating a balanced plan for today based on your answers.
      </p>
      <div className="mb-3 h-2 w-64 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-indigo-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
        Analyzing...
      </p>
    </div>
  );
};

type DashboardLayoutProps = {
  theme: Theme;
  onToggleTheme: () => void;
  todayPlan: string[];
  routine: RoutineAnswers;
  onLogout: () => void;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  theme,
  onToggleTheme,
  todayPlan,
  routine,
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const today = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/dashboard/time-tracker', label: 'Time tracker' },
    { path: '/dashboard/weekly-report', label: 'Weekly report' },
    { path: '/dashboard/settings', label: 'Settings' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Home
          </p>
          <h1 className="text-lg font-semibold">Good day 👋</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:inline">
            {today}
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button
            type="button"
            onClick={() => {
              onLogout();
              navigate('/');
            }}
            className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col md:flex-row">
        <nav className="border-b border-slate-800 bg-slate-950/90 px-4 py-3 text-sm md:w-52 md:border-b-0 md:border-r">
          <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${
                      active
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardHome today={today} todayPlan={todayPlan} routine={routine} />
              }
            />
            <Route path="/time-tracker" element={<TimeTrackerScreen />} />
            <Route path="/weekly-report" element={<WeeklyReportScreen />} />
            <Route
              path="/settings"
              element={
                <SettingsScreen
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  routine={routine}
                />
              }
            />
          </Routes>
        </section>
      </main>
    </div>
  );
};

type DashboardHomeProps = {
  today: string;
  todayPlan: string[];
  routine: RoutineAnswers;
};

const DashboardHome: React.FC<DashboardHomeProps> = ({
  today,
  todayPlan,
  routine,
}) => {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 p-5 text-slate-50 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-100/90">
          Today
        </p>
        <h2 className="mt-1 text-xl font-semibold">Hi, here&apos;s your plan</h2>
        <p className="mt-1 text-xs text-indigo-100/90">{today}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {todayPlan.length === 0 ? (
            <li className="text-indigo-100/90">
              No plan yet. Go to Settings to adjust your routine or re-run the
              setup.
            </li>
          ) : (
            todayPlan.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-100" />
                <span>{item}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Wake time
          </h3>
          <p className="text-lg font-medium">
            {routine.wakeTime || 'Not set'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Sleep time
          </h3>
          <p className="text-lg font-medium">
            {routine.sleepTime || 'Not set'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Study goal
          </h3>
          <p className="text-lg font-medium">
            {routine.studyHours ? `${routine.studyHours} hrs` : 'Not set'}
          </p>
        </div>
      </section>
    </div>
  );
};

const TimeTrackerScreen: React.FC = () => {
  const [mode, setMode] = useState<'study' | 'scroll' | 'sleep'>('study');
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  React.useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const reset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  const formatTime = (value: number) => {
    const hrs = Math.floor(value / 3600);
    const mins = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Time tracker</h2>
      <p className="text-sm text-slate-400">
        Track your focused study, scrolling and sleep sessions.
      </p>

      <div className="flex flex-wrap gap-2">
        {(['study', 'scroll', 'sleep'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize ${
              mode === value
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Current session
        </p>
        <p className="mb-3 text-sm font-medium capitalize text-slate-100">
          {mode}
        </p>
        <p className="mb-6 text-4xl font-mono tabular-nums text-slate-50">
          {formatTime(seconds)}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsRunning((prev) => !prev)}
            className={`rounded-full px-5 py-2 text-sm font-medium ${
              isRunning
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Stop & reset
          </button>
        </div>
      </div>
    </div>
  );
};

const WeeklyReportScreen: React.FC = () => {
  const data = [
    { label: 'Study hrs', value: 18, color: 'bg-emerald-500' },
    { label: 'Sleep hrs (avg)', value: 7, color: 'bg-sky-500' },
    { label: 'Scroll hrs', value: 9, color: 'bg-rose-500' },
  ];

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Weekly report</h2>
      <p className="text-sm text-slate-400">
        A simple overview of total study time, average sleep and scrolling
        hours.
      </p>

      <div className="mt-2 flex h-64 items-end justify-around rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center justify-end gap-2"
          >
            <div className="flex h-full w-full items-end justify-center">
              <div
                className={`w-8 rounded-t-lg ${item.color}`}
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-100">
                {item.value}h
              </p>
              <p className="mt-0.5 max-w-[6rem] text-[10px] text-slate-400">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

type SettingsScreenProps = {
  theme: Theme;
  onToggleTheme: () => void;
  routine: RoutineAnswers;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  theme,
  onToggleTheme,
  routine,
}) => {
  const [goals, setGoals] = useState(
    'Stay consistent with study, protect sleep, and reduce doom‑scrolling.'
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Settings</h2>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="text-sm font-medium text-slate-100">Routine summary</h3>
        <p className="text-xs text-slate-400">
          Quickly review or update your current routine.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-slate-200">
          <li>Wake: {routine.wakeTime || 'Not set'}</li>
          <li>Sleep: {routine.sleepTime || 'Not set'}</li>
          <li>
            Study goal:{' '}
            {routine.studyHours ? `${routine.studyHours} hrs` : 'Not set'}
          </li>
          <li>
            Scroll limit:{' '}
            {routine.scrollHours ? `${routine.scrollHours} hrs` : 'Not set'}
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="text-sm font-medium text-slate-100">Change goals</h3>
        <p className="text-xs text-slate-400">
          Describe what you want this week. You can later wire this into real
          AI planning.
        </p>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-indigo-500/50 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2"
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="text-sm font-medium text-slate-100">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-100">Dark mode</p>
            <p className="text-xs text-slate-400">
              Switch between light and dark themes.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`flex h-7 w-12 items-center rounded-full border border-slate-700 px-1 transition ${
              theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-800'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white transition ${
                theme === 'dark' ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
};

const App: React.FC = () => {
  return <AppShell />;
};

export default App;
