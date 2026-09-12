import { Router, Response } from 'express';
import { query } from '../db.ts';
import { authenticateToken, AuthRequest, authorizeTaskResource } from '../middleware/auth.ts';

const router = Router();

// GET /api/v1/tasks - List tasks with search, filter, and pagination
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { q, status, priority, page = '1', limit = '10', sort = 'created_desc' } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Role-based visibility:
    // Admin and Manager can see all tasks across the company
    // Regular User can only see their own tasks
    if (user.role === 'user') {
      conditions.push(`t.user_id = $${paramIndex++}`);
      params.push(user.id);
    }

    if (q && typeof q === 'string' && q.trim()) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }

    if (status && typeof status === 'string' && ['todo', 'in_progress', 'completed'].includes(status)) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }

    if (priority && typeof priority === 'string' && ['low', 'medium', 'high'].includes(priority)) {
      conditions.push(`t.priority = $${paramIndex++}`);
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort order
    let orderByClause = 'ORDER BY t.created_at DESC';
    if (sort === 'created_asc') orderByClause = 'ORDER BY t.created_at ASC';
    if (sort === 'due_asc') orderByClause = 'ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';
    if (sort === 'priority_desc') {
      orderByClause = `ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END, t.created_at DESC`;
    }

    // Count total matches for pagination
    const countSql = `SELECT COUNT(*) as total FROM tasks t ${whereClause}`;
    const countRes = await query(countSql, params);
    const totalCount = parseInt(countRes.rows[0]?.total || '0', 10);

    // Compute scope-wide counts for priority and status filter tabs
    const scopeWhere = user.role === 'user' ? 'WHERE user_id = $1' : '';
    const scopeParams = user.role === 'user' ? [user.id] : [];
    const countsRes = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'todo') as todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE priority = 'low') as low,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium,
        COUNT(*) FILTER (WHERE priority = 'high') as high
       FROM tasks ${scopeWhere}`,
      scopeParams
    );

    const countsRow = countsRes.rows[0] || {};
    const counts = {
      total: parseInt(countsRow.total || '0', 10),
      todo: parseInt(countsRow.todo || '0', 10),
      in_progress: parseInt(countsRow.in_progress || '0', 10),
      completed: parseInt(countsRow.completed || '0', 10),
      low: parseInt(countsRow.low || '0', 10),
      medium: parseInt(countsRow.medium || '0', 10),
      high: parseInt(countsRow.high || '0', 10),
    };

    // Fetch paginated tasks with author info
    const tasksSql = `
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.status, 
        t.priority, 
        t.due_date, 
        t.user_id, 
        t.created_at, 
        t.updated_at,
        u.name as author_name,
        u.email as author_email,
        u.role as author_role
      FROM tasks t
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataParams = [...params, limitNum, offset];
    const tasksRes = await query(tasksSql, dataParams);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return res.json({
      success: true,
      data: tasksRes.rows,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasMore: pageNum < totalPages,
      },
      counts,
    });
  } catch (error: any) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to fetch tasks.',
    });
  }
});

// Helper to escape CSV cell value
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

// GET /api/v1/tasks/export/csv - Export filtered tasks as CSV
router.get('/export/csv', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { q, status, priority, sort = 'created_desc' } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Role-based visibility
    if (user.role === 'user') {
      conditions.push(`t.user_id = $${paramIndex++}`);
      params.push(user.id);
    }

    if (q && typeof q === 'string' && q.trim()) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }

    if (status && typeof status === 'string' && ['todo', 'in_progress', 'completed'].includes(status)) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }

    if (priority && typeof priority === 'string' && ['low', 'medium', 'high'].includes(priority)) {
      conditions.push(`t.priority = $${paramIndex++}`);
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderByClause = 'ORDER BY t.created_at DESC';
    if (sort === 'created_asc') orderByClause = 'ORDER BY t.created_at ASC';
    if (sort === 'due_asc') orderByClause = 'ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';
    if (sort === 'priority_desc') {
      orderByClause = `ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END, t.created_at DESC`;
    }

    const tasksSql = `
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.status, 
        t.priority, 
        t.due_date, 
        t.created_at, 
        t.updated_at,
        u.name as author_name,
        u.email as author_email
      FROM tasks t
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT 10000
    `;

    const tasksRes = await query(tasksSql, params);
    const rows = tasksRes.rows;

    const headers = [
      'Task ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Due Date',
      'Author Name',
      'Author Email',
      'Created At',
      'Updated At',
    ];

    const csvRows = [headers.join(',')];

    for (const task of rows) {
      const formattedDueDate = task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '';
      const formattedCreatedAt = task.created_at ? new Date(task.created_at).toISOString() : '';
      const formattedUpdatedAt = task.updated_at ? new Date(task.updated_at).toISOString() : '';

      const line = [
        escapeCsv(task.id),
        escapeCsv(task.title),
        escapeCsv(task.description || ''),
        escapeCsv(task.status),
        escapeCsv(task.priority),
        escapeCsv(formattedDueDate),
        escapeCsv(task.author_name || ''),
        escapeCsv(task.author_email || ''),
        escapeCsv(formattedCreatedAt),
        escapeCsv(formattedUpdatedAt),
      ].join(',');

      csvRows.push(line);
    }

    const csvContent = csvRows.join('\r\n');
    const filename = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Export tasks CSV error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to export tasks to CSV.',
    });
  }
});

