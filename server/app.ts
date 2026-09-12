import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.ts';
import profileRoutes from './routes/profile.ts';
import taskRoutes from './routes/tasks.ts';
import adminRoutes from './routes/admin.ts';
import docsRoutes from './routes/docs.ts';

const app = express();

app.use(cors());
app.use(express.json());

// Normalizes request paths if Vercel stripped the /api prefix during rewrites
app.use((req, res, next) => {
  if (
    !req.url.startsWith('/api') &&
    (req.url.startsWith('/v1') || req.url === '/health' || req.url.startsWith('/health'))
  ) {
    req.url = `/api${req.url}`;
  }
  next();
});

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'PostgreSQL 16 Engine Active',
    platform: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Container',
    timestamp: new Date().toISOString(),
  });
});

// Application API routes
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

export default app;
