import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.ts';

export const JWT_SECRET = process.env.JWT_SECRET || 'secret-jwt-key-for-auth-dashboard-token-2026';

export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No authorization header provided. Please log in.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization format. Format must be "Bearer <token>".',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // Check if user still exists in database
    const userRes = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'The user account associated with this token no longer exists.',
      });
    }

    req.user = userRes.rows[0] as UserPayload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TokenExpired',
        message: 'Your session token has expired. Please sign in again.',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'InvalidToken',
      message: 'Invalid or forged authentication token.',
    });
  }
}

export function requireRole(allowedRoles: Array<'admin' | 'manager' | 'user'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Requires one of [${allowedRoles.join(', ')}] role. Current role: '${req.user.role}'.`,
      });
    }

    next();
  };
}

/**
 * Authorization middleware ensuring users access their own resources
 * while managers & admins manage team tasks.
 */
export async function authorizeTaskResource(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required.',
    });
  }

  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Invalid task ID format.',
    });
  }

  try {
    const taskRes = await query(
      `SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date, t.user_id, t.created_at, t.updated_at,
        u.name as author_name, u.email as author_email, u.role as author_role
       FROM tasks t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'Task not found.',
      });
    }

    const task = taskRes.rows[0];
    const userRole = req.user.role;
    const isOwner = task.user_id === req.user.id;
    const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';

    // Users can only access their own tasks; managers & admins can manage team tasks
    if (req.method === 'DELETE') {
      // Deletions are permitted for admins or the task owner
      const canDelete = userRole === 'admin' || isOwner;
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access denied. Only administrators or task owners can delete tasks.',
        });
      }
    } else {
      // GET (view) and PUT/PATCH (update)
      if (!isOwner && !isManagerOrAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access denied. Users can only access their own resources, while managers & admins manage team tasks.',
        });
      }
    }

    // Attach verified task to request for downstream handlers
    (req as any).task = task;
    next();
  } catch (err: any) {
    console.error('Resource authorization check error:', err);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'An error occurred during resource authorization.',
    });
  }
}
