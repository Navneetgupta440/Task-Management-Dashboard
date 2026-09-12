import React from 'react';
import { TaskStatus, TaskPriority, TaskFilterCounts } from '../types.ts';
import {
  Filter,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowDown,
  LayoutList,
  Sidebar as SidebarIcon,
} from 'lucide-react';

export interface TaskFilterPanelProps {
  layoutMode: 'row' | 'sidebar';
  onToggleLayoutMode?: () => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  searchQuery: string;
  onClearSearch?: () => void;
  onResetAllFilters: () => void;
  counts?: TaskFilterCounts;
  totalFiltered: number;
}

export const TaskFilterPanel: React.FC<TaskFilterPanelProps> = ({
  layoutMode,
  onToggleLayoutMode,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  searchQuery,
  onClearSearch,
  onResetAllFilters,
  counts,
  totalFiltered,
}) => {
  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' || Boolean(searchQuery.trim());

  const statusOptions: {
    id: 'all' | TaskStatus;
    label: string;
    icon: React.ReactNode;
    count?: number;
    activeClass: string;
  }[] = [
    {
      id: 'all',
      label: 'All Statuses',
      icon: <Filter className="w-3.5 h-3.5" />,
      count: counts?.total,
      activeClass: 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs border-transparent',
    },
    {
      id: 'todo',
      label: 'To Do',
      icon: <Circle className="w-3.5 h-3.5 text-slate-400" />,
      count: counts?.todo,
      activeClass: 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs border-transparent',
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      count: counts?.in_progress,
      activeClass: 'bg-amber-600 text-white dark:bg-amber-600 shadow-xs border-transparent',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      count: counts?.completed,
      activeClass: 'bg-emerald-600 text-white dark:bg-emerald-600 shadow-xs border-transparent',
    },
  ];

  const priorityOptions: {
    id: 'all' | TaskPriority;
    label: string;
    icon: React.ReactNode;
    count?: number;
    badgeColor: string;
    activeClass: string;
  }[] = [
    {
      id: 'all',
      label: 'All Priorities',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      count: counts?.total,
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      activeClass: 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs border-transparent',
    },
    {
      id: 'low',
      label: 'Low',
      icon: <ArrowDown className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />,
      count: counts?.low,
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      activeClass: 'bg-blue-600 text-white dark:bg-blue-600 shadow-xs border-transparent',
    },
    {
      id: 'medium',
      label: 'Medium',
      icon: <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
      count: counts?.medium,
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      activeClass: 'bg-amber-600 text-white dark:bg-amber-600 shadow-xs border-transparent',
    },
    {
      id: 'high',
      label: 'High',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />,
      count: counts?.high,
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      activeClass: 'bg-rose-600 text-white dark:bg-rose-600 shadow-xs border-transparent',
    },
  ];

  // ==========================================
  // SIDEBAR LAYOUT
  // ==========================================
  if (layoutMode === 'sidebar') {
    return (
      <aside
        id="task-filter-sidebar"
        className="w-full lg:w-72 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-6 self-start transition-colors"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Filter Tasks
            </h2>
          </div>
          {onToggleLayoutMode && (
            <button
              type="button"
              onClick={onToggleLayoutMode}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium cursor-pointer flex items-center gap-1"
              title="Switch to horizontal Row layout"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Row View</span>
            </button>
          )}
        </div>

        {/* Priority Filter Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Priority Level
            </span>
            {priorityFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onPriorityChange('all')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {priorityOptions.map((opt) => {
              const isActive = priorityFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`sidebar-filter-priority-${opt.id}`}
                  type="button"
                  onClick={() => onPriorityChange(opt.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isActive
                      ? opt.activeClass
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isActive ? 'text-white' : ''}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  {opt.count !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : opt.badgeColor
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Status
            </span>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onStatusChange('all')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {statusOptions.map((opt) => {
              const isActive = statusFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`sidebar-filter-status-${opt.id}`}
                  type="button"
                  onClick={() => onStatusChange(opt.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isActive
                      ? opt.activeClass
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isActive ? 'text-white' : ''}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  {opt.count !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Summary & Reset */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tasks matching:</span>
            <span className="font-bold text-slate-900 dark:text-white">{totalFiltered}</span>
          </div>

          {hasActiveFilters && (
            <button
              id="sidebar-btn-reset-filters"
              type="button"
              onClick={onResetAllFilters}
              className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-950/70 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>
      </aside>
    );
  }

  // ==========================================
  // ROW LAYOUT (HORIZONTAL FILTER BAR)
  // ==========================================
  return (
    <div
      id="task-filter-row"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4 transition-colors"
    >
      {/* Top Header inside Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Quick Filters
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
            (Filter by Priority & Status)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              id="row-btn-reset-filters"
              type="button"
              onClick={onResetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Clear Filters
            </button>
          )}

          {onToggleLayoutMode && (
            <button
              type="button"
              onClick={onToggleLayoutMode}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium cursor-pointer flex items-center gap-1"
              title="Switch to vertical Sidebar layout"
            >
              <SidebarIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Sidebar View</span>
            </button>
          )}
        </div>
      </div>

      {/* Segments Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* Priority Filters Segment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Priority Level:
            </span>
            {priorityFilter !== 'all' && (
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                Active: {priorityFilter}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {priorityOptions.map((opt) => {
              const isActive = priorityFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`row-filter-priority-${opt.id}`}
                  type="button"
                  onClick={() => onPriorityChange(opt.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isActive
                      ? opt.activeClass
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : ''}>{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                  {opt.count !== undefined && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : opt.badgeColor
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filters Segment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Status:
            </span>
            {statusFilter !== 'all' && (
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                Active: {statusFilter.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {statusOptions.map((opt) => {
              const isActive = statusFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`row-filter-status-${opt.id}`}
                  type="button"
                  onClick={() => onStatusChange(opt.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isActive
                      ? opt.activeClass
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : ''}>{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                  {opt.count !== undefined && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Filter Chips / Badges Row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Active filters:</span>

          {priorityFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Priority: <span className="uppercase">{priorityFilter}</span>
              <button
                type="button"
                onClick={() => onPriorityChange('all')}
                className="hover:text-indigo-900 dark:hover:text-indigo-100 ml-1 cursor-pointer"
                title="Remove priority filter"
              >
                ×
              </button>
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Status: <span className="capitalize">{statusFilter.replace('_', ' ')}</span>
              <button
                type="button"
                onClick={() => onStatusChange('all')}
                className="hover:text-indigo-900 dark:hover:text-indigo-100 ml-1 cursor-pointer"
                title="Remove status filter"
              >
                ×
              </button>
            </span>
          )}

          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
              Search: "{searchQuery}"
              {onClearSearch && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="hover:text-slate-900 dark:hover:text-slate-100 ml-1 cursor-pointer"
                  title="Clear search query"
                >
                  ×
                </button>
              )}
            </span>
          )}

          <span className="text-slate-400 text-[11px] ml-auto">
            Showing <strong className="text-slate-700 dark:text-slate-200">{totalFiltered}</strong> matching tasks
          </span>
        </div>
      )}
    </div>
  );
};