// POST /api/v1/tasks/bulk-status - Bulk update task status
router.post('/bulk-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'A list of task IDs is required.',
      });
    }

    const validStatuses = ['todo', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Valid status is required (todo, in_progress, completed).',
      });
    }

    const numericIds = ids.map((id: any) => parseInt(String(id), 10)).filter((n: number) => !isNaN(n));
    if (numericIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'No valid numeric IDs provided.',
      });
    }

    let updateRes;
    if (user.role === 'admin' || user.role === 'manager') {
      updateRes = await query(
        `UPDATE tasks
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2::int[])
         RETURNING id`,
        [status, numericIds]
      );
    } else {
      updateRes = await query(
        `UPDATE tasks
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2::int[]) AND user_id = $3
         RETURNING id`,
        [status, numericIds, user.id]
      );
    }

    return res.json({
      success: true,
      message: `Updated status for ${updateRes.rowCount || 0} task(s).`,
      count: updateRes.rowCount || 0,
      updatedIds: updateRes.rows.map((r: any) => r.id),
    });
  } catch (error: any) {
    console.error('Bulk status update error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to update selected tasks.',
    });
  }
});

// POST /api/v1/tasks/bulk-delete - Bulk delete tasks
router.post('/bulk-delete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'A list of task IDs is required.',
      });
    }

    const numericIds = ids.map((id: any) => parseInt(String(id), 10)).filter((n: number) => !isNaN(n));
    if (numericIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'No valid numeric IDs provided.',
      });
    }

    let deleteRes;
    if (user.role === 'admin') {
      deleteRes = await query(
        `DELETE FROM tasks
         WHERE id = ANY($1::int[])
         RETURNING id`,
        [numericIds]
      );
    } else {
      // Regular user or manager can only delete their own tasks
      deleteRes = await query(
        `DELETE FROM tasks
         WHERE id = ANY($1::int[]) AND user_id = $2
         RETURNING id`,
        [numericIds, user.id]
      );
    }

    return res.json({
      success: true,
      message: `Deleted ${deleteRes.rowCount || 0} task(s).`,
      count: deleteRes.rowCount || 0,
      deletedIds: deleteRes.rows.map((r: any) => r.id),
    });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to delete selected tasks.',
    });
  }
});

// GET /api/v1/tasks/:id - Fetch single task (uses authorizeTaskResource middleware)
router.get('/:id', authenticateToken, authorizeTaskResource, async (req: AuthRequest, res: Response) => {
  try {
    const task = (req as any).task;
    return res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Fetch single task error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to fetch task.',
    });
  }
});

// POST /api/v1/tasks - Create task
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description = '', status = 'todo', priority = 'medium', due_date = null } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Task title is required.',
      });
    }

    const validStatuses = ['todo', 'in_progress', 'completed'];
    const validPriorities = ['low', 'medium', 'high'];

    const normalizedStatus = validStatuses.includes(status) ? status : 'todo';
    const normalizedPriority = validPriorities.includes(priority) ? priority : 'medium';
    const userId = req.user!.id;

    const insertRes = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, status, priority, due_date, user_id, created_at, updated_at`,
      [title.trim(), description.trim(), normalizedStatus, normalizedPriority, due_date || null, userId]
    );

    const newTask = insertRes.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: {
        ...newTask,
        author_name: req.user!.name,
        author_email: req.user!.email,
        author_role: req.user!.role,
      },
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to create task.',
    });
  }
});

// PUT /api/v1/tasks/:id - Update task (uses authorizeTaskResource middleware)
router.put('/:id', authenticateToken, authorizeTaskResource, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const existingTask = (req as any).task;

    const { title, description, status, priority, due_date } = req.body;

    const newTitle = title !== undefined ? title.trim() : existingTask.title;
    if (newTitle.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Task title cannot be empty.',
      });
    }

    const newDescription = description !== undefined ? description.trim() : existingTask.description;
    const newStatus = ['todo', 'in_progress', 'completed'].includes(status) ? status : existingTask.status;
    const newPriority = ['low', 'medium', 'high'].includes(priority) ? priority : existingTask.priority;
    const newDueDate = due_date !== undefined ? (due_date || null) : existingTask.due_date;

    const updateRes = await query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, title, description, status, priority, due_date, user_id, created_at, updated_at`,
      [newTitle, newDescription, newStatus, newPriority, newDueDate, taskId]
    );

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      data: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to update task.',
    });
  }
});

// DELETE /api/v1/tasks/:id - Delete task (uses authorizeTaskResource middleware)
router.delete('/:id', authenticateToken, authorizeTaskResource, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    await query('DELETE FROM tasks WHERE id = $1', [taskId]);

    return res.json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to delete task.',
    });
  }
});

export default router;
