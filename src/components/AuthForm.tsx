import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { UserRole } from '../types.ts';
import { ShieldCheck, UserCheck, User, Lock, Mail, UserPlus, LogIn, AlertCircle, Sparkles, Check, Sun, Moon } from 'lucide-react';

interface AuthFormProps {
  onSuccessToast: (msg: string) => void;
  onOpenDocs: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccessToast, onOpenDocs }) => {
  const { login, signup } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // Validate form before submission
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address (e.g. name@domain.com).';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        errors.name = 'Full name is required.';
      } else if (name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters.';
      }

      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        onSuccessToast('Welcome back! Successfully authenticated.');
      } else {
        await signup(name.trim(), email.trim(), password, role);
        onSuccessToast(`Account created as ${role.toUpperCase()}! Welcome to TaskHub.`);
      }
    } catch (err: any) {
      setServerError(err.message || 'Authentication request failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-click demo login helper
  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string, roleName: string) => {
    setServerError(null);
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSubmitting(true);
    try {
      await login(demoEmail, demoPass);
      onSuccessToast(`Signed in as demo ${roleName}!`);
    } catch (err: any) {
      setServerError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
      {/* Theme Toggle in top right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          id="auth-theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer flex items-center gap-2 text-xs font-semibold"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Top branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 p-2 mb-4 shadow-md border border-slate-200 dark:border-slate-800">
          <img
            id="auth-brand-logo"
            src="/logo.png"
            alt="TaskHub Logo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          TaskHub Portal
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Plan, Track, Get Things Done • PostgreSQL &amp; JWT Auth
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Quick Demo Credentials Card */}
        <div id="quick-demo-logins" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              1-Click Demo Login Credentials
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Pre-seeded
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              id="btn-demo-admin"
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDemoLogin('admin@primetrade.ai', 'Admin@123', 'Administrator')}
              className="flex flex-col items-center p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-1 font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Admin
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Full access</span>
            </button>

            <button
              id="btn-demo-manager"
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDemoLogin('manager@primetrade.ai', 'Manager@123', 'Manager')}
              className="flex flex-col items-center p-3 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-950/70 text-blue-900 dark:text-blue-200 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-1 font-bold text-xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Manager
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Team lead</span>
            </button>

            <button
              id="btn-demo-user"
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDemoLogin('user@primetrade.ai', 'User@123', 'Member')}
              className="flex flex-col items-center p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-1 font-bold text-xs">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                User
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Own tasks</span>
            </button>
          </div>
        </div>

        {/* Main Card with Login / Signup Tabs */}
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 sm:rounded-2xl sm:px-10">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-6 border border-slate-200 dark:border-slate-700">
            <button
              id="tab-mode-login"
              type="button"
              onClick={() => {
                setMode('login');
                setServerError(null);
                setClientErrors({});
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-mode-signup"
              type="button"
              onClick={() => {
                setMode('signup');
                setServerError(null);
                setClientErrors({});
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Server Error Banner */}
          {serverError && (
            <div id="server-error-banner" className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">
                <span className="font-semibold block">Authentication Error</span>
                {serverError}
              </div>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="input-signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rajiv Gupta"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition ${
                        clientErrors.name
                          ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {clientErrors.name && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{clientErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Account Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['user', 'manager', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase border transition cursor-pointer text-center ${
                          role === r
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    RBAC role determines access to task deletion and admin management.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@primetrade.ai"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition ${
                    clientErrors.email
                      ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
              </div>
              {clientErrors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{clientErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition ${
                    clientErrors.password
                      ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
              </div>
              {clientErrors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{clientErrors.password}</p>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 transition ${
                      clientErrors.confirmPassword
                        ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {clientErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{clientErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register with PostgreSQL
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>🔒 Passwords encrypted via bcrypt</span>
            <button
              id="auth-footer-open-docs"
              type="button"
              onClick={onOpenDocs}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium hover:underline cursor-pointer"
            >
              View API Architecture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
