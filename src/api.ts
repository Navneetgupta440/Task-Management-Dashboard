import { ApiResponse, User, Task, Pagination, AdminUserListItem, AdminStats, UserRole } from './types.ts';

const TOKEN_KEY = 'taskflow_auth_jwt_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('Could not update localStorage token:', e);
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: 'ParseError',
    message: 'Failed to parse server response.',
  }));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
      // Clear token if invalid or expired
      setStoredToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(data.message || data.error || `HTTP ${response.status} error`);
  }

  return data;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string, role: UserRole = 'user') =>
    request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),

  verify: () => request<{ user: User }>('/auth/verify', { method: 'GET' }),
};

export const profileApi = {
  get: () => request<User>('/me', { method: 'GET' }),
  update: (data: { name?: string; bio?: string }) =>
    request<User>('/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export interface TaskQueryParams {
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const tasksApi = {
  list: (params: TaskQueryParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: number) => request<Task>(`/tasks/${id}`, { method: 'GET' }),

  create: (data: Partial<Task>) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) => request(`/tasks/${id}`, { method: 'DELETE' }),

  bulkStatus: (ids: number[], status: 'todo' | 'in_progress' | 'completed') =>
    request<{ count: number; updatedIds: number[] }>('/tasks/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  bulkDelete: (ids: number[]) =>
    request<{ count: number; deletedIds: number[] }>('/tasks/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  downloadCsv: async (params: TaskQueryParams = {}): Promise<void> => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
    if (params.sort) searchParams.set('sort', params.sort);

    const qs = searchParams.toString();
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/v1/tasks/export/csv${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let msg = 'Failed to export CSV';
      try {
        const errJson = await res.json();
        if (errJson.message) msg = errJson.message;
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    let filename = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};

export const adminApi = {
  getUsers: () => request<AdminUserListItem[]>('/admin/users', { method: 'GET' }),
  updateRole: (userId: number, role: UserRole) =>
    request<AdminUserListItem>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  getStats: () => request<AdminStats>('/admin/stats', { method: 'GET' }),
};
