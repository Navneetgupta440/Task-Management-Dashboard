import { Router, Response } from 'express';
import { query } from '../db.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/v1/me - Fetch current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userRes = await query(
      `SELECT id, name, email, role, bio, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'User profile not found.',
      });
    }

    const user = userRes.rows[0];

    // Also get quick stats for the user
    const statsRes = await query(
      `SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks
       FROM tasks WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio || '',
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        stats: statsRes.rows[0],
      },
    });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to fetch user profile.',
    });
  }
});

// PUT /api/v1/me - Update user profile
router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, bio } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Name must be at least 2 characters long.',
      });
    }

    const currentRes = await query('SELECT name, bio FROM users WHERE id = $1', [userId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'User profile not found.',
      });
    }

    const newName = name !== undefined ? name.trim() : currentRes.rows[0].name;
    const newBio = bio !== undefined ? String(bio).trim() : currentRes.rows[0].bio;

    const updateRes = await query(
      `UPDATE users
       SET name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, email, role, bio, created_at, updated_at`,
      [newName, newBio, userId]
    );

    const updatedUser = updateRes.rows[0];

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        bio: updatedUser.bio,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to update user profile.',
    });
  }
});

export default router;
