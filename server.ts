import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.ts';
import authRoutes from './server/routes/auth.ts';
import profileRoutes from './server/routes/profile.ts';
import taskRoutes from './server/routes/tasks.ts';
import adminRoutes from './server/routes/admin.ts';
import docsRoutes from './server/routes/docs.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize PostgreSQL tables & seed accounts
  await initDatabase();

  app.use(cors());
  app.use(express.json());

  // Request logger middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (!req.url.startsWith('/@') && !req.url.startsWith('/src/') && !req.url.includes('.vite')) {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: 'PostgreSQL 16 Engine Active',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/me', profileRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/docs', docsRoutes);

  // 404 handler for unknown API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `The requested endpoint ${req.method} ${req.url} was not found on this server.`,
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected internal server error occurred.',
    });
  });

  // Vite middleware in development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Authentication & Dashboard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
