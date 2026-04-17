import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth, ProtectedRoute } from './components/auth';
import { LoginPage, SignupPage, Onboarding } from './pages';
import { FarcasterProvider } from './context/FarcasterContext';
import {
  getRoutine,
  fetchDailyTimetable,
  type GeneratedDailyPlan,
} from './services';
import type { Reminder } from './types';
import { Card, Button } from './components/ui';

type Theme = 'light' | 'dark';

type RoutineAnswers = {
  studyHours: string;
  sleepTime: string;
  wakeTime: string;
  sleepHours: string;
  classesScheduleImage: string | null;
  hobbiesTime: string;
  scrollHours: string;
  freeTime: string;
};

const defaultRoutine: RoutineAnswers = {
  studyHours: '',
  sleepTime: '',
  wakeTime: '',
  sleepHours: '',
  classesScheduleImage: null,
  hobbiesTime: '',
  scrollHours: '',
  freeTime: '',
};

type TimerMode = 'study' | 'scroll' | 'sleep';

type TrackedSession = {
  id: string;
  mode: TimerMode;
  courseId?: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

const STORAGE_KEY_SESSIONS = 'ai-timetable:sessions';
const STORAGE_KEY_ACTIVE_TIMER = 'ai-timetable:active-timer';
const STORAGE_KEY_REMINDERS = 'ai-timetable:reminders';
const STORAGE_KEY_DAILY_PLAN = 'ai-timetable:daily-ai-plan';

type StoredDailyPlan = {
  plan: GeneratedDailyPlan;
  date: string;
  generatedAt: string;
};

function getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d: Date) => d.toISOString().slice(0, 10);
  return { weekStart: format(monday), weekEnd: format(sunday) };
}

/** Local calendar YYYY-MM-DD (not UTC) — use for cache keys and week boundaries. */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Display API timetable "HH:MM" as locale 12-hour time (e.g. 9:00 AM). */
function formatTime12h(hhmm: string): string {
  const m = String(hhmm ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return hhmm;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const SESSION_AUTO_GENERATE_DAILY = 'ai-timetable:auto-generate-after-analyze';

/** Short, non-technical message for the timetable card (avoid raw API errors in UI). */
function friendlyDailyPlanError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('cannot reach') || m.includes('failed to fetch')) {
    return "We couldn't reach the schedule service. Check your connection and try again.";
  }
  if (
    m.includes('429') ||
    m.includes('quota') ||
    m.includes('billing') ||
    m.includes('rate limit')
  ) {
    return 'The planner is temporarily unavailable. Please try again in a little while.';
  }
  if (m.includes('503') || m.includes('openai api key') || m.includes('no openai')) {
    return "Today's planner isn't available on this device yet. Please try again later.";
  }
  if (message.length > 160) {
    return 'Something went wrong while building your timetable. Please try again.';
  }
  return message;
}

function routineToPayload(routine: RoutineAnswers) {
  return {
    studyHours: routine.studyHours,
    sleepTime: routine.sleepTime,
    wakeTime: routine.wakeTime,
    sleepHours: routine.sleepHours,
    classesScheduleImage: routine.classesScheduleImage,
    hobbiesTime: routine.hobbiesTime,
    scrollHours: routine.scrollHours,
    freeTime: routine.freeTime,
  };
}

