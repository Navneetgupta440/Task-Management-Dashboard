import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.ts';
import { JWT_SECRET, authenticateToken, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Helper to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST /api/v1/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // 1. Validation
    const errors: string[] = [];
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long.');
    }
    if (!email || !isValidEmail(email)) {
      errors.push('A valid email address is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.push('Password must be at least 6 characters long.');
    }

    const normalizedRole = ['admin', 'manager', 'user'].includes(role) ? role : 'user';

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: errors[0],
        details: errors,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'An account with this email address already exists. Please log in instead.',
      });
    }

    // 3. Encrypted password storage using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert into PostgreSQL
    const insertRes = await query(
      `INSERT INTO users (name, email, password_hash, role, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, bio, created_at`,
      [name.trim(), normalizedEmail, passwordHash, normalizedRole, '']
    );

    const newUser = insertRes.rows[0];

    // 5. Generate JSON Web Token (24-hour expiration)
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        bio: newUser.bio,
        createdAt: newUser.created_at,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'An unexpected server error occurred during registration.',
    });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Email and password are both required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Fetch user from PostgreSQL
    const userRes = await query(
      `SELECT id, name, email, password_hash, role, bio, created_at
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'InvalidCredentials',
        message: 'Invalid email address or password.',
      });
    }

    const user = userRes.rows[0];

    // 2. Compare bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'InvalidCredentials',
        message: 'Invalid email address or password.',
      });
    }

    // 3. Generate JSON Web Token (24-hour expiration)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'An unexpected server error occurred during login.',
    });
  }
});

// GET /api/v1/auth/verify
router.get('/verify', authenticateToken, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

export default router;
