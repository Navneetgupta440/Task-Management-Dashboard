import React from 'react';
import { Task, TaskStatus } from '../types.ts';
import { evaluateTaskDueStatus } from '../utils/dateUtils.ts';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Edit3,
  GripVertical,
  Trash2,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isDragging?: boolean;
  enableDrag?: boolean;
  onToggleSelect: (id: number) => void;
  onQuickStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onOpenEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  canEdit,
  canDelete,
  isDragging = false,
  enableDrag = true,
  onToggleSelect,
  onQuickStatusChange,
  onOpenEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}) => {
  const dueInfo = evaluateTaskDueStatus(task.due_date, task.status);

  let cardBorderClass =
    'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md';

  if (isDragging) {
    cardBorderClass =
      'opacity-40 ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 border-indigo-400 scale-[0.98] shadow-lg';
  } else if (isSelected) {
    cardBorderClass =
      'bg-indigo-50/20 dark:bg-indigo-950/25 border-indigo-500 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20';
  } else if (dueInfo.isDueWithin24Hours) {
    if (dueInfo.isOverdue) {
      cardBorderClass =
        'bg-rose-50/30 dark:bg-rose-950/20 border-rose-400/80 dark:border-rose-700/80 shadow-xs hover:shadow-md hover:border-rose-500 ring-1 ring-rose-400/30';
    } else {
      cardBorderClass =
        'bg-amber-50/30 dark:bg-amber-950/20 border-amber-400/80 dark:border-amber-600/80 shadow-xs hover:shadow-md hover:border-amber-500 ring-1 ring-amber-400/30';
    }
  }

  const handleCardDragStart = (e: React.DragEvent) => {
    if (!enableDrag) return;
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, task);
  };

  return (
    <div
      id={`task-card-${task.id}`}
      draggable={enableDrag}
      onDragStart={handleCardDragStart}
      onDragEnd={onDragEnd}
      className={`group rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between ${
        enableDrag ? 'cursor-grab active:cursor-grabbing' : ''
      } ${cardBorderClass}`}
    >
      <div>
        {/* Card Header: Drag Grip, Checkbox, Badges & Controls */}
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            {/* Drag Handle Grip */}
            {enableDrag && (
              <div
                className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors p-0.5 cursor-grab active:cursor-grabbing shrink-0"
                title="Drag to change status column"
                aria-label="Drag task"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            {/* Checkbox for bulk actions */}
            <label
              htmlFor={`checkbox-task-${task.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center cursor-pointer p-0.5 shrink-0"
              title={isSelected ? 'Deselect task' : 'Select task for bulk actions'}
            >
              <input
                id={`checkbox-task-${task.id}`}
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(task.id)}
                className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800 cursor-pointer transition"
              />
            </label>

            {/* Status Select dropdown */}
            <select
              id={`task-status-select-${task.id}`}
              value={task.status}
              onChange={(e) => onQuickStatusChange(task, e.target.value as TaskStatus)}
              onClick={(e) => e.stopPropagation()}
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer transition shrink-0 ${
                task.status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : task.status === 'in_progress'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Badge */}
            <span
              className={`text-[10px] sm:text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                task.priority === 'high'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : task.priority === 'medium'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {task.priority}
            </span>

            {/* 24-hour visual alert indicator badge */}
            {dueInfo.isDueWithin24Hours && (
              <span
                id={`task-due-badge-${task.id}`}
                className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs shrink-0 ${
                  dueInfo.isOverdue
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 animate-pulse'
                }`}
                title={
                  dueInfo.isOverdue
                    ? `Task is overdue by ${Math.abs(dueInfo.hoursRemaining)}h!`
                    : `Action Required: Task is due in ${dueInfo.badgeText}!`
                }
              >
                <AlertTriangle
                  className={`w-3 h-3 ${
                    dueInfo.isOverdue
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                />
                <span>{dueInfo.badgeText}</span>
              </span>
            )}
          </div>

          {/* Edit & Delete Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button
                id={`btn-edit-task-${task.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEdit(task);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Edit Task"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                id={`btn-delete-task-${task.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3
          className={`text-base font-bold text-slate-900 dark:text-white ${
            task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''
          }`}
        >
          {task.title}
        </h3>

        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-3 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Card Footer: Due Date & Author Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div
          id={`task-due-footer-${task.id}`}
          className={`flex items-center gap-1.5 truncate ${
            dueInfo.isDueWithin24Hours
              ? dueInfo.isOverdue
                ? 'text-rose-700 dark:text-rose-400 font-semibold'
                : 'text-amber-700 dark:text-amber-400 font-semibold'
              : ''
          }`}
        >
          {dueInfo.isDueWithin24Hours ? (
            dueInfo.isOverdue ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
            )
          ) : (
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          )}
          <span className="truncate">
            {task.due_date ? dueInfo.formattedDueString : 'No due date'}
          </span>
          {dueInfo.isDueWithin24Hours && (
            <span className="ml-0.5 text-[11px] font-bold shrink-0">
              ({dueInfo.badgeText})
            </span>
          )}
        </div>

        {task.author_name && (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium shrink-0">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold uppercase">
              {task.author_name.charAt(0)}
            </span>
            <span className="truncate max-w-[100px] hidden sm:inline">{task.author_name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
