# PYB Attendance

A multi-user Sunday class attendance system built on Cloudflare Pages + D1.

## Features

- Student management (add, edit, archive/restore)
- Sunday attendance tracking with timestamps
- Automatic late detection (configurable threshold)
- Student and weekly attendance reports
- No-show flagging (>3 consecutive absences)
- Multi-user support with shared database
- Cookie-based authentication
- Mobile responsive design

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite)
- **Routing:** React Router v6
- **State:** Zustand (client-side only)
- **Icons:** lucide-react
- **Dates:** date-fns

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) v3+
- A Cloudflare account

## Quick Start (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Create the D1 database (local)

```bash
# Apply schema
npm run db:schema

# Apply seed data
npm run db:seed
```

### 3. Build the frontend

```bash
npm run build
```

### 4. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:8788`.

### 5. Log in

Use the seeded admin account:

- **Email:** `admin@pyb.org`
- **Password:** `admin123`

## Deploying to Cloudflare

### 1. Log in to Cloudflare

```bash
npx wrangler login
```

### 2. Create the D1 database

```bash
npx wrangler d1 create pyb-attendance-db
```

Copy the `database_id` from the output and paste it into `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pyb-attendance-db",
      "database_id": "YOUR_DATABASE_ID_HERE"  // <-- paste here
    }
  ]
}
```

### 3. Apply schema and seed data to remote

```bash
npm run db:schema:remote
npm run db:seed:remote
```

### 4. Build and deploy

```bash
npm run deploy
```

This runs `vite build` then `wrangler pages deploy dist`.

### 5. Set session secret (recommended)

In the Cloudflare dashboard, go to your Pages project > Settings > Environment Variables and add:

| Variable | Value |
| --- | --- |
| `SESSION_SECRET` | A random string (e.g., `openssl rand -hex 32`) |

## Project Structure

```
/
├── functions/          # Cloudflare Pages Functions (API routes)
│   └── api/
│       ├── _shared/    # Shared server utilities
│       ├── auth/       # Login, logout, session check
│       ├── students/   # CRUD + archive/restore
│       ├── sessions/   # Session management
│       ├── attendance/ # Attendance recording
│       ├── reports/    # Student and weekly reports
│       ├── no-shows.ts # No-show calculation
│       └── health.ts   # Health check
├── sql/
│   ├── schema.sql      # Database schema
│   └── seed.sql        # Demo seed data
├── src/
│   ├── app/            # App root and router
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # API client
│   ├── pages/          # Page components
│   ├── store/          # Zustand stores
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── public/             # Static assets
├── wrangler.jsonc      # Cloudflare configuration
└── package.json
```

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/students` | List students |
| POST | `/api/students` | Create student |
| GET | `/api/students/:id` | Get student |
| PUT | `/api/students/:id` | Update student |
| POST | `/api/students/:id/archive` | Archive student |
| POST | `/api/students/:id/restore` | Restore student |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create/get session |
| GET | `/api/attendance?sessionDate=` | Get attendance by date |
| POST | `/api/attendance/save` | Save attendance (upsert) |
| PUT | `/api/attendance/:recordId` | Update single record |
| GET | `/api/attendance/student/:id` | Student attendance history |
| GET | `/api/reports/student/:id` | Student report (filterable) |
| GET | `/api/reports/weekly` | Weekly summaries |
| GET | `/api/no-shows` | Flagged no-show students |
| GET | `/api/health` | Health check |

## Business Rules

- **Sunday-only:** Sessions can only be created on Sundays
- **Late detection:** Students checking in after `start_time + threshold` are marked late
- **No-show:** Students with >3 consecutive absences across scheduled sessions
- **Upsert:** One attendance record per student per session; saves are idempotent
- **Archived students** don't appear in attendance-taking or no-show calculations

## Default Credentials

| Email | Password | Role |
| --- | --- | --- |
| `admin@pyb.org` | `admin123` | Admin |

**Change the default password after first deployment.**

## Troubleshooting

### Database errors on dev

Make sure you've applied the schema and seed:

```bash
npm run db:reset
```

### Session cookie issues

Ensure `SESSION_SECRET` is set consistently. Changing it invalidates all sessions.

### Frontend routing 404 on refresh

Cloudflare Pages handles SPA routing automatically when using Pages Functions.
