import React, { useMemo, useState } from 'react';
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
import { AIService, type GeneratedWeeklyPlan, type GenerateWeeklyPlanInput, type AIProvider } from './services';
import type { Course, UserPreferences, Reminder } from './types';
import { Card, Button } from './components/ui';

type Theme = 'light' | 'dark';

type RoutineAnswers = {
  studyHours: string;
  sleepTime: string;
  wakeTime: string;
  sleepHours: string;
  classesScheduleImage: string | null; // data URL or null
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

const daysOfWeek: string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

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
const STORAGE_KEY_LAST_PLAN = 'ai-timetable:last-weekly-plan';

type StoredWeeklyPlan = {
  plan: GeneratedWeeklyPlan;
  weekStart: string;
  weekEnd: string;
  generatedAt?: string;
};

const defaultCourses: Course[] = [
  {
    id: 'course-1',
    name: 'Mathematics I',
    code: 'MATH101',
    credits: 3,
    priority: 'high',
    color: '#0ea5e9',
  },
  {
    id: 'course-2',
    name: 'Computer Science',
    code: 'CS102',
    credits: 4,
    priority: 'high',
    color: '#22c55e',
  },
  {
    id: 'course-3',
    name: 'English',
    code: 'ENG103',
    credits: 2,
    priority: 'medium',
    color: '#a855f7',
  },
];

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

function buildPreferencesFromRoutine(routine: RoutineAnswers): UserPreferences {
  const studyHours = Number(routine.studyHours || '4');
  return {
    studyHoursPerDay: Number.isFinite(studyHours) && studyHours > 0 ? studyHours : 4,
    sleepStart: routine.sleepTime || '23:00',
    sleepEnd: routine.wakeTime || '07:00',
    breakDuration: 10,
    preferredStudyDays: daysOfWeek.slice(0, 5) as UserPreferences['preferredStudyDays'],
  };
}

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
    if (answers.sleepHours) {
      plan.push(`${answers.sleepHours} hours of sleep`);
    }
    if (answers.hobbiesTime) {
      plan.push(`Hobbies: ${answers.hobbiesTime}`);
    }
    if (answers.freeTime) {
      plan.push(`Free time: ${answers.freeTime}`);
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
        Welcome to your AI-powered study planner
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="rounded-full bg-primary-600 px-8 py-3 text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Start
      </button>
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
    { path: '/dashboard/weekly-plan', label: 'Weekly plan' },
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
                  className="mt-3 w-full rounded-full border border-rose-500/70 px-3 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
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
        </div>

        <section className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <div className="relative">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardHome
                    today={today}
                    todayPlan={todayPlan}
                    routine={routine}
                  />
                }
              />
              <Route path="/time-tracker" element={<TimeTrackerScreen />} />
              <Route
                path="/weekly-plan"
                element={<WeeklyPlanScreen routine={routine} />}
              />
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
          </div>
        </div>
      )}
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
  const [todaySlots, setTodaySlots] = useState<
    { courseId: string; day: string; startTime: string; endTime: string; type: string }[]
  >([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST_PLAN);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredWeeklyPlan;
      if (!stored?.plan?.slots) return;
      const todayName = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
      });
      const slotsForToday = stored.plan.slots.filter(
        (slot) => slot.day === todayName
      );
      setTodaySlots(slotsForToday);
    } catch {
      // ignore parse errors
    }
  }, []);

  const getCourseForId = (courseId: string) =>
    defaultCourses.find((course) => course.id === courseId);

  const hasAiPlanToday = todaySlots.length > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-primary-100">
          Today&apos;s timetable
        </p>
        <h2 className="mt-1 text-xl font-semibold">
          Here&apos;s your plan for today
        </h2>
        <p className="mt-1 text-xs text-primary-100">{today}</p>
        {hasAiPlanToday ? (
          <ul className="mt-3 space-y-2 text-sm">
            {todaySlots
              .slice()
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((slot, index) => {
                const course = getCourseForId(slot.courseId);
                return (
                  <li
                    key={`${slot.courseId}-${slot.startTime}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">
                          {course?.code || 'Study session'}
                        </span>
                        <span className="text-[11px] text-primary-100/90">
                          {course?.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-primary-50/90">
                      <p>
                        {slot.startTime}–{slot.endTime}
                      </p>
                      <p className="capitalize">{slot.type}</p>
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {todayPlan.length === 0 ? (
              <li className="text-primary-100">
                No AI timetable for today yet. Go to Weekly plan to generate
                your schedule.
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
        )}
      </section>
    </div>
  );
};

const TimeTrackerScreen: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('study');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    defaultCourses[0]?.id ?? ''
  );
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
          if (parsed.courseId) {
            setSelectedCourseId(parsed.courseId);
          }
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
    if (mode === 'study' && !selectedCourseId) {
      return;
    }
    const startedAt = new Date().toISOString();
    const timer = {
      mode,
      courseId: mode === 'study' ? selectedCourseId : null,
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

  const getCourseForId = (courseId?: string) =>
    defaultCourses.find((course) => course.id === courseId);

  const recentSessions = sessions.slice(0, 10);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary-900">Time tracker</h2>
      <p className="text-sm text-primary-600">
        Track your focused study, sleep and scrolling with timers that keep
        running even if you close the app.
      </p>

      <div className="flex flex-wrap gap-2">
        {(['study', 'scroll', 'sleep'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            disabled={isRunning}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              mode === value
                ? 'bg-primary-600 text-white'
                : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
            } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {value}
          </button>
        ))}
      </div>

      <Card className="flex flex-col items-center text-center">
        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-primary-600">
          Current session
        </p>
        <p className="mb-1 text-sm font-medium capitalize text-primary-900">
          {mode}
        </p>

        {mode === 'study' && (
          <div className="mb-3 flex flex-col items-center gap-1 text-xs text-primary-700">
            <label htmlFor="time-tracker-course" className="font-medium">
              Course
            </label>
            <select
              id="time-tracker-course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={isRunning}
              className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs text-primary-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 disabled:opacity-60"
            >
              {defaultCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="mb-4 text-4xl font-mono tabular-nums text-primary-900">
          {formatTime(elapsedSeconds)}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            size="md"
            onClick={handleStart}
            disabled={isRunning}
          >
            Start
          </Button>
          <Button
            type="button"
            size="md"
            variant="secondary"
            onClick={handleStop}
            disabled={!isRunning}
          >
            Stop & save
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-900">
            Session history
          </h3>
          {sessions.length > 0 && (
            <p className="text-[11px] text-primary-500">
              Showing last {recentSessions.length} session
              {recentSessions.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {sessions.length === 0 ? (
          <p className="text-xs text-primary-500">
            No sessions yet. Start a timer above to log your first study, sleep
            or scroll session.
          </p>
        ) : (
          <ul className="divide-y divide-primary-100 text-xs">
            {recentSessions.map((session) => {
              const course = getCourseForId(session.courseId);
              const started = new Date(session.startedAt);
              const labelDate = started.toLocaleDateString(undefined, {
                weekday: 'short',
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
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium capitalize text-primary-900">
                      {session.mode}
                      {session.mode === 'study' && course
                        ? ` • ${course.code}`
                        : ''}
                    </span>
                    <span className="text-[11px] text-primary-500">
                      {labelDate} at {labelTime}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-primary-900">
                      {formatTime(session.durationSeconds)}
                    </span>
                    {session.mode === 'study' && course && (
                      <p className="text-[11px] text-primary-500">
                        {course.name}
                      </p>
                    )}
                  </div>
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
    const start = new Date(startStr);
    const end = new Date(startStr);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const { start, end } = computeWeekRange(weekStart);

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
      color: 'bg-sky-500',
    },
    {
      key: 'scroll' as const,
      label: 'Scroll hours',
      value: toHours(totalByMode.scroll),
      color: 'bg-rose-500',
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
      <p className="text-sm text-primary-600">
        See how much time you&apos;ve spent studying, sleeping and scrolling for
        any week, based on your time tracker history.
      </p>

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

      {sessionsInWeek.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-4 text-xs text-primary-600">
          <p className="font-medium text-primary-800">
            No report for this week yet.
          </p>
          <p className="mt-1">
            Start the time tracker on study, sleep or scroll to build up history.
            Once you have sessions in a full week, your weekly reports will
            appear here.
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

type WeeklyPlanScreenProps = {
  routine: RoutineAnswers;
};

const WeeklyPlanScreen: React.FC<WeeklyPlanScreenProps> = ({ routine }) => {
  const [plan, setPlan] = useState<GeneratedWeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { weekStart: defaultWeekStart, weekEnd: defaultWeekEnd } = getCurrentWeekRange();
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [weekEnd, setWeekEnd] = useState(defaultWeekEnd);

  const [courses] = useState<Course[]>(defaultCourses);

  const preferences = useMemo(() => buildPreferencesFromRoutine(routine), [routine]);

  const aiService = useMemo(() => {
    const providerEnv = (process.env.REACT_APP_AI_PROVIDER as AIProvider | undefined) ?? 'openai';
    const apiKey = process.env.REACT_APP_AI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new AIService({
      provider: providerEnv,
      apiKey,
    });
  }, []);

  const handleWeekStartChange = (value: string) => {
    setWeekStart(value);
    if (!value) return;
    const startDate = new Date(value);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    setWeekEnd(endDate.toISOString().slice(0, 10));
  };

  const handleGenerate = async () => {
    if (!aiService) {
      setError(
        'AI is not configured. Please set REACT_APP_AI_PROVIDER and REACT_APP_AI_API_KEY in your .env file.'
      );
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const input: GenerateWeeklyPlanInput = {
        courses,
        preferences,
        weekStart,
        weekEnd,
      };
      const result = await aiService.generateWeeklyPlan(input);
      setPlan(result);

      try {
        const stored: StoredWeeklyPlan = {
          plan: result,
          weekStart,
          weekEnd,
          generatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY_LAST_PLAN, JSON.stringify(stored));
      } catch {
        // ignore storage errors for last plan
      }

      try {
        const existingRaw = localStorage.getItem(STORAGE_KEY_REMINDERS);
        const existing: Reminder[] = existingRaw ? JSON.parse(existingRaw) : [];
        const weekStartDate = new Date(weekStart);
        const dayIndex: Record<string, number> = {
          Monday: 0,
          Tuesday: 1,
          Wednesday: 2,
          Thursday: 3,
          Friday: 4,
          Saturday: 5,
          Sunday: 6,
        };

        const newReminders: Reminder[] = (result.slots || [])
          .filter((slot) => slot.type === 'study')
          .map((slot) => {
            const offset = dayIndex[slot.day] ?? 0;
            const date = new Date(weekStartDate);
            date.setDate(date.getDate() + offset);

            const [hours, minutes] = slot.startTime.split(':').map((v) => parseInt(v, 10));
            if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
              date.setHours(hours, minutes, 0, 0);
            }

            const course = courses.find((c) => c.id === slot.courseId);
            const title = course ? `Study: ${course.code}` : 'Study session';

            return {
              id: `rem-${slot.courseId}-${date.getTime()}`,
              title,
              description: course?.name ?? '',
              datetime: date.toISOString(),
              type: 'study' as const,
              completed: false,
              courseId: slot.courseId,
            };
          });

        const withoutFutureStudy = existing.filter((reminder) => {
          if (reminder.type !== 'study') return true;
          const time = Date.parse(reminder.datetime);
          if (Number.isNaN(time)) return true;
          return time < Date.now();
        });

        const merged = [...withoutFutureStudy, ...newReminders];
        localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(merged));
      } catch {
        // ignore reminder storage errors
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate weekly plan. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getCourseForId = (courseId: string) =>
    courses.find((course) => course.id === courseId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">Weekly plan</h2>
          <p className="mt-1 text-sm text-primary-600">
            Generate a week-by-week timetable from your routine and courses, then
            view it in a clean grid.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 text-xs text-primary-600 md:items-end">
          <div className="flex items-center gap-2">
            <label htmlFor="week-start" className="text-xs font-medium">
              Week starting
            </label>
            <input
              id="week-start"
              type="date"
              value={weekStart}
              onChange={(e) => handleWeekStartChange(e.target.value)}
              className="rounded-lg border border-primary-200 bg-white px-2 py-1.5 text-xs text-primary-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <p className="text-[11px]">
            {weekStart && weekEnd ? `Week: ${weekStart} → ${weekEnd}` : null}
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-600">
              Inputs
            </p>
            <p className="text-sm text-primary-800">
              Using your routine to aim for{' '}
              <span className="font-semibold">
                {preferences.studyHoursPerDay}h/day
              </span>{' '}
              of focused study with a{' '}
              <span className="font-semibold">
                {preferences.breakDuration} min
              </span>{' '}
              break and nights from{' '}
              <span className="font-semibold">
                {preferences.sleepStart}–{preferences.sleepEnd}
              </span>
              .
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-primary-700">
              {courses.map((course) => (
                <span
                  key={course.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 ring-1 ring-primary-200/70"
                >
                  <span className="h-2 w-2 rounded-full ring-2 ring-primary-200"
                    style={{ backgroundColor: course.color || '#4f46e5' }}
                  />
                  <span className="font-medium">{course.code}</span>
                  <span className="text-[11px] text-primary-500">
                    {course.priority} priority
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            <Button
              type="button"
              size="md"
              onClick={handleGenerate}
              isLoading={isGenerating}
            >
              Generate weekly plan
            </Button>
            {error && (
              <p className="max-w-xs text-xs font-medium text-rose-600">{error}</p>
            )}
            {!aiService && !error && (
              <p className="max-w-xs text-xs text-amber-600">
                AI is not configured yet. Add your provider and API key in{' '}
                <code className="rounded bg-primary-50 px-1 py-0.5 text-[10px]">
                  .env
                </code>{' '}
                to enable this feature.
              </p>
            )}
          </div>
        </div>

        {plan && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary-600">
                  AI summary
                </p>
                <p className="text-sm text-primary-800">{plan.summary}</p>
              </div>
              {plan.suggestions.length > 0 && (
                <div className="max-w-sm rounded-xl bg-primary-50/80 p-3 text-xs text-primary-700 ring-1 ring-primary-200/70">
                  <p className="mb-1 font-semibold text-primary-800">
                    Suggestions
                  </p>
                  <ul className="space-y-1">
                    {plan.suggestions.map((suggestion) => (
                      <li key={suggestion} className="flex items-start gap-2">
                        <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-primary-400" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-2">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary-600">
                Weekly timetable
              </p>
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                {daysOfWeek.map((day) => {
                  const slotsForDay = (plan.slots || [])
                    .filter((slot) => slot.day === day)
                    .slice()
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={day}
                      className="flex flex-col rounded-2xl bg-white/80 p-3 shadow-soft ring-1 ring-primary-200/70"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
                          {day}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        {slotsForDay.length === 0 ? (
                          <p className="mt-4 text-center text-[11px] text-primary-400">
                            No sessions
                          </p>
                        ) : (
                          slotsForDay.map((slot, index) => {
                            const course = getCourseForId(slot.courseId);
                            const color = course?.color || '#4f46e5';
                            return (
                              <div
                                key={`${slot.courseId}-${slot.startTime}-${index}`}
                                className="rounded-xl border border-primary-100 bg-primary-50/70 px-2.5 py-2 text-xs shadow-sm"
                              >
                                <div className="mb-0.5 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="font-semibold text-primary-900">
                                      {course?.code || 'Session'}
                                    </span>
                                  </div>
                                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-primary-600">
                                    {slot.type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-primary-600">
                                  {slot.startTime}–{slot.endTime}
                                </p>
                                {course?.name && (
                                  <p className="mt-0.5 text-[11px] text-primary-500">
                                    {course.name}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>
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
        <p className="text-xs text-primary-600">
          Quickly review or update your current routine.
        </p>
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

      <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-rose-900">Danger Zone</h3>
        <p className="text-xs text-rose-600">
          Removes your account and data stored in this browser on this device. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="mt-2 inline-flex items-center rounded-full border border-rose-400 bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
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
            <p className="mb-4 text-sm text-primary-600">
              This will remove your account from this browser&apos;s storage, including:
            </p>
            <ul className="mb-4 space-y-1 text-sm text-primary-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>Your saved email login and routine</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>Weekly plans and reports stored here</span>
              </li>
            </ul>
            <p className="mb-6 text-sm font-medium text-rose-600">
              This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mb-3 text-xs font-medium text-rose-600">{deleteError}</p>
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
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
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
