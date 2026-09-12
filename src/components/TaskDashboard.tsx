import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, TaskPriority, Pagination, TaskFilterCounts } from '../types.ts';
import { tasksApi, TaskQueryParams } from '../api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { TaskModal } from './TaskModal.tsx';
import { TaskFilterPanel } from './TaskFilterPanel.tsx';
import { TaskAnalyticsWidget } from './TaskAnalyticsWidget.tsx';
import { TaskBoardView } from './TaskBoardView.tsx';
import { TaskCard } from './TaskCard.tsx';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Calendar,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  X,
  LayoutList,
  Sidebar as SidebarIcon,
  Loader2,
  Download,
  Bell,
  BellRing,
  AlertCircle,
  Kanban,
  LayoutGrid,
} from 'lucide-react';
import { evaluateTaskDueStatus } from '../utils/dateUtils.ts';

interface TaskDashboardProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasMore: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('created_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Filter presentation layout: 'row' (horizontal top bar) vs 'sidebar' (vertical left sidebar)
  const [filterLayoutMode, setFilterLayoutMode] = useState<'row' | 'sidebar'>(() => {
    try {
      const saved = localStorage.getItem('taskflow_filter_layout');
      return saved === 'sidebar' ? 'sidebar' : 'row';
    } catch {
      return 'row';
    }
  });

  // View presentation mode: 'board' (Kanban drag-and-drop columns) vs 'grid' (multi-column list)
  const [viewMode, setViewMode] = useState<'board' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('taskflow_view_mode');
      return saved === 'grid' ? 'grid' : 'board';
    } catch {
      return 'board';
    }
  });

  const [createModalInitialStatus, setCreateModalInitialStatus] = useState<TaskStatus | undefined>(undefined);

  const [filterCounts, setFilterCounts] = useState<TaskFilterCounts | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Checkbox selection state for bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Due Soon (within 24h) visual alert filter and banner state
  const [dueSoonFilterActive, setDueSoonFilterActive] = useState(false);
  const [isAlertBannerDismissed, setIsAlertBannerDismissed] = useState(false);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: TaskQueryParams = {
        q: searchQuery.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        sort: sortOrder,
        page: currentPage,
        limit: pageSize,
      };

      const res = await tasksApi.list(params);
      if (res.success && res.data) {
        setTasks(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.counts) {
          setFilterCounts(res.counts);
        }
      }
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to fetch tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, priorityFilter, sortOrder, currentPage, pageSize, onErrorToast]);

  const handleToggleLayoutMode = () => {
    setFilterLayoutMode((prev) => {
      const next = prev === 'row' ? 'sidebar' : 'row';
      try {
        localStorage.setItem('taskflow_filter_layout', next);
      } catch {}
      return next;
    });
  };

  const handleResetAllFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
    setDueSoonFilterActive(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTasks();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [fetchTasks]);

  // Handlers
  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params: TaskQueryParams = {
        q: searchQuery.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        sort: sortOrder,
      };
      await tasksApi.downloadCsv(params);
      onSuccessToast('Task list exported as CSV successfully.');
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to download CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSetViewMode = (mode: 'board' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('taskflow_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleOpenCreateModal = (initialStatus?: TaskStatus) => {
    setEditingTask(null);
    setCreateModalInitialStatus(initialStatus);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setCreateModalInitialStatus(undefined);
    setIsModalOpen(true);
  };

  const handleTaskDrop = async (taskId: number, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === newStatus) return;

    // Optimistically update UI so the card moves immediately
    const prevTasks = [...tasks];
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await tasksApi.update(taskId, { status: newStatus });
      if (res.success) {
        const statusLabels: Record<TaskStatus, string> = {
          todo: 'To Do',
          in_progress: 'In Progress',
          completed: 'Completed',
        };
        onSuccessToast(`Moved "${task.title}" to ${statusLabels[newStatus]}`);
        fetchTasks();
      } else {
        setTasks(prevTasks);
        onErrorToast('Failed to update task status.');
      }
    } catch (err: any) {
      setTasks(prevTasks);
      onErrorToast(err.message || 'Failed to move task.');
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      const res = await tasksApi.update(editingTask.id, taskData);
      if (res.success) {
        onSuccessToast('Task updated successfully.');
        fetchTasks();
      }
    } else {
      const res = await tasksApi.create(taskData);
      if (res.success) {
        onSuccessToast('Task created successfully.');
        setCurrentPage(1);
        fetchTasks();
      }
    }
  };

  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await tasksApi.update(task.id, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      onSuccessToast(`Task status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to update status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await tasksApi.delete(taskToDelete.id);
      onSuccessToast('Task deleted successfully.');
      setSelectedTaskIds((prev) => prev.filter((id) => id !== taskToDelete.id));
      setTaskToDelete(null);
      fetchTasks();
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to delete task.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Due soon within next 24 hours tasks
  const dueSoonTasks = tasks.filter((t) => {
    const info = evaluateTaskDueStatus(t.due_date, t.status);
    return info.isDueWithin24Hours;
  });
  const dueSoonCount = dueSoonTasks.length;

  const tasksToDisplay = dueSoonFilterActive
    ? tasks.filter((t) => evaluateTaskDueStatus(t.due_date, t.status).isDueWithin24Hours)
    : tasks;

  // Selection & Bulk Action Handlers
  const handleToggleSelectTask = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const isAllPageSelected =
    tasksToDisplay.length > 0 && tasksToDisplay.every((t) => selectedTaskIds.includes(t.id));
  const isSomePageSelected =
    tasksToDisplay.some((t) => selectedTaskIds.includes(t.id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = tasksToDisplay.map((t) => t.id);
      setSelectedTaskIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = tasksToDisplay.map((t) => t.id);
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedTaskIds([]);
  };

  const handleBulkStatusChange = async (newStatus: 'todo' | 'in_progress' | 'completed') => {
    if (selectedTaskIds.length === 0 || isBulkActing) return;
    setIsBulkActing(true);
    try {
      const res = await tasksApi.bulkStatus(selectedTaskIds, newStatus);
      if (res.success) {
        const statusLabel =
          newStatus === 'completed' ? 'Completed' : newStatus === 'in_progress' ? 'In Progress' : 'To Do';
        const updatedCount = res.data?.count ?? selectedTaskIds.length;
        onSuccessToast(`Marked ${updatedCount} task(s) as ${statusLabel}.`);
        setSelectedTaskIds([]);
        await fetchTasks();
      }
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to update selected tasks.');
    } finally {
      setIsBulkActing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0 || isBulkActing) return;
    setIsBulkActing(true);
    try {
      const res = await tasksApi.bulkDelete(selectedTaskIds);
      if (res.success) {
        const deletedCount = res.data?.count ?? selectedTaskIds.length;
        onSuccessToast(`Deleted ${deletedCount} task(s) successfully.`);
        setSelectedTaskIds([]);
        setIsBulkDeleteModalOpen(false);
        await fetchTasks();
      }
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to delete selected tasks.');
    } finally {
      setIsBulkActing(false);
    }
  };

  // Metrics summary
  const completedCount = filterCounts?.completed ?? tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = filterCounts?.in_progress ?? tasks.filter((t) => t.status === 'in_progress').length;
  const highPriorityCount = filterCounts?.high ?? tasks.filter((t) => t.priority === 'high').length;
  const totalScopeCount = filterCounts?.total ?? pagination.total;

  // Render the task list cards, empty state, and pagination
  const renderTaskContent = () => (
    <div className="space-y-6 flex-1 min-w-0">
      {/* Search & Sort Controls */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-task-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search tasks in real-time (debounced)..."
            className="w-full pl-10 pr-14 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800/80 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isLoading && searchQuery && (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
            )}
            {searchQuery && (
              <button
                id="btn-clear-search-query"
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sort & Filter Mode Toggle */}
        <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:inline">
              Sort:
            </span>
            <select
              id="sort-tasks"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="due_asc">Due Date</option>
              <option value="priority_desc">Highest Priority</option>
            </select>
          </div>

          <button
            id="btn-toggle-filter-mode"
            type="button"
            onClick={handleToggleLayoutMode}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title={filterLayoutMode === 'row' ? 'Dock filters as sidebar' : 'Expand filters as row'}
          >
            {filterLayoutMode === 'row' ? (
              <>
                <SidebarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Sidebar</span>
              </>
            ) : (
              <>
                <LayoutList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Row</span>
              </>
            )}
          </button>

          {/* View Mode Toggle: Board (Kanban Drag & Drop) vs Grid */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80">
            <button
              id="btn-view-board"
              type="button"
              onClick={() => handleSetViewMode('board')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Board View (Drag and drop between columns)"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              id="btn-view-grid"
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Due Soon Visual Alert Banner */}
      {!isLoading && dueSoonTasks.length > 0 && !isAlertBannerDismissed && (
        <div
          id="due-soon-notification-banner"
          className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                  <span>Urgent Tasks Due Within 24 Hours</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200/90 dark:bg-amber-900/90 text-amber-900 dark:text-amber-100">
                  {dueSoonTasks.length} {dueSoonTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                {dueSoonTasks.slice(0, 2).map((t) => `"${t.title}"`).join(', ')}
                {dueSoonTasks.length > 2 ? ` and ${dueSoonTasks.length - 2} other(s)` : ''} require timely completion.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              id="btn-toggle-due-soon-filter"
              type="button"
              onClick={() => setDueSoonFilterActive((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                dueSoonFilterActive
                  ? 'bg-amber-700 text-white hover:bg-amber-800 shadow-xs'
                  : 'bg-white dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-750 hover:bg-amber-100/80'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{dueSoonFilterActive ? 'Show All Tasks' : 'Filter Due Soon Only'}</span>
            </button>
            <button
              id="btn-dismiss-due-banner"
              type="button"
              onClick={() => setIsAlertBannerDismissed(true)}
              className="p-1.5 text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 rounded-lg transition cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Selection Control & Bulk Actions Bar */}
      {!isLoading && tasksToDisplay.length > 0 && (
        <div className="space-y-2.5">
          {/* Subheader bar with select-all and selection status */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-0.5 text-xs">
            <label
              htmlFor="checkbox-select-all-page"
              className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              <input
                id="checkbox-select-all-page"
                type="checkbox"
                checked={isAllPageSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = isSomePageSelected;
                  }
                }}
                onChange={handleToggleSelectAllPage}
                className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800 cursor-pointer transition"
              />
              <span>
                {isAllPageSelected
                  ? 'Deselect all on this page'
                  : isSomePageSelected
                  ? `${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''} selected`
                  : `Select all on this page (${tasksToDisplay.length})`}
              </span>
            </label>

            {selectedTaskIds.length > 0 && (
              <button
                id="btn-clear-selection"
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer transition"
              >
                Clear selection ({selectedTaskIds.length})
              </button>
            )}
          </div>

          {/* Bulk Actions Banner when items are selected */}
          {selectedTaskIds.length > 0 && (
            <div
              id="bulk-actions-toolbar"
              className="p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 dark:border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-indigo-500 text-white font-bold text-xs">
                  {selectedTaskIds.length}
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  task{selectedTaskIds.length > 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-bulk-completed"
                  type="button"
                  disabled={isBulkActing}
                  onClick={() => handleBulkStatusChange('completed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  title="Mark selected tasks as completed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Completed</span>
                </button>

                <button
                  id="btn-bulk-in-progress"
                  type="button"
                  disabled={isBulkActing}
                  onClick={() => handleBulkStatusChange('in_progress')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  title="Mark selected tasks as in progress"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mark In Progress</span>
                </button>

                <button
                  id="btn-bulk-todo"
                  type="button"
                  disabled={isBulkActing}
                  onClick={() => handleBulkStatusChange('todo')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  title="Mark selected tasks as to do"
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span>Mark To Do</span>
                </button>

                <button
                  id="btn-bulk-delete"
                  type="button"
                  disabled={isBulkActing}
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  title="Delete selected tasks"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  id="btn-bulk-cancel"
                  type="button"
                  disabled={isBulkActing}
                  onClick={handleClearSelection}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-full" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : tasksToDisplay.length === 0 ? (
        dueSoonFilterActive ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No tasks due within 24 hours</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              All tasks either have later deadlines or are already marked as completed.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                id="btn-clear-due-soon-filter"
                onClick={() => setDueSoonFilterActive(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition cursor-pointer"
              >
                Show All Tasks
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Filter className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No tasks found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? `No tasks match the active filters (${priorityFilter !== 'all' ? `Priority: ${priorityFilter.toUpperCase()}` : ''}${statusFilter !== 'all' ? ` Status: ${statusFilter.replace('_', ' ')}` : ''}${searchQuery ? ` Search: "${searchQuery}"` : ''}).`
                : 'You have no tasks created yet. Get started by adding your first task.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
                <button
                  id="btn-empty-reset-filters"
                  onClick={handleResetAllFilters}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition cursor-pointer"
              >
                + Add Task
              </button>
            </div>
          </div>
        )
      ) : viewMode === 'board' ? (
        <TaskBoardView
          tasks={tasksToDisplay}
          user={user}
          selectedTaskIds={selectedTaskIds}
          onToggleSelectTask={handleToggleSelectTask}
          onQuickStatusChange={handleQuickStatusChange}
          onOpenEditModal={handleOpenEditModal}
          onDeleteTask={(task) => setTaskToDelete(task)}
          onOpenCreateModal={handleOpenCreateModal}
          onTaskDrop={handleTaskDrop}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasksToDisplay.map((task) => {
            const isOwner = user?.id === task.user_id;
            const canEdit = user?.role === 'admin' || user?.role === 'manager' || isOwner;
            const canDelete = user?.role === 'admin' || isOwner;
            const isSelected = selectedTaskIds.includes(task.id);

            return (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={isSelected}
                canEdit={canEdit}
                canDelete={canDelete}
                enableDrag={false}
                onToggleSelect={handleToggleSelectTask}
                onQuickStatusChange={handleQuickStatusChange}
                onOpenEdit={handleOpenEditModal}
                onDelete={(t) => setTaskToDelete(t)}
              />
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
          <span>
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(currentPage * pageSize, pagination.total)}</strong> of{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</strong> tasks
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 dark:text-slate-400">Tasks per page:</span>
            <select
              id="select-tasks-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="24">24</option>
            </select>
          </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              id="btn-pagination-prev"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => {
              if (
                pagination.totalPages > 6 &&
                pageNum !== 1 &&
                pageNum !== pagination.totalPages &&
                Math.abs(pageNum - currentPage) > 1
              ) {
                if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                  return (
                    <span key={`ellipsis-${pageNum}`} className="text-xs text-slate-400 px-1">
                      ...
                    </span>
                  );
                }
                return null;
              }

              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  id={`btn-pagination-page-${pageNum}`}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              id="btn-pagination-next"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div id="tasks-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Task Management</h1>
            {dueSoonCount > 0 && (
              <button
                id="btn-header-due-soon-badge"
                type="button"
                onClick={() => {
                  setIsAlertBannerDismissed(false);
                  setDueSoonFilterActive((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs ${
                  dueSoonFilterActive
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200/80'
                }`}
                title="Click to toggle tasks due in the next 24 hours"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <Clock className="w-3.5 h-3.5" />
                <span>{dueSoonCount} Due &lt;24h</span>
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create, track, and organize work with PostgreSQL-backed data persistence.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            id="btn-download-csv"
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Export current filtered task view as CSV'
                : 'Download all tasks as CSV'
            }
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Download as CSV'}</span>
          </button>

          <button
            id="btn-create-task"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Tasks</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalScopeCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{inProgressCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{completedCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> High Priority
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{highPriorityCount}</div>
        </div>
        <div
          id="metric-card-due-soon"
          onClick={() => {
            setIsAlertBannerDismissed(false);
            setDueSoonFilterActive((prev) => !prev);
          }}
          className={`p-4 rounded-xl border transition shadow-2xs cursor-pointer ${
            dueSoonCount > 0
              ? dueSoonFilterActive
                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-500/30'
                : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100/70 dark:hover:bg-amber-900/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
          title="Click to toggle filtering tasks due in next 24 hours"
        >
          <span
            className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              dueSoonFilterActive
                ? 'text-white'
                : dueSoonCount > 0
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {dueSoonCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  dueSoonCount > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              ></span>
            </span>
            <BellRing className="w-3.5 h-3.5" /> Due &lt;24h
          </span>
          <div
            className={`text-2xl font-bold mt-1 ${
              dueSoonFilterActive
                ? 'text-white'
                : dueSoonCount > 0
                ? 'text-amber-900 dark:text-amber-100'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {dueSoonCount}
          </div>
        </div>
      </div>

      {/* Task Analytics Dashboard Widget */}
      <TaskAnalyticsWidget
        counts={filterCounts}
        activeStatusFilter={statusFilter}
        onStatusFilterSelect={(selectedStatus) => {
          setStatusFilter(selectedStatus);
          setCurrentPage(1);
        }}
      />

      {/* Primary Layout: Either Horizontal Filter Row OR Left Filter Sidebar */}
      {filterLayoutMode === 'row' ? (
        <div className="space-y-6">
          <TaskFilterPanel
            layoutMode="row"
            onToggleLayoutMode={handleToggleLayoutMode}
            statusFilter={statusFilter}
            onStatusChange={(newStatus) => {
              setStatusFilter(newStatus);
              setCurrentPage(1);
            }}
            priorityFilter={priorityFilter}
            onPriorityChange={(newPriority) => {
              setPriorityFilter(newPriority);
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            onClearSearch={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}
            onResetAllFilters={handleResetAllFilters}
            counts={filterCounts}
            totalFiltered={pagination.total}
          />
          {renderTaskContent()}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <TaskFilterPanel
            layoutMode="sidebar"
            onToggleLayoutMode={handleToggleLayoutMode}
            statusFilter={statusFilter}
            onStatusChange={(newStatus) => {
              setStatusFilter(newStatus);
              setCurrentPage(1);
            }}
            priorityFilter={priorityFilter}
            onPriorityChange={(newPriority) => {
              setPriorityFilter(newPriority);
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            onClearSearch={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}
            onResetAllFilters={handleResetAllFilters}
            counts={filterCounts}
            totalFiltered={pagination.total}
          />
          {renderTaskContent()}
        </div>
      )}

      {/* Create / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        initialStatus={createModalInitialStatus}
      />

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Task</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete "{taskToDelete.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Selected Tasks</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete {selectedTaskIds.length} selected task{selectedTaskIds.length > 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkActing}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-bulk-delete"
                type="button"
                disabled={isBulkActing}
                onClick={handleBulkDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isBulkActing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete {selectedTaskIds.length} Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