const AppShell: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const [theme, setTheme] = useState<Theme>('light');
  const [routine, setRoutine] = useState<RoutineAnswers>(defaultRoutine);
  const previousUserIdRef = useRef<string | undefined>(undefined);

  // Clear previous account's routine from memory as soon as the logged-in user id changes,
  // so signup / switch never shows another user's answers before async load runs.
  useLayoutEffect(() => {
    if (!isAuthenticated) {
      previousUserIdRef.current = undefined;
      return;
    }
    if (!user?.id) return;
    if (previousUserIdRef.current !== user.id) {
      previousUserIdRef.current = user.id;
      setRoutine(defaultRoutine);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;
    (async () => {
      const saved = await getRoutine(user.id);
      if (cancelled) return;
      if (saved) {
        setRoutine({
          studyHours: saved.studyHours ?? '',
          sleepTime: saved.sleepTime ?? '',
          wakeTime: saved.wakeTime ?? '',
          sleepHours: saved.sleepHours ?? '',
          classesScheduleImage: saved.classesScheduleImage ?? null,
          hobbiesTime: saved.hobbiesTime ?? '',
          scrollHours: saved.scrollHours ?? '',
          freeTime: saved.freeTime ?? '',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const handleLogout = () => {
    logout();
    setRoutine(defaultRoutine);
  };

  const handleRoutineComplete = (answers: RoutineAnswers) => {
    setRoutine(answers);
  };

  const toggleTheme = () => {
    setTheme('light');
  };

  const appClasses = useMemo(
    () =>
      theme === 'light'
        ? 'min-h-screen bg-white text-primary-900'
        : 'min-h-screen bg-white text-primary-900',
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
              <Navigate to="/signup" replace />
            )
          }
        />
        <Route
          path="/auth"
          element={
            <Navigate to="/signup" replace />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <SignupPage />
            )
          }
        />
        <Route
          path="/routine"
          element={
            <ProtectedRoute>
              <Onboarding
                key={user?.id ?? 'onboarding'}
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

const AnalyzeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 10;
        if (next >= 100) {
          clearInterval(interval);
          sessionStorage.setItem(SESSION_AUTO_GENERATE_DAILY, '1');
          navigate('/dashboard', { replace: true });
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-50 px-4 text-center">
      <h2 className="mb-2 text-2xl font-semibold text-primary-900">
        Analyzing your routine
      </h2>
      <p className="mb-6 text-sm text-primary-600">
        Creating your daily plan based on your preferences…
      </p>
      <div className="mb-3 h-2 w-64 overflow-hidden rounded-full bg-primary-200">
        <div
          className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-primary-600">
        Analysing…
      </p>
    </div>
  );
};

type DashboardLayoutProps = {
  theme: Theme;
  onToggleTheme: () => void;
  routine: RoutineAnswers;
  onLogout: () => void;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  theme,
  onToggleTheme,
  routine,
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

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
      <header className={`flex items-center justify-between border-b px-4 py-3 sm:px-6 ${isLight ? 'border-primary-200 bg-white/90' : 'border-slate-800 bg-slate-950/90'}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onMouseEnter={() => setSidebarHovered(true)}
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs transition ${
              isLight
                ? 'border-primary-200 bg-white text-primary-800 hover:bg-primary-50'
                : 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
            }`}
            aria-label="Open menu"
          >
            <span className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
            </span>
          </button>
          <div>
            <p className={`text-[11px] uppercase tracking-[0.2em] ${isLight ? 'text-primary-500' : 'text-slate-400'}`}>
              Home
            </p>
            <h1 className={`text-base font-semibold sm:text-lg ${isLight ? 'text-primary-900' : 'text-slate-50'}`}>
              Hi, {user?.name || user?.email || 'there'}
            </h1>
            <p className={`text-[11px] sm:text-xs ${isLight ? 'text-primary-600' : 'text-slate-400'}`}>
              {today}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold uppercase ${
                isLight
                  ? 'border-primary-300 bg-primary-50 text-primary-800'
                  : 'border-slate-700 bg-slate-900 text-slate-100'
              }`}
            >
              {(user?.name || user?.email || '?')
                .toString()
                .trim()
                .charAt(0)
                .toUpperCase()}
            </button>
            {profileOpen && (
              <div className={`absolute right-0 z-30 mt-2 w-56 rounded-2xl border p-3 text-xs shadow-soft ${
                isLight ? 'border-primary-200 bg-white' : 'border-slate-800 bg-slate-900'
              }`}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary-500">
                  Profile
                </p>
                <p className="mt-1 text-sm font-medium text-primary-900">
                  {user?.name || 'Student'}
                </p>
                <p className="truncate text-[11px] text-primary-600">
                  {user?.email}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                    navigate('/');
                  }}
                  className="mt-3 w-full rounded-full border border-primary-400 px-3 py-1.5 text-[11px] font-medium text-primary-700 hover:bg-primary-100"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col md:flex-row">
        {/* Desktop Sidebar - Appears on hover */}
        <div
          className="hidden md:block md:relative"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <nav
            className={`fixed left-0 top-[57px] bottom-0 z-20 w-52 border-r px-4 py-3 text-sm transition-transform duration-300 ${
              sidebarHovered ? 'translate-x-0' : '-translate-x-full'
            } ${isLight ? 'border-primary-200 bg-white/95 backdrop-blur-sm' : 'border-slate-800 bg-slate-950/95 backdrop-blur-sm'}`}
          >
            <ul className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setSidebarHovered(false);
                      }}
                      className={`w-full whitespace-nowrap rounded-full px-4 py-2 text-left text-xs font-medium transition ${
                        active
                          ? 'bg-primary-200 text-primary-800'
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
        </div>

        <section className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <div className="relative">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardHome
                    routine={routine}
                    isLight={theme === 'light'}
                  />
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
            <SoftReminders />
          </div>
        </section>
      </main>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="h-full flex-1 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className={`h-full w-64 max-w-[80%] border-l bg-white p-4 shadow-xl transition ${
              isLight ? 'border-primary-200 bg-white' : 'border-slate-800 bg-slate-950'
            }`}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-500">
              Menu
            </p>
            <ul className="space-y-1 text-sm">
              {menuItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setMenuOpen(false);
                      }}
                      className={`w-full rounded-full px-4 py-2 text-left text-xs font-medium transition ${
                        active
                          ? 'bg-primary-200 text-primary-800'
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
          </div>
        </div>
      )}
    </div>
  );
};

type DashboardHomeProps = {
  routine: RoutineAnswers;
  isLight: boolean;
};

const DashboardHome: React.FC<DashboardHomeProps> = ({ routine, isLight }) => {
  const [dailyPlan, setDailyPlan] = useState<GeneratedDailyPlan | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [, bumpClock] = useState(0);
  const autoRequestedDateRef = useRef<string | null>(null);

  const now = new Date();
  const todayIso = formatLocalYMD(now);

  React.useEffect(() => {
    const id = window.setInterval(() => bumpClock((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [bumpClock]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DAILY_PLAN);
      if (!raw) {
        setDailyPlan(null);
        setDailyError(null);
        return;
      }
      const stored = JSON.parse(raw) as StoredDailyPlan;
      if (stored?.date === todayIso && stored?.plan?.blocks?.length) {
        setDailyPlan(stored.plan);
        setDailyError(null);
      } else {
        setDailyPlan(null);
        setDailyError(null);
      }
    } catch {
      setDailyPlan(null);
      setDailyError(null);
    }
  }, [todayIso]);

  const handleGenerateDaily = useCallback(async () => {
    const payload = routineToPayload(routine);
    const dateStr = formatLocalYMD(new Date());
    const dayNameStr = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
    });
    setDailyLoading(true);
    setDailyError(null);
    try {
      const result = await fetchDailyTimetable(payload, dateStr, dayNameStr);
      setDailyPlan(result);
      const stored: StoredDailyPlan = {
        plan: result,
        date: dateStr,
        generatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_DAILY_PLAN, JSON.stringify(stored));
    } catch (err) {
      setDailyError(
        friendlyDailyPlanError(
          err instanceof Error ? err.message : 'Failed to generate daily timetable.'
        )
      );
    } finally {
      setDailyLoading(false);
    }
  }, [routine]);

  React.useEffect(() => {
    if (sessionStorage.getItem(SESSION_AUTO_GENERATE_DAILY) !== '1') return;
    sessionStorage.removeItem(SESSION_AUTO_GENERATE_DAILY);
    void handleGenerateDaily();
  }, [handleGenerateDaily]);

  const hasDailyBlocks = dailyPlan && dailyPlan.blocks.length > 0;

  // Automatically generate once per date when no cached plan exists.
  React.useEffect(() => {
    if (hasDailyBlocks || dailyLoading || dailyError) return;
    if (autoRequestedDateRef.current === todayIso) return;
    autoRequestedDateRef.current = todayIso;
    void handleGenerateDaily();
  }, [todayIso, hasDailyBlocks, dailyLoading, dailyError, handleGenerateDaily]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary-200 bg-white p-5 text-primary-900 shadow-soft">
        {dailyError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm text-primary-800"
          >
            <p className="font-semibold text-primary-900">Something went wrong</p>
            <p className="mt-1 text-[13px] leading-snug text-primary-700">{dailyError}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-600">
              Today&apos;s plan
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="border-primary-300 bg-primary-50 text-primary-800 hover:bg-primary-100"
              onClick={handleGenerateDaily}
              isLoading={dailyLoading}
            >
              {hasDailyBlocks ? "Refresh today's plan" : "Get today's plan"}
            </Button>
          </div>
        </div>

        {hasDailyBlocks && dailyPlan ? (
          <div className="mt-4 space-y-3">
            <div
              className={`overflow-hidden rounded-lg border shadow-sm ${
                isLight
                  ? 'border-primary-200 bg-primary-50 text-primary-900'
                  : 'border-primary-800/60 bg-primary-950/40 text-primary-50'
              }`}
            >
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr
                    className={
                      isLight
                        ? 'bg-primary-100 text-primary-900'
                        : 'bg-primary-900/55 text-primary-100'
                    }
                  >
                    <th
                      scope="col"
                      className={`border px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide ${
                        isLight ? 'border-primary-300' : 'border-primary-800'
                      }`}
                    >
                      Time
                    </th>
                    <th
                      scope="col"
                      className={`border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide ${
                        isLight ? 'border-primary-300' : 'border-primary-800'
                      }`}
                    >
                      Plan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dailyPlan.blocks
                    .slice()
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((block, index) => (
                      <tr
                        key={`${block.startTime}-${block.title}-${index}`}
                        className={
                          isLight
                            ? index % 2 === 0
                              ? 'bg-[#fff8f8]'
                              : 'bg-white'
                            : index % 2 === 0
                              ? 'bg-primary-950/25'
                              : 'bg-primary-900/20'
                        }
                      >
                        <td
                          className={`border px-2 py-2.5 text-center align-top text-xs font-medium tabular-nums ${
                            isLight ? 'border-primary-200 text-primary-900' : 'border-primary-800/70 text-primary-100'
                          }`}
                        >
                          {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)}
                        </td>
                        <td
                          className={`border px-3 py-2.5 align-top ${
                            isLight ? 'border-primary-200 text-primary-900' : 'border-primary-800/70 text-primary-50'
                          }`}
                        >
                          <span className="font-medium">{block.title}</span>
                          {block.detail ? (
                            <span className="mt-0.5 block text-[11px] leading-snug opacity-90">
                              {block.detail}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-primary-50 px-3 py-3 text-sm text-primary-700">
            <p className="font-medium text-primary-900">No plan for today yet</p>
            <p className="mt-1 text-[13px] leading-relaxed text-primary-700">
              We&apos;re creating your schedule automatically. You can still tap{' '}
              <strong className="text-primary-900">Refresh today&apos;s plan</strong> anytime.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

const TimeTrackerScreen: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('study');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessions, setSessions] = useState<TrackedSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<{
    mode: TimerMode;
    courseId?: string | null;
    startedAt: string;
  } | null>(null);

  React.useEffect(() => {
    try {
      const rawSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (rawSessions) {
        const parsed = JSON.parse(rawSessions) as TrackedSession[];
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }

    try {
      const rawActive = localStorage.getItem(STORAGE_KEY_ACTIVE_TIMER);
      if (rawActive) {
        const parsed = JSON.parse(rawActive) as {
          mode: TimerMode;
          courseId?: string | null;
          startedAt: string;
        };
        if (parsed && parsed.startedAt) {
          setActiveTimer(parsed);
          setMode(parsed.mode ?? 'study');
          const diffSeconds = Math.max(
            0,
            Math.floor((Date.now() - Date.parse(parsed.startedAt)) / 1000)
          );
          setElapsedSeconds(diffSeconds);
          setIsRunning(true);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  React.useEffect(() => {
    if (!isRunning || !activeTimer) return;
    const interval = setInterval(() => {
      const diffSeconds = Math.max(
        0,
        Math.floor((Date.now() - Date.parse(activeTimer.startedAt)) / 1000)
      );
      setElapsedSeconds(diffSeconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

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

  const handleStart = () => {
    if (isRunning) return;
    const startedAt = new Date().toISOString();
    const timer = {
      mode,
      courseId: null,
      startedAt,
    };
    setActiveTimer(timer);
    setElapsedSeconds(0);
    setIsRunning(true);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TIMER, JSON.stringify(timer));
    } catch {
      // ignore storage errors
    }
  };

  const handleStop = () => {
    if (!activeTimer) return;
    const now = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - Date.parse(activeTimer.startedAt)) / 1000)
    );
    if (durationSeconds > 0) {
      const newSession: TrackedSession = {
        id: `${now.getTime()}`,
        mode: activeTimer.mode,
        courseId: activeTimer.courseId ?? undefined,
        startedAt: activeTimer.startedAt,
        endedAt: now.toISOString(),
        durationSeconds,
      };
      setSessions((prev) => {
        const next = [newSession, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setActiveTimer(null);
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_TIMER);
    } catch {
      // ignore
    }
  };

  const recentSessions = sessions.slice(0, 10);
  const ringRadius = 98;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const cycleSeconds = 60 * 60;
  const ringProgress = (elapsedSeconds % cycleSeconds) / cycleSeconds;
  const ringOffset = ringCircumference * (1 - ringProgress);
  const modeMeta: Record<TimerMode, { label: string; short: string }> = {
    study: { label: 'Study', short: 'ST' },
    scroll: { label: 'Scroll', short: 'SC' },
    sleep: { label: 'Sleep', short: 'SL' },
  };
  const totalByMode = sessions.reduce(
    (acc, session) => {
      acc[session.mode] += session.durationSeconds;
      return acc;
    },
    { study: 0, scroll: 0, sleep: 0 } as Record<TimerMode, number>
  );

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <h2 className="text-center text-lg font-semibold text-primary-900">
        Stopwatch
      </h2>

      <Card className="px-4 py-5">
        <div className="flex flex-col items-center">
          <div className="relative h-64 w-64">
            <svg
              viewBox="0 0 220 220"
              className="h-full w-full -rotate-90"
              aria-hidden
            >
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                className="fill-none stroke-primary-100"
                strokeWidth="10"
              />
              <circle
                cx="110"
                cy="110"
                r={ringRadius}
                className="fill-none stroke-primary-600 transition-all duration-700 ease-linear"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-500">
                {modeMeta[mode].label}
              </p>
              <p className="mt-2 font-mono text-4xl tabular-nums text-primary-900">
                {formatTime(elapsedSeconds)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {(['study', 'scroll', 'sleep'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                disabled={isRunning}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  mode === value
                    ? 'border border-primary-500 bg-primary-100 text-primary-800'
                    : 'border border-primary-200 bg-white text-primary-700 hover:bg-primary-50'
                } ${isRunning ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {modeMeta[value].label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isRunning) return;
                setElapsedSeconds(0);
              }}
              disabled={isRunning || elapsedSeconds === 0}
              className="h-11 min-w-20 rounded-full border border-primary-300 bg-white px-4 text-sm font-medium text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={isRunning ? handleStop : handleStart}
              className="h-12 min-w-24 rounded-full border border-primary-500 bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-900">
            Session history
          </h3>
          <span className="text-[11px] text-primary-500">
            {recentSessions.length} recent
          </span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          {(['study', 'scroll', 'sleep'] as const).map((value) => (
            <div
              key={value}
              className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-1.5"
            >
              <p className="text-[10px] uppercase tracking-wide text-primary-500">
                {modeMeta[value].label}
              </p>
              <p className="mt-0.5 font-mono text-xs text-primary-900">
                {formatTime(totalByMode[value])}
              </p>
            </div>
          ))}
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-primary-500">No session yet.</p>
        ) : (
          <ul className="divide-y divide-primary-100 text-xs">
            {recentSessions.map((session, index) => {
              const started = new Date(session.startedAt);
              const labelDate = started.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              const labelTime = started.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                      {modeMeta[session.mode].short}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-primary-900">
                        Session {sessions.length - index}
                      </span>
                      <span className="text-[11px] text-primary-500">
                        {modeMeta[session.mode].label} • {labelDate} at {labelTime}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-primary-900">
                    +{formatTime(session.durationSeconds)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

const WeeklyReportScreen: React.FC = () => {
  const { weekStart: defaultWeekStart } = getCurrentWeekRange();
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [sessions, setSessions] = useState<TrackedSession[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw) as TrackedSession[];
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const computeWeekRange = (startStr: string) => {
    const [ys, ms, ds] = startStr.split('-').map((v) => parseInt(v, 10));
    const start = new Date(ys, ms - 1, ds);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const { start, end } = computeWeekRange(weekStart);
  const todayStr = formatLocalYMD(new Date());
  const weekEndStr = formatLocalYMD(end);
  const weekNotYetComplete = todayStr <= weekEndStr;

  const sessionsInWeek = sessions.filter((session) => {
    const time = Date.parse(session.startedAt);
    if (Number.isNaN(time)) return false;
    const d = new Date(time);
    return d >= start && d <= end;
  });

  const totalByMode = sessionsInWeek.reduce(
    (acc, session) => {
      acc[session.mode] += session.durationSeconds;
      return acc;
    },
    { study: 0, sleep: 0, scroll: 0 } as Record<TimerMode, number>
  );

  const toHours = (seconds: number) =>
    Math.round((seconds / 3600) * 10) / 10;

  const cards = [
    {
      key: 'study' as const,
      label: 'Study hours',
      value: toHours(totalByMode.study),
      color: 'bg-emerald-500',
    },
    {
      key: 'sleep' as const,
      label: 'Sleep hours',
      value: toHours(totalByMode.sleep),
      color: 'bg-primary-500',
    },
    {
      key: 'scroll' as const,
      label: 'Scroll hours',
      value: toHours(totalByMode.scroll),
      color: 'bg-primary-400',
    },
  ];

  const maxValue = Math.max(...cards.map((d) => d.value), 0.1);

  const handleShiftWeek = (direction: -1 | 1) => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + direction * 7);
    setWeekStart(current.toISOString().slice(0, 10));
  };

  const weekLabel = `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} → ${end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary-900">Weekly report</h2>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-white p-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleShiftWeek(-1)}
            className="rounded-full border border-primary-200 px-2 py-1 text-[11px] text-primary-700 hover:bg-primary-50"
          >
            ‹ Prev week
          </button>
          <button
            type="button"
            onClick={() => handleShiftWeek(1)}
            className="rounded-full border border-primary-200 px-2 py-1 text-[11px] text-primary-700 hover:bg-primary-50"
          >
            Next week ›
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="week-report-start" className="text-[11px] font-medium">
            Week starting
          </label>
          <input
            id="week-report-start"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs text-primary-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          />
          <span className="text-[11px] text-primary-500">{weekLabel}</span>
        </div>
      </div>

      {weekNotYetComplete ? (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-4 text-xs text-primary-600">
          <p className="font-medium text-primary-800">No report yet</p>
        </div>
      ) : sessionsInWeek.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-4 text-xs text-primary-600">
          <p className="font-medium text-primary-800">
            No tracked time for this week.
          </p>
          <p className="mt-1">
            Start the time tracker on study, sleep or scroll to build up history
            for this week.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex h-64 items-end justify-around rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
          {cards.map((item) => (
            <div
              key={item.key}
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
                  {item.value.toFixed(1)}h
                </p>
                <p className="mt-0.5 max-w-[6rem] text-[10px] text-primary-600">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SoftReminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REMINDERS);
      if (raw) {
        const parsed = JSON.parse(raw) as Reminder[];
        if (Array.isArray(parsed)) {
          setReminders(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const upcoming = reminders
    .filter((reminder) => {
      if (reminder.type !== 'study' || reminder.completed) return false;
      const time = Date.parse(reminder.datetime);
      if (Number.isNaN(time)) return false;
      const diffMinutes = (time - now) / 60000;
      return diffMinutes >= 0 && diffMinutes <= 15;
    })
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
    .slice(0, 3);

  const updateReminders = (next: Reminder[]) => {
    setReminders(next);
    try {
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleDismiss = (id: string) => {
    updateReminders(
      reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, completed: true } : reminder
      )
    );
  };

  const handleSnooze = (id: string) => {
    const next = reminders.map((reminder) => {
      if (reminder.id !== id) return reminder;
      const time = Date.parse(reminder.datetime);
      if (Number.isNaN(time)) return reminder;
      const newTime = new Date(time + 10 * 60000).toISOString();
      return { ...reminder, datetime: newTime };
    });
    updateReminders(next);
  };

  if (upcoming.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 space-y-2 sm:right-6">
      {upcoming.map((reminder) => {
        const when = new Date(reminder.datetime);
        const labelTime = when.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        });
        const diffMinutes = Math.round((Date.parse(reminder.datetime) - now) / 60000);
        const relative =
          diffMinutes <= 0 ? 'starting now' : `in ${diffMinutes} min${diffMinutes === 1 ? '' : 's'}`;

        return (
          <div
            key={reminder.id}
            className="pointer-events-auto w-72 max-w-full rounded-2xl bg-white/95 p-3 shadow-soft ring-1 ring-primary-200/80 backdrop-blur"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary-500">
              Soft reminder
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-900">
              {reminder.title}
            </p>
            {reminder.description && (
              <p className="text-xs text-primary-600">{reminder.description}</p>
            )}
            <p className="mt-1 text-[11px] text-primary-500">
              At {labelTime} · {relative}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => handleSnooze(reminder.id)}
              >
                Snooze 10 min
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={() => handleDismiss(reminder.id)}
              >
                Got it
              </Button>
            </div>
          </div>
        );
      })}
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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState(
    'Stay consistent with study, protect sleep, and reduce doom‑scrolling.'
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const { deleteAccount } = await import('./services');
      await deleteAccount(user.id);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-primary-900">Settings</h2>

      <section className="space-y-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-primary-900">Routine summary</h3>
        <ul className="mt-2 space-y-1 text-sm text-primary-800">
          <li>Wake: {routine.wakeTime || 'Not set'}</li>
          <li>Sleep: {routine.sleepTime || 'Not set'}</li>
          <li>Sleep hours: {routine.sleepHours ? `${routine.sleepHours} hrs` : 'Not set'}</li>
          <li>
            Study goal:{' '}
            {routine.studyHours ? `${routine.studyHours} hrs` : 'Not set'}
          </li>
          <li>
            Scroll limit:{' '}
            {routine.scrollHours ? `${routine.scrollHours} hrs` : 'Not set'}
          </li>
          {routine.hobbiesTime && (
            <li>Hobbies: {routine.hobbiesTime}</li>
          )}
          {routine.freeTime && (
            <li>Free time: {routine.freeTime}</li>
          )}
          {routine.classesScheduleImage && (
            <li>Classes schedule: image uploaded</li>
          )}
        </ul>
        <button
          type="button"
          onClick={() =>
            navigate('/routine', {
              state: { fromSignup: true },
            })
          }
          className="mt-3 inline-flex items-center rounded-full border border-primary-300 px-3 py-1.5 text-xs font-medium text-primary-800 hover:bg-primary-50"
        >
          Edit routine
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-primary-900">Change goals</h3>
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
            <p className="text-sm text-primary-900">Theme</p>
            <p className="text-xs text-primary-600">White + emerald contrast</p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            disabled
            className="flex h-7 w-12 items-center rounded-full border border-primary-300 bg-primary-200 px-1 transition disabled:cursor-not-allowed"
          >
            <span className="h-5 w-5 rounded-full bg-white shadow-sm transition" />
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-primary-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-primary-900">Danger Zone</h3>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="mt-2 inline-flex items-center rounded-full border border-primary-400 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Delete Account
        </button>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-primary-900">
              Delete Account?
            </h3>
            <p className="mb-6 text-sm font-medium text-primary-700">
              This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mb-3 text-xs font-medium text-primary-700">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-primary-400 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
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
