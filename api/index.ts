import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/app.ts';
import { initDatabase } from '../server/db.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Ensure database tables and initial seed data exist
    await initDatabase();
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel serverless invocation error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: 'ServerError',
        message: error?.message || 'Internal Server Error during serverless execution',
      })
    );
  }
}
