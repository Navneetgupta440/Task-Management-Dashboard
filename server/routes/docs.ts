import { Router, Request, Response } from 'express';
import { openApiSpec } from '../../src/openapi.ts';

const router = Router();

// GET /api/v1/docs - OpenAPI JSON specification
router.get('/', (req: Request, res: Response) => {
  if (req.query.download === 'true') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
  }
  res.json(openApiSpec);
});

router.get('/download', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
  res.json(openApiSpec);
});

// GET /api/v1/docs/postman - Exportable Postman collection format
router.get('/postman', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const baseUrl = `${protocol}://${host}/api/v1`;

  const postmanCollection = {
    info: {
      name: 'Auth & Task Management API (Postman Collection)',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: 'Ready-to-import Postman Collection for all Auth, Profile, Task CRUD, and Admin endpoints.',
    },
    variable: [
      { key: 'baseUrl', value: baseUrl, type: 'string' },
      { key: 'token', value: '', type: 'string' },
    ],
    item: [
      {
        name: 'Auth',
        item: [
          {
            name: '1. Sign Up',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/auth/signup',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com', password: 'Password@123', role: 'user' }, null, 2),
              },
            },
          },
          {
            name: '2. Login (Admin)',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/auth/login',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ email: 'admin@primetrade.ai', password: 'Admin@123' }, null, 2),
              },
            },
          },
          {
            name: '3. Login (User)',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/auth/login',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ email: 'user@primetrade.ai', password: 'User@123' }, null, 2),
              },
            },
          },
          {
            name: '4. Verify Token',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/auth/verify',
              header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            },
          },
        ],
      },
      {
        name: 'Profile',
        item: [
          {
            name: 'Get Current Profile',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/me',
              header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            },
          },
          {
            name: 'Update Profile',
            request: {
              method: 'PUT',
              url: '{{baseUrl}}/me',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{token}}' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ name: 'Alex Rivera (Updated)', bio: 'Senior Full Stack Specialist' }, null, 2),
              },
            },
          },
        ],
      },
      {
        name: 'Tasks',
        item: [
          {
            name: 'List Tasks (with filters)',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/tasks?page=1&limit=10&status=in_progress',
                host: ['{{baseUrl}}'],
                path: ['tasks'],
                query: [
                  { key: 'page', value: '1' },
                  { key: 'limit', value: '10' },
                  { key: 'status', value: 'in_progress' },
                ],
              },
              header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            },
          },
          {
            name: 'Create Task',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/tasks',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{token}}' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  title: 'Implement unit testing suite',
                  description: 'Add Jest or Vitest integration tests for controllers',
                  status: 'todo',
                  priority: 'high',
                  due_date: '2026-10-01',
                }, null, 2),
              },
            },
          },
          {
            name: 'Update Task',
            request: {
              method: 'PUT',
              url: '{{baseUrl}}/tasks/1',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{token}}' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ status: 'completed' }, null, 2),
              },
            },
          },
          {
            name: 'Delete Task',
            request: {
              method: 'DELETE',
              url: '{{baseUrl}}/tasks/1',
              header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            },
          },
        ],
      },
      {
        name: 'Admin',
        item: [
          {
            name: 'List Users (Admin only)',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/admin/users',
              header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            },
          },
          {
            name: 'Update User Role',
            request: {
              method: 'PATCH',
              url: '{{baseUrl}}/admin/users/3/role',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Authorization', value: 'Bearer {{token}}' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ role: 'manager' }, null, 2),
              },
            },
          },
          {
            name: 'System Stats',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/admin/stats',
              header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
            },
          },
        ],
      },
    ],
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="auth-dashboard-postman.json"');
  res.json(postmanCollection);
});

export default router;
