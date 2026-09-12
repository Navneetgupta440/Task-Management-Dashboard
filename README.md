# TaskFlow: Full-Stack Auth & Task Management Dashboard

A production-ready full-stack web application featuring React, Node.js, Express, and a relational PostgreSQL database with JSON Web Token (JWT) user authentication, bcrypt password hashing, and Role-Based Access Control (RBAC).

Built as the shortlisting assignment for the **Frontend Developer Intern (Auth + Dashboard)**.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express, TypeScript (run via `tsx` and bundled via `esbuild`)
- **Database**: PostgreSQL 16 (embedded persistent engine with support for external connection strings via `DATABASE_URL`)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`, HS256 algorithm, 7-day expiration)
- **Password Security**: Adaptive `bcryptjs` hashing with 10 salt rounds (zero plain text storage)
- **API Versioning**: RESTful standard under `/api/v1/...`

---

## 🔐 Security & Access Control (RBAC)

The application implements strict Role-Based Access Control across three user tiers:

| Role | Permissions & Access Scope |
| :--- | :--- |
| **Admin** | Full system authority: create/edit tasks, delete any task, view all company tasks, access Admin Console, manage user roles, view real-time PostgreSQL metrics. |
| **Manager** | Team supervisor: view all company tasks, create and edit any task, update task lifecycle status, access team stats. Cannot delete tasks owned by others or demote admins. |
| **User** | Standard member: view, create, edit, and delete their own tasks, update their personal profile. Protected from unauthorized access to other users' private data. |

---

## 🚀 Setup & Execution Guide

### 1. Environment Variables
Create or verify your `.env` configuration (referenced from `.env.example`):

```env
PORT=3000
JWT_SECRET=your-256-bit-jwt-secret-key-change-in-production

# Optional: Point to external PostgreSQL (e.g. AWS RDS, Supabase, Neon)
# If omitted, TaskFlow automatically runs embedded persistent PostgreSQL in ./data/postgres
DATABASE_URL=
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Initialization & Seeding
The PostgreSQL schema and initial demo accounts are automatically verified and seeded on server startup. To start the development server:

```bash
npm run dev
```
The server will boot on `http://0.0.0.0:3000`, serving both the Express `/api/v1` endpoints and Vite frontend middleware.

### 4. Production Build & Execution
```bash
npm run build
npm start
```

---

## ⚡ Deploying to Vercel (1-Click & Zero-Config)

This application is fully pre-configured for deployment on **Vercel** as a hybrid architecture:
- **Frontend**: Vite 6 React 19 SPA served via Vercel's global Edge CDN.
- **Backend**: Express REST API endpoints (`/api/*`) executed via Vercel Serverless Functions (`api/index.ts`).
- **Database**: Connects seamlessly to serverless PostgreSQL (e.g. Neon, Supabase, Vercel Postgres, AWS RDS) via `DATABASE_URL`, with automatic SSL enforcement and fallback support.

### Option A: Via Vercel Dashboard (Recommended)
1. Push your repository to GitHub or GitLab.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, add:
   - `JWT_SECRET`: Any secure random secret (e.g., `openssl rand -hex 32`).
   - `DATABASE_URL` (optional): PostgreSQL connection string from Neon / Supabase / Vercel Postgres.
4. Click **Deploy**. Vercel will build the frontend using `npm run build:client` and deploy `/api/index.ts` automatically as configured in `vercel.json`.

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

---

## 🔑 Demo Credentials (Pre-Seeded)

For rapid testing and evaluation, the following demo accounts are pre-seeded in the PostgreSQL database:

| Role | Email | Password | Pre-seeded Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@primetrade.ai` | `Admin@123` | Has access to Admin Console, all tasks, and role modification. |
| **Manager** | `manager@primetrade.ai` | `Manager@123` | Can view and update all team tasks. |
| **User** | `user@primetrade.ai` | `User@123` | Normal individual contributor view. |

*Tip: You can also register a brand-new account using the **Create Account** tab with client-side form validation.*

---

## 📚 API Documentation & Postman Collection

### OpenAPI 3.0 Specification
- Available live at: `GET /api/v1/docs`

### Ready-to-Import Postman Collection v2.1
- Available for 1-click download at: `GET /api/v1/docs/postman`
- Or click the **"API & Arch Specs"** button in the top navigation bar to inspect endpoints or download the Postman collection directly from the UI.

### Key Endpoints:
- `POST /api/v1/auth/signup` - Register user, hash password, issue JWT
- `POST /api/v1/auth/login` - Verify credentials, issue JWT
- `GET /api/v1/auth/verify` - Validate token
- `GET /api/v1/me` - Fetch profile & task summary
- `PUT /api/v1/me` - Update profile name and bio
- `GET /api/v1/tasks` - List tasks with `q`, `status`, `priority`, `sort`, `page`, `limit`
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/:id` - Read single task
- `PUT /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task (Owner or Admin only)
- `GET /api/v1/admin/users` - List all users & task counts (Admin only)
- `PATCH /api/v1/admin/users/:id/role` - Change user role (Admin only)
- `GET /api/v1/admin/stats` - System overview metrics (Admin only)

---

## 📈 Production Scaling Strategy (5–10 lines)

1. **Deployment & Containerization**: Package the Express backend and compiled static Vite bundle into a multi-stage Docker container deployed to serverless auto-scaling clusters (e.g. AWS ECS Fargate or Google Cloud Run) behind an Nginx reverse proxy with SSL termination.
2. **Database Clustering & Pooling**: Use managed PostgreSQL (AWS Aurora or Google Cloud SQL) with read-replicas for `GET /api/v1/tasks` queries, and introduce PgBouncer connection pooling to avoid connection starvation under high concurrent traffic.
3. **In-Memory Caching (Redis)**: Deploy a Redis cluster for JWT revocation lists (token blacklisting), rate limiting counters, and caching hot read queries with sub-millisecond response times.
4. **Database Indexing**: Apply composite B-Tree indexes on `(user_id, status)` and `created_at DESC` to ensure logarithmic search time as task counts scale into millions of rows.
5. **Security & Rate Limiting**: Integrate `helmet` for security headers, strict CORS origin policies, and `express-rate-limit` to prevent brute-force attacks on `/auth/login` and `/auth/signup`.
6. **Observability**: Implement structured JSON logging (Winston), OpenTelemetry distributed tracing, and Prometheus/Grafana dashboards for real-time SLA metrics.
