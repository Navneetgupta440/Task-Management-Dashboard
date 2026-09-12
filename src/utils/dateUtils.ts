export interface TaskDueStatus {
  isDueWithin24Hours: boolean;
  isOverdue: boolean;
  hoursRemaining: number;
  badgeText: string;
  formattedDueString: string;
  urgencyLevel: 'none' | 'urgent' | 'overdue';
}

/**
 * Evaluates whether a task is due within the next 24 hours or overdue.
 * Completed tasks never trigger urgency alerts.
 */
export function evaluateTaskDueStatus(
  dueDateStr: string | null | undefined,
  taskStatus?: string
): TaskDueStatus {
  if (!dueDateStr || taskStatus === 'completed') {
    return {
      isDueWithin24Hours: false,
      isOverdue: false,
      hoursRemaining: 0,
      badgeText: '',
      formattedDueString: dueDateStr ? formatDisplayDate(dueDateStr) : 'No due date',
      urgencyLevel: 'none',
    };
  }

  const now = new Date();
  let dueDate: Date;

  const trimmed = dueDateStr.trim();
  // YYYY-MM-DD date-only string: treat deadline as the end of that day (23:59:59) in user's local timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    dueDate = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else {
    dueDate = new Date(trimmed);
  }

  if (isNaN(dueDate.getTime())) {
    return {
      isDueWithin24Hours: false,
      isOverdue: false,
      hoursRemaining: 0,
      badgeText: '',
      formattedDueString: 'Invalid date',
      urgencyLevel: 'none',
    };
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const formattedDueString = formatDisplayDate(dueDate);

  // Overdue
  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    const badgeText = overdueHours < 24 ? `Overdue by ${Math.max(1, overdueHours)}h` : 'Overdue';
    return {
      isDueWithin24Hours: true,
      isOverdue: true,
      hoursRemaining: diffHours,
      badgeText,
      formattedDueString,
      urgencyLevel: 'overdue',
    };
  }

  // Due within 24 hours (diffMs <= 24 hours)
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  if (diffMs <= twentyFourHoursMs) {
    const hours = Math.max(1, diffHours);
    const badgeText = hours <= 1 ? 'Due in < 1h' : `Due in ${hours}h`;
    return {
      isDueWithin24Hours: true,
      isOverdue: false,
      hoursRemaining: hours,
      badgeText,
      formattedDueString,
      urgencyLevel: 'urgent',
    };
  }

  return {
    isDueWithin24Hours: false,
    isOverdue: false,
    hoursRemaining: diffHours,
    badgeText: '',
    formattedDueString,
    urgencyLevel: 'none',
  };
}

function formatDisplayDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}
