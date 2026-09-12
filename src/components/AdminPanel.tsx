import React, { useState, useEffect } from 'react';
import { AdminUserListItem, AdminStats, UserRole } from '../types.ts';
import { adminApi } from '../api.ts';
import { ShieldCheck, Users, Database, Server, RefreshCw, AlertCircle } from 'lucide-react';

interface AdminPanelProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getStats(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to load admin management data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      const res = await adminApi.updateRole(userId, newRole);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        onSuccessToast(`User role updated to ${newRole.toUpperCase()}.`);
        // Refresh stats
        const statsRes = await adminApi.getStats();
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
      }
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div id="admin-management-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
              RBAC Protected
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage PostgreSQL users, modify privilege roles, and inspect database system metrics.
          </p>
        </div>

        <button
          id="btn-admin-refresh"
          onClick={loadAdminData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Users</span>
              <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {stats.users.total_users}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registered in PostgreSQL
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tasks Total</span>
              <Database className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {stats.tasks.total_tasks}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {stats.tasks.completed_tasks} completed
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Database Engine</span>
              <Server className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-2">
              PostgreSQL
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ACID Compliant • Relational
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Architecture</span>
              <ShieldCheck className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
              JWT + bcrypt (10 rounds)
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              No plain text passwords
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered PostgreSQL Users</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-6">User</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Role (RBAC)</th>
                <th className="py-3.5 px-6">Tasks Count</th>
                <th className="py-3.5 px-6">Joined Date</th>
                <th className="py-3.5 px-6 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {users.map((u) => {
                const isUpdating = updatingUserId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div>{u.name}</div>
                        {u.bio && <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">{u.bio}</div>}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {u.email}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : u.role === 'manager'
                            ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium">
                      {u.task_count} tasks
                    </td>

                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <select
                        id={`select-role-${u.id}`}
                        value={u.role}
                        disabled={isUpdating}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No users found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
