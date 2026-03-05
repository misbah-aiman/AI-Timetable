import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import type { User } from '../../types';

export type LayoutNavItem = {
  label: string;
  path: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type LayoutProps = {
  user: User;
  /** Optional override for navigation items; defaults to main dashboard pages. */
  navItems?: LayoutNavItem[];
  children: React.ReactNode;
};

const defaultNavItems: LayoutNavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Time tracker', path: '/dashboard/time-tracker', icon: ClockIcon },
  { label: 'Weekly report', path: '/dashboard/weekly-report', icon: ChartBarIcon },
  { label: 'Settings', path: '/dashboard/settings', icon: Cog6ToothIcon },
];

export const Layout: React.FC<LayoutProps> = ({ user, navItems, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const items = navItems && navItems.length > 0 ? navItems : defaultNavItems;

  const initials = useMemo(() => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }, [user]);

  const activeLabel = useMemo(() => {
    const current = items.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)
    );
    return current?.label ?? 'Overview';
  }, [items, location.pathname]);

  const renderNavList = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.path}>
          <NavLink
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            {item.icon && (
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-950 shadow-xl ring-1 ring-slate-800 transition-transform md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500 text-xs font-semibold">
              AI
            </span>
            <span className="text-sm font-semibold tracking-tight">
              AI Timetable
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close sidebar</span>
          </button>
        </div>
        <div className="px-3 py-4">{renderNavList(() => setSidebarOpen(false))}</div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950/90 md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b border-slate-800 px-6 py-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-500 text-sm font-semibold">
            AI
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">AI Timetable</p>
            <p className="text-xs text-slate-400">Your daily routine, organized</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4">{renderNavList()}</nav>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-200 hover:bg-slate-800 md:hidden"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Open sidebar</span>
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Dashboard
              </p>
              <h1 className="text-base font-semibold text-slate-50 sm:text-lg">
                {activeLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden max-w-[12rem] text-right text-xs sm:block">
              <p className="font-medium text-slate-100 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100 ring-1 ring-slate-700">
              {initials}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 px-4 py-4 md:px-6 md:py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
