export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Auth & Task Management REST API',
    version: '1.0.0',
    description: 'Production-ready REST API built with Node.js, Express, PostgreSQL, JWT authentication, and Role-Based Access Control (RBAC).',
    contact: {
      name: 'Engineering Team',
      email: 'hello@primetrade.ai',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API v1 Base Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JSON Web Token received from /auth/login or /auth/signup',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/signup': {
      post: {
        summary: 'Register new user account',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Rivera' },
                  email: { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', minLength: 6, example: 'Pass@123' },
                  role: { type: 'string', enum: ['user', 'manager', 'admin'], default: 'user' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User successfully created, returns token and profile' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user & issue JWT',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@primetrade.ai' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful, returns JWT token & user object' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/me': {
      get: {
        summary: 'Get current authenticated user profile',
        tags: ['Profile'],
        responses: {
          200: { description: 'Current user profile with role and task statistics' },
          401: { description: 'Unauthorized / Token expired' },
        },
      },
      put: {
        summary: 'Update current user profile information',
        tags: ['Profile'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Alex Rivera' },
                  bio: { type: 'string', example: 'Senior React Developer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated' },
        },
      },
    },
    '/tasks': {
      get: {
        summary: 'List tasks with search, filter, and pagination',
        tags: ['Tasks'],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term in title or description' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'completed'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated list of tasks' },
        },
      },
      post: {
        summary: 'Create a new task',
        tags: ['Tasks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Build authentication flow' },
                  description: { type: 'string', example: 'Implement login and register forms' },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'completed'], default: 'todo' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                  due_date: { type: 'string', format: 'date', example: '2026-09-30' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Task created' },
        },
      },
    },
    '/tasks/{id}': {
      get: {
        summary: 'Get task by ID',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Task found' }, 404: { description: 'Task not found' } },
      },
      put: {
        summary: 'Update task by ID',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Task updated' }, 403: { description: 'Forbidden' } },
      },
      delete: {
        summary: 'Delete task by ID',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Task deleted' }, 403: { description: 'Forbidden' } },
      },
    },
    '/admin/users': {
      get: {
        summary: 'Admin only: list all registered users',
        tags: ['Administration (RBAC)'],
        responses: { 200: { description: 'List of all system users' }, 403: { description: 'Requires admin role' } },
      },
    },
    '/admin/users/{id}/role': {
      patch: {
        summary: 'Admin only: update user role',
        tags: ['Administration (RBAC)'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['admin', 'manager', 'user'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Role changed' }, 403: { description: 'Forbidden' } },
      },
    },
    '/admin/stats': {
      get: {
        summary: 'Admin only: view system health and database statistics',
        tags: ['Administration (RBAC)'],
        responses: { 200: { description: 'System overview metrics' } },
      },
    },
  },
};
