import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { TaskFilterCounts } from '../types.ts';
import { PieChart as PieChartIcon, CheckCircle2, Clock, Circle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskAnalyticsWidgetProps {
  counts?: TaskFilterCounts;
  activeStatusFilter: string;
  onStatusFilterSelect: (status: string) => void;
}

interface StatusSlice {
  key: 'todo' | 'in_progress' | 'completed';
  name: string;
  value: number;
  color: string;
  bgLight: string;
  darkBg: string;
  textColor: string;
}

export const TaskAnalyticsWidget: React.FC<TaskAnalyticsWidgetProps> = ({
  counts,
  activeStatusFilter,
  onStatusFilterSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const todoCount = counts?.todo ?? 0;
  const inProgressCount = counts?.in_progress ?? 0;
  const completedCount = counts?.completed ?? 0;
  const totalTasks = counts?.total ?? (todoCount + inProgressCount + completedCount);

  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const chartData: StatusSlice[] = [
    {
      key: 'todo',
      name: 'To Do',
      value: todoCount,
      color: '#6366f1', // Indigo
      bgLight: 'bg-indigo-50',
      darkBg: 'dark:bg-indigo-950/40',
      textColor: 'text-indigo-700 dark:text-indigo-400',
    },
    {
      key: 'in_progress',
      name: 'In Progress',
      value: inProgressCount,
      color: '#f59e0b', // Amber
      bgLight: 'bg-amber-50',
      darkBg: 'dark:bg-amber-950/40',
      textColor: 'text-amber-700 dark:text-amber-400',
    },
    {
      key: 'completed',
      name: 'Completed',
      value: completedCount,
      color: '#10b981', // Emerald
      bgLight: 'bg-emerald-50',
      darkBg: 'dark:bg-emerald-950/40',
      textColor: 'text-emerald-700 dark:text-emerald-400',
    },
  ];

  // If all are 0, show a subtle placeholder segment in the pie chart
  const hasData = totalTasks > 0;
  const displayData = hasData
    ? chartData.filter((d) => d.value > 0)
    : [{ key: 'none', name: 'No tasks', value: 1, color: '#e2e8f0', bgLight: '', darkBg: '', textColor: '' }];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as StatusSlice;
      if (!hasData) return null;
      const percentage = totalTasks > 0 ? Math.round((data.value / totalTasks) * 100) : 0;
      return (
        <div className="bg-slate-900 text-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs space-y-0.5">
          <div className="font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </div>
          <div className="text-slate-300">
            <span className="font-bold text-white">{data.value}</span> {data.value === 1 ? 'task' : 'tasks'} ({percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="task-analytics-widget"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-all"
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Task Analytics
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                Status Breakdown
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution across To Do, In Progress, and Completed milestones
            </p>
          </div>
        </div>

        <button
          id="btn-toggle-analytics-widget"
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={isExpanded ? 'Collapse Analytics' : 'Expand Analytics'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Widget Content */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Pie Chart Visualizer */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[190px]">
            <div className="w-full h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={hasData && displayData.length > 1 ? 4 : 0}
                    dataKey="value"
                    onClick={(entry: any) => {
                      const selectedKey = entry?.payload?.key || entry?.key;
                      if (hasData && selectedKey && selectedKey !== 'none') {
                        onStatusFilterSelect(activeStatusFilter === selectedKey ? 'all' : selectedKey);
                      }
                    }}
                    cursor={hasData ? 'pointer' : 'default'}
                  >
                    {displayData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="none"
                        className="transition-transform hover:opacity-90"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Centered Donut Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                {hasData ? `${completionRate}%` : '0'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                {hasData ? 'Completed' : 'No Tasks'}
              </span>
            </div>
          </div>

          {/* Breakdown Cards & Click-to-Filter Controls */}
          <div className="md:col-span-7 space-y-3.5">
            {/* Completion Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  Overall Completion Rate
                </span>
                <span className="text-slate-900 dark:text-white font-bold">{completionRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 via-amber-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Clickable Status Slices */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {chartData.map((slice) => {
                const count = slice.value;
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                const isSelected = activeStatusFilter === slice.key;

                return (
                  <button
                    key={slice.key}
                    id={`analytics-btn-${slice.key}`}
                    type="button"
                    onClick={() => onStatusFilterSelect(isSelected ? 'all' : slice.key)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        {slice.name}
                      </span>
                      {slice.key === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      {slice.key === 'in_progress' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                      {slice.key === 'todo' && <Circle className="w-3.5 h-3.5 text-indigo-500" />}
                    </div>

                    <div className="flex items-baseline justify-between mt-auto">
                      <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {count}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {percentage}%
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                        Active Filter • Click to clear
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick summary note */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
              <span>
                Total pipeline:{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-semibold">{totalTasks}</strong> tasks
              </span>
              <span>
                Active backlog:{' '}
                <strong className="text-amber-600 dark:text-amber-400 font-semibold">{todoCount + inProgressCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
