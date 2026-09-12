export type UserRole = 'admin' | 'manager' | 'user';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    total_tasks: string | number;
    completed_tasks: string | number;
    in_progress_tasks: string | number;
    todo_tasks: string | number;
  };
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
  author_role?: UserRole;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TaskFilterCounts {
  total: number;
  todo: number;
  in_progress: number;
  completed: number;
  low: number;
  medium: number;
  high: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  details?: string[];
  data?: T;
  pagination?: Pagination;
  counts?: TaskFilterCounts;
  token?: string;
  user?: User;
}

export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  bio: string;
  created_at: string;
  updated_at: string;
  task_count: string | number;
}

export interface AdminStats {
  users: {
    total_users: string | number;
    new_users_7d: string | number;
  };
  tasks: {
    total_tasks: string | number;
    completed_tasks: string | number;
    in_progress_tasks: string | number;
    todo_tasks: string | number;
    high_priority_tasks: string | number;
  };
  roles: Array<{
    role: UserRole;
    count: string | number;
  }>;
  system: {
    databaseEngine: string;
    authMethod: string;
    timestamp: string;
  };
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
