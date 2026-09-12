import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { ShieldCheck, UserCheck, User, LogOut, Code2, Database, UserCog, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  currentTab: 'tasks' | 'admin';
  setCurrentTab: (tab: 'tasks' | 'admin') => void;
  onOpenProfile: () => void;
  onOpenDocs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenProfile,
  onOpenDocs,
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  if (!user) return null;

  const role = user.role;

  return (
    <header id="app-navbar" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Badges */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('tasks')}>
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center shrink-0">
                <img
                  id="navbar-brand-logo"
                  src="/logo.png"
                  alt="TaskHub Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">TaskHub</span>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    PostgreSQL
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
                  Plan, Track, Get Things Done
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 pl-4 border-l border-slate-200 dark:border-slate-800">
              <button
                id="nav-tab-tasks"
                onClick={() => setCurrentTab('tasks')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                  currentTab === 'tasks'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                Tasks
              </button>

              {role === 'admin' && (
                <button
                  id="nav-tab-admin"
                  onClick={() => setCurrentTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                    currentTab === 'admin'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <UserCog className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Admin Console
                </button>
              )}
            </nav>
          </div>

          {/* Right Action Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Architecture & API Docs Button */}
            <button
              id="nav-btn-docs"
              onClick={onOpenDocs}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="View Architecture, OpenAPI Specs, and Production Guide"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              API & Arch Specs
            </button>

            {/* Dark Mode Theme Toggle */}
            <button
              id="nav-btn-theme-toggle"
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-800"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Role Badge */}
            <div
              id="user-role-badge"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                role === 'admin'
                  ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : role === 'manager'
                  ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />}
              {role === 'manager' && <UserCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}
              {role === 'user' && <User className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />}
              <span>{role}</span>
            </div>

            {/* User Profile Trigger */}
            <button
              id="nav-btn-profile"
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition text-sm font-medium cursor-pointer"
              title="Edit Profile"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 dark:bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                {user.name.charAt(0)}
              </div>
              <span className="hidden sm:inline-block max-w-[130px] truncate text-slate-800 dark:text-slate-200 font-medium">
                {user.name}
              </span>
            </button>

            {/* Logout Button */}
            <button
              id="nav-btn-logout"
              onClick={logout}
              className="flex items-center gap-1 p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

