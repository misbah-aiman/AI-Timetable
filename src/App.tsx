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
import { FarcasterProvider } from './context/FarcasterContext';

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
        ? 'min-h-screen bg-primary-50 text-primary-900'
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-100 via-primary-50 to-primary-200/80 px-4 text-center">
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-soft ring-2 ring-primary-200/80">
        <span className="text-3xl font-semibold tracking-tight text-primary-600">AI</span>
      </div>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-primary-900 sm:text-4xl">
        AI Timetable
      </h1>
      <p className="mb-10 max-w-md text-sm text-primary-700/90 sm:text-base">
        Build a smarter daily routine with AI-powered planning and gentle
        tracking of your time, sleep and screen habits.
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="rounded-full bg-primary-600 px-8 py-3 text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Continue to login
      </button>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-soft ring-1 ring-primary-200/60">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary-600">
          Routine Setup
        </p>
        <h2 className="mb-6 text-2xl font-semibold text-primary-900">
          Question {step + 1} of {questions.length}
        </h2>
        <div className="mb-6">
          <p className="mb-3 text-base font-medium text-primary-900">{current.label}</p>
          {current.helper && (
            <p className="mb-3 text-sm text-primary-600/80">{current.helper}</p>
          )}
          <input
            type="text"
            value={answers[current.id]}
            onChange={(e) => handleChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-primary-200 bg-primary-50/50 px-3 py-2 text-sm text-primary-900 outline-none placeholder:text-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            placeholder={current.placeholder}
          />
        </div>
        <div className="mb-4 flex items-center justify-between text-xs text-primary-600">
          <span>
            Progress {step + 1}/{questions.length}
          </span>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-primary-200">
            <div
              className="h-full bg-primary-500 transition-all"
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
            className="flex-1 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100"
          >
            {step === 0 ? 'Back to login' : 'Back'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-50 px-4 text-center">
      <h2 className="mb-2 text-2xl font-semibold text-primary-900">Analyzing your routine</h2>
      <p className="mb-6 text-sm text-primary-600">
        We are creating a balanced plan for today based on your answers.
      </p>
      <div className="mb-3 h-2 w-64 overflow-hidden rounded-full bg-primary-200">
        <div
          className="h-full bg-primary-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-primary-600">
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

  const isLight = theme === 'light';
  return (
    <div className={`flex min-h-screen flex-col ${isLight ? 'bg-primary-50 text-primary-900' : 'bg-slate-950 text-slate-50'}`}>
      <header className={`flex items-center justify-between border-b px-6 py-4 ${isLight ? 'border-primary-200 bg-white/80' : 'border-slate-800'}`}>
        <div>
          <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-primary-600' : 'text-slate-400'}`}>
            Home
          </p>
          <h1 className={`text-lg font-semibold ${isLight ? 'text-primary-900' : ''}`}>Good day 👋</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden text-xs sm:inline ${isLight ? 'text-primary-600' : 'text-slate-400'}`}>
            {today}
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`rounded-full border px-3 py-1 text-xs transition ${isLight ? 'border-primary-300 text-primary-800 hover:bg-primary-100' : 'border-slate-700 text-slate-200 hover:bg-slate-800'}`}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <button
            type="button"
            onClick={() => {
              onLogout();
              navigate('/');
            }}
            className={`rounded-full border border-rose-500/60 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 ${isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-300 hover:bg-rose-500/10'}`}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col md:flex-row">
        <nav className={`border-b px-4 py-3 text-sm md:w-52 md:border-b-0 md:border-r ${isLight ? 'border-primary-200 bg-white/60' : 'border-slate-800 bg-slate-950/90'}`}>
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
                        ? 'bg-primary-600 text-white'
                        : isLight
                          ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
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
      <section className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-primary-100">
          Today
        </p>
        <h2 className="mt-1 text-xl font-semibold">Hi, here&apos;s your plan</h2>
        <p className="mt-1 text-xs text-primary-100">{today}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {todayPlan.length === 0 ? (
            <li className="text-primary-100">
              No plan yet. Go to Settings to adjust your routine or re-run the
              setup.
            </li>
          ) : (
            todayPlan.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                <span>{item}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-primary-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Wake time
          </h3>
          <p className="text-lg font-medium text-primary-900">
            {routine.wakeTime || 'Not set'}
          </p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Sleep time
          </h3>
          <p className="text-lg font-medium text-primary-900">
            {routine.sleepTime || 'Not set'}
          </p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-white p-4 text-sm shadow-sm">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Study goal
          </h3>
          <p className="text-lg font-medium text-primary-900">
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
      <h2 className="text-lg font-semibold text-primary-900">Time tracker</h2>
      <p className="text-sm text-primary-600">
        Track your focused study, scrolling and sleep sessions.
      </p>

      <div className="flex flex-wrap gap-2">
        {(['study', 'scroll', 'sleep'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              mode === value
                ? 'bg-primary-600 text-white'
                : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-primary-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-primary-600">
          Current session
        </p>
        <p className="mb-3 text-sm font-medium capitalize text-primary-900">
          {mode}
        </p>
        <p className="mb-6 text-4xl font-mono tabular-nums text-primary-900">
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
            className="rounded-full border border-primary-300 px-4 py-2 text-xs font-medium text-primary-800 hover:bg-primary-100"
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
      <h2 className="text-lg font-semibold text-primary-900">Weekly report</h2>
      <p className="text-sm text-primary-600">
        A simple overview of total study time, average sleep and scrolling
        hours.
      </p>

      <div className="mt-2 flex h-64 items-end justify-around rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
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
              <p className="text-xs font-semibold text-primary-900">
                {item.value}h
              </p>
              <p className="mt-0.5 max-w-[6rem] text-[10px] text-primary-600">
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
      <h2 className="text-lg font-semibold text-primary-900">Settings</h2>

      <section className="space-y-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-primary-900">Routine summary</h3>
        <p className="text-xs text-primary-600">
          Quickly review or update your current routine.
        </p>
        <ul className="mt-2 space-y-1 text-sm text-primary-800">
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

      <section className="space-y-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-primary-900">Change goals</h3>
        <p className="text-xs text-primary-600">
          Describe what you want this week. You can later wire this into real
          AI planning.
        </p>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-primary-200 bg-primary-50/50 px-3 py-2 text-sm text-primary-900 outline-none placeholder:text-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-primary-900">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-900">Dark mode</p>
            <p className="text-xs text-primary-600">
              Switch between light and dark themes.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`flex h-7 w-12 items-center rounded-full border border-primary-300 px-1 transition ${
              theme === 'dark' ? 'bg-primary-600' : 'bg-primary-200'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
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
  return (
    <FarcasterProvider>
      <AppShell />
    </FarcasterProvider>
  );
};

export default App;
