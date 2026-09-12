import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';

let pgliteInstance: PGlite | null = null;
let pgPool: pg.Pool | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

function getDataDir(): string {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    const tmpDir = path.resolve('/tmp', 'postgres');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not create /tmp/postgres:', e);
    }
    return tmpDir;
  }

  try {
    const localDir = path.resolve(process.cwd(), 'data/postgres');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.resolve('/tmp', 'postgres');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return tmpDir;
  }
}

export async function getDb() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  const isValidPgUrl = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));

  if (isValidPgUrl) {
    try {
      if (!pgPool) {
        const requiresSsl = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');
        pgPool = new pg.Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 5000,
          ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
        });
      }
      return {
        query: async (text: string, params: any[] = []) => {
          try {
            const res = await pgPool!.query(text, params);
            return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
          } catch (err) {
            console.warn('PostgreSQL external pool error, falling back to local PostgreSQL engine:', err);
            if (!pgliteInstance) {
              const dataDir = getDataDir();
              try {
                pgliteInstance = new PGlite(dataDir);
                await pgliteInstance.waitReady;
              } catch (pglErr) {
                console.warn('PGlite directory error, using in-memory engine:', pglErr);
                pgliteInstance = new PGlite();
                await pgliteInstance.waitReady;
              }
            }
            const res = await pgliteInstance.query(text, params);
            return { rows: res.rows, rowCount: res.rows.length };
          }
        },
      };
    } catch (poolErr) {
      console.warn('Failed to initialize pgPool, using local PostgreSQL engine:', poolErr);
    }
  }

  if (!pgliteInstance) {
    const dataDir = getDataDir();
    try {
      pgliteInstance = new PGlite(dataDir);
      await pgliteInstance.waitReady;
    } catch (pglErr) {
      console.warn('PGlite directory error, using in-memory engine:', pglErr);
      pgliteInstance = new PGlite();
      await pgliteInstance.waitReady;
    }
  }

  return {
    query: async (text: string, params: any[] = []) => {
      const res = await pgliteInstance!.query(text, params);
      return { rows: res.rows, rowCount: res.rows.length };
    },
  };
}

export async function query(text: string, params: any[] = []) {
  const db = await getDb();
  return db.query(text, params);
}

export async function initDatabase() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {

  const db = await getDb();

  // 1. Create users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user' NOT NULL,
      bio TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create tasks table
  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'todo' NOT NULL,
      priority VARCHAR(50) DEFAULT 'medium' NOT NULL,
      due_date DATE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Create indexes for performance & query optimization
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

  // 4. Seed demo users if none exist
  const existingUsers = await db.query('SELECT COUNT(*) as count FROM users');
  const userCount = Number(existingUsers.rows[0]?.count || 0);

  if (userCount === 0) {
    console.log('Seeding initial demo accounts in PostgreSQL database...');

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Admin@123', salt);
    const managerPass = await bcrypt.hash('Manager@123', salt);
    const userPass = await bcrypt.hash('User@123', salt);

    // Insert Admin
    const adminRes = await db.query(
      `INSERT INTO users (email, password_hash, name, role, bio)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        'admin@primetrade.ai',
        adminPass,
        'Rajiv Gupta (Lead Admin)',
        'admin',
        'Senior System Architect and Security Administrator with full access privilege.',
      ]
    );
    const adminId = adminRes.rows[0].id;

    // Insert Manager
    const managerRes = await db.query(
      `INSERT INTO users (email, password_hash, name, role, bio)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        'manager@primetrade.ai',
        managerPass,
        'Sarah Jenkins (Engineering Manager)',
        'manager',
        'Frontend team lead overseeing sprint deliverables and task allocations.',
      ]
    );
    const managerId = managerRes.rows[0].id;

    // Insert Regular User
    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, name, role, bio)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        'user@primetrade.ai',
        userPass,
        'Alex Rivera (Software Engineer)',
        'user',
        'Full-stack developer focused on React interfaces and Node.js microservices.',
      ]
    );
    const regularUserId = userRes.rows[0].id;

    // Seed realistic tasks
    const tasks = [
      {
        title: 'Design PostgreSQL schema & indexes',
        description: 'Set up users and tasks tables with foreign key relations, cascade delete, and indexing on user_id and status.',
        status: 'completed',
        priority: 'high',
        due_date: '2026-09-15',
        user_id: adminId,
      },
      {
        title: 'Implement JWT authentication & bcrypt hashing',
        description: 'Create signup/login endpoints with 10 salt-round bcrypt password hashing and 24-hour expiration tokens.',
        status: 'completed',
        priority: 'high',
        due_date: '2026-09-18',
        user_id: adminId,
      },
      {
        title: 'Enforce Role-Based Access Control (RBAC)',
        description: 'Add authorization middleware ensuring users access their own resources while managers & admins manage team tasks.',
        status: 'in_progress',
        priority: 'high',
        due_date: '2026-09-20',
        user_id: managerId,
      },
      {
        title: 'Conduct team code review for sprint 4',
        description: 'Audit pull requests for accessibility, responsive mobile breakpoints, and error boundary handling.',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-09-22',
        user_id: managerId,
      },
      {
        title: 'Build responsive task list and filter components',
        description: 'Implement real-time search, status filtering, pagination, and debounce on search inputs using Tailwind CSS.',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2026-09-25',
        user_id: regularUserId,
      },
      {
        title: 'Write automated unit tests for auth middleware',
        description: 'Test invalid tokens, expired headers, missing bearer prefixes, and unauthorized role rejections.',
        status: 'todo',
        priority: 'low',
        due_date: '2026-09-28',
        user_id: regularUserId,
      },
    ];

    for (const t of tasks) {
      await db.query(
        `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.title, t.description, t.status, t.priority, t.due_date, t.user_id]
      );
    }

    console.log('Demo database seeded successfully with Admin, Manager, and User roles.');
  }

  // Ensure at least one active task has due_date set to CURRENT_DATE so due-soon visual indicators are active
  try {
    await db.query(`
      UPDATE tasks 
      SET due_date = CURRENT_DATE 
      WHERE id = (
        SELECT id FROM tasks 
        WHERE status != 'completed' 
        ORDER BY id ASC 
        LIMIT 1
      )
    `);
  } catch (updateErr) {
    console.warn('Could not set demo task due_date to CURRENT_DATE:', updateErr);
  }

  initialized = true;
  })();

  return initPromise;
}
