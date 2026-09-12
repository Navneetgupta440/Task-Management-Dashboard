import { Router, Response } from 'express';
import { query } from '../db.ts';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Apply auth and admin-only role check to all endpoints in this router
router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/v1/admin/users - List all users with role and stats
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const usersRes = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.bio, 
        u.created_at, 
        u.updated_at,
        COUNT(t.id) as task_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.user_id
      GROUP BY u.id
      ORDER BY u.created_at ASC
    `);

    return res.json({
      success: true,
      data: usersRes.rows,
    });
  } catch (error: any) {
    console.error('Admin fetch users error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to fetch users list.',
    });
  }
});

// PATCH /api/v1/admin/users/:id/role - Update user role
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid user ID format.',
      });
    }

    if (!['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Role must be one of: admin, manager, user.',
      });
    }

    // Prevent demoting the last admin or demoting oneself inadvertently
    if (req.user!.id === targetUserId && role !== 'admin') {
      const adminCountRes = await query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      const adminCount = parseInt(adminCountRes.rows[0]?.count || '1', 10);
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: 'Cannot demote the only remaining system administrator.',
        });
      }
    }

    const updateRes = await query(
      `UPDATE users
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, role, updated_at`,
      [role, targetUserId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'Target user not found.',
      });
    }

    return res.json({
      success: true,
      message: `User role successfully updated to '${role}'.`,
      data: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error('Admin update role error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to update user role.',
    });
  }
});

// GET /api/v1/admin/stats - System health & entity overview
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [userStats, taskStats, roleStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d
        FROM users
      `),
      query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tasks
        FROM tasks
      `),
      query(`
        SELECT role, COUNT(*) as count
        FROM users
        GROUP BY role
      `),
    ]);

    return res.json({
      success: true,
      data: {
        users: userStats.rows[0],
        tasks: taskStats.rows[0],
        roles: roleStats.rows,
        system: {
          databaseEngine: 'PostgreSQL 16 (Relational Engine)',
          authMethod: 'JWT Bearer Tokens (HS256) + bcrypt Hashing (10 rounds)',
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to fetch admin stats.',
    });
  }
});

export default router;
