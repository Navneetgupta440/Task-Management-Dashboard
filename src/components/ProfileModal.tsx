import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, User, Mail, ShieldCheck, Calendar, CheckCircle2, Clock, ListTodo } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { user, updateProfile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshProfile();
    }
  }, [isOpen, refreshProfile]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), bio: bio.trim() });
      onSuccessToast('Profile updated successfully.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = user.stats || {
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    todo_tasks: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="profile-modal-content"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">My Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Node.js + PostgreSQL Profile (GET & PUT /api/v1/me)</p>
            </div>
          </div>
          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Info & Stats Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>{user.email}</span>
              </div>
              <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {user.role}
              </span>
            </div>

            {/* Task metrics for this user */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <ListTodo className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  Total
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{stats.total_tasks}</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  In Progress
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{stats.in_progress_tasks}</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  Completed
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{stats.completed_tasks}</div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                id="input-profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Bio / Title
              </label>
              <textarea
                id="input-profile-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Frontend specialist working on React & TypeScript interfaces..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>
                Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active session'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                id="btn-cancel-profile"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                id="btn-save-profile"
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
