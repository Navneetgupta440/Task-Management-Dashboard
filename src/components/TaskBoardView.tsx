import React, { useState } from 'react';
import { Task, TaskStatus } from '../types.ts';
import { TaskCard } from './TaskCard.tsx';
import {
  Circle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowDownCircle,
  FolderOpen,
} from 'lucide-react';

interface TaskBoardViewProps {
  tasks: Task[];
  user: any;
  selectedTaskIds: number[];
  onToggleSelectTask: (id: number) => void;
  onQuickStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onOpenEditModal: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onOpenCreateModal: (status?: TaskStatus) => void;
  onTaskDrop: (taskId: number, newStatus: TaskStatus) => void;
}

interface ColumnConfig {
  status: TaskStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
  dropBorderColor: string;
  dropBgColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'todo',
    title: 'To Do',
    icon: Circle,
    accentColor: 'text-slate-700 dark:text-slate-300',
    headerBg: 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700',
    badgeBg: 'bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
    badgeText: 'To Do',
    dropBorderColor: 'border-slate-400 dark:border-slate-500',
    dropBgColor: 'bg-slate-50/70 dark:bg-slate-900/60',
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    icon: Clock,
    accentColor: 'text-amber-600 dark:text-amber-400',
    headerBg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60',
    badgeBg: 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200',
    badgeText: 'In Progress',
    dropBorderColor: 'border-amber-400 dark:border-amber-500',
    dropBgColor: 'bg-amber-50/70 dark:bg-amber-950/40',
  },
  {
    status: 'completed',
    title: 'Completed',
    icon: CheckCircle2,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    headerBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60',
    badgeBg: 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200',
    badgeText: 'Completed',
    dropBorderColor: 'border-emerald-400 dark:border-emerald-500',
    dropBgColor: 'bg-emerald-50/70 dark:bg-emerald-950/40',
  },
];

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  tasks,
  user,
  selectedTaskIds,
  onToggleSelectTask,
  onQuickStatusChange,
  onOpenEditModal,
  onDeleteTask,
  onOpenCreateModal,
  onTaskDrop,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleColumnDragLeave = (e: React.DragEvent, status: TaskStatus) => {
    // Only reset if we're truly leaving the column container
    const currentTarget = e.currentTarget;
    if (!currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverColumn === status) {
        setDragOverColumn(null);
      }
    }
  };

  const handleColumnDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = Number(taskIdStr) || draggedTaskId;
    setDraggedTaskId(null);

    if (taskId) {
      onTaskDrop(taskId, status);
    }
  };

  return (
    <div id="task-board-container" className="space-y-4">
      {/* Visual Tip banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">✨</span>
          <span>
            <strong className="font-semibold text-slate-900 dark:text-slate-200">Interactive Board:</strong> Drag and drop task cards between columns to update status effortlessly.
          </span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          3 Status Columns
        </span>
      </div>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          const Icon = col.icon;
          const isOverThisCol = dragOverColumn === col.status;
          const isTargetDifferent =
            draggedTaskId !== null &&
            tasks.find((t) => t.id === draggedTaskId)?.status !== col.status;

          return (
            <div
              key={col.status}
              id={`board-column-${col.status}`}
              onDragOver={(e) => handleColumnDragOver(e, col.status)}
              onDragLeave={(e) => handleColumnDragLeave(e, col.status)}
              onDrop={(e) => handleColumnDrop(e, col.status)}
              className={`rounded-2xl border transition-all flex flex-col min-h-[500px] p-3.5 sm:p-4 ${
                isOverThisCol
                  ? `border-2 border-dashed ${col.dropBorderColor} ${col.dropBgColor} ring-4 ring-indigo-500/10 shadow-md`
                  : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/80 shadow-xs'
              }`}
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-3 rounded-xl border mb-3 shadow-2xs ${col.headerBg}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${col.accentColor}`} />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    {col.title}
                  </h2>
                  <span
                    id={`column-count-${col.status}`}
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${col.badgeBg}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  id={`btn-add-task-col-${col.status}`}
                  type="button"
                  onClick={() => onOpenCreateModal(col.status)}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 text-xs font-medium"
                  title={`Add task directly to ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>

              {/* Active Drop Prompt banner when dragging over */}
              {isOverThisCol && isTargetDifferent && (
                <div className="mb-3 p-3 rounded-xl border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2 text-xs font-bold animate-pulse shadow-sm">
                  <ArrowDownCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Release to move task to {col.title}</span>
                </div>
              )}

              {/* Task Cards in Column */}
              <div className="space-y-3 flex-1">
                {colTasks.length === 0 ? (
                  <div
                    id={`column-empty-${col.status}`}
                    className={`rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center flex flex-col items-center justify-center min-h-[160px] text-slate-400 dark:text-slate-500 transition ${
                      isOverThisCol ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : 'bg-white/40 dark:bg-slate-900/30'
                    }`}
                  >
                    <FolderOpen className="w-6 h-6 mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      No {col.title.toLowerCase()} tasks
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                      Drag a task here to change its status or click <span className="font-semibold text-slate-600 dark:text-slate-300">+ Add</span>.
                    </p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isOwner = user?.id === task.user_id;
                    const canEdit =
                      user?.role === 'admin' || user?.role === 'manager' || isOwner;
                    const canDelete = user?.role === 'admin' || isOwner;
                    const isSelected = selectedTaskIds.includes(task.id);
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isSelected={isSelected}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        isDragging={isDragging}
                        enableDrag={canEdit}
                        onToggleSelect={onToggleSelectTask}
                        onQuickStatusChange={onQuickStatusChange}
                        onOpenEdit={onOpenEditModal}
                        onDelete={onDeleteTask}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
