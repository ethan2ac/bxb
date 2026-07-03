# PYB Attendance

A multi-user Sunday class attendance system built on Cloudflare Pages + D1.

## Features

- Student management (add, edit, archive/restore) with bilingual English/Chinese names and phone numbers
- Sunday attendance tracking with timestamps
- Automatic late detection (configurable threshold)
- Excused absences (don't count toward no-show flagging or attendance rate)
- Student, weekly, and monthly-trend attendance reports
- Configurable no-show flagging (default: >3 consecutive absences)
- Audit log of all student/attendance/session/settings changes
- Multi-user support with shared database
- Cookie-based authentication
- Mobile responsive design

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite), managed via `wrangler d1 migrations`
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

### 2. Set up the local D1 database

```bash
# Apply migrations (creates tables)
npm run db:migrate:local

# Apply seed data (admin user + real student roster)
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

**Change this password before going to production** — either directly in D1 (`UPDATE users SET password_hash = ...`) or by adding an admin-facing change-password flow.

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
      "database_id": "YOUR_DATABASE_ID_HERE",  // <-- paste here
      "migrations_dir": "migrations"
    }
  ]
}
```

### 3. Apply migrations and seed data to remote

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

`migrations/*.sql` files use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` — they are additive and safe to re-run. **Never** run `sql/dev-reset.sql` against `--remote`; it drops every table and is local-dev-only.

Future schema changes should be added as new files in `migrations/` (e.g. `wrangler d1 migrations create pyb-attendance-db <name>`), not by editing `0001_initial.sql` after it's been applied to a live database.

### 4. Set the session secret (required for production)

The app falls back to a default `SESSION_SECRET` for local dev convenience. **Set a real one before deploying**, or every session cookie is signed with a publicly-known key:

```bash
npx wrangler pages secret put SESSION_SECRET
# paste a random value, e.g. from: openssl rand -hex 32
```

Or via the Cloudflare dashboard: Pages project → Settings → Environment Variables (as an encrypted secret, not a plaintext variable).

### 5. Build and deploy

```bash
npm run deploy
```

This runs `vite build` then `wrangler pages deploy dist`.

## Project Structure

```
/
├── functions/          # Cloudflare Pages Functions (API routes)
│   └── api/
│       ├── _shared/    # Shared server utilities (auth, crypto, db, audit, validation)
│       ├── auth/       # Login, logout, session check
│       ├── students/   # CRUD + archive/restore
│       ├── sessions/   # Session management
│       ├── attendance/ # Attendance recording
│       ├── reports/    # Student, weekly, and monthly reports
│       ├── settings/   # App-wide configurable settings
│       ├── audit-logs/ # Activity log for the Settings page
│       ├── no-shows.ts # No-show calculation
│       └── health.ts   # Health check
├── migrations/         # Additive D1 schema migrations (wrangler d1 migrations)
├── sql/
│   ├── seed.sql        # Real student roster + admin user + default settings
│   └── dev-reset.sql   # LOCAL DEV ONLY — drops all tables for a clean reset
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
| GET | `/api/reports/monthly?months=` | Monthly attendance-rate trend |
| GET | `/api/no-shows` | Flagged no-show students |
| GET | `/api/settings` | App settings (thresholds, defaults) |
| PUT | `/api/settings` | Update app settings |
| GET | `/api/audit-logs?limit=` | Recent activity log |
| GET | `/api/health` | Health check |

## Business Rules

- **Sunday-only:** Sessions can only be created on Sundays
- **Late detection:** Students checking in after `start_time + threshold` are marked late
- **Excused absences:** Don't count toward no-show flagging and are excluded from attendance-rate denominators
- **No-show:** Students with more than `no_show_threshold` (default 3, configurable in Settings) consecutive absences — excused absences don't break or extend the streak, they're skipped
- **Upsert:** One attendance record per student per session; saves are idempotent
- **Archived students** don't appear in attendance-taking or no-show calculations
- **Audit log:** Every student/session/attendance/settings mutation is recorded with the acting user, for accountability across a multi-admin team

## Default Credentials

| Email | Password | Role |
| --- | --- | --- |
| `admin@pyb.org` | `admin123` | Admin |

**Change the default password after first deployment.**

## Troubleshooting

### Database errors on dev

Make sure you've applied migrations and seed data:

```bash
npm run db:reset
```

This drops all local tables, re-applies `migrations/`, and re-seeds.

### Session cookie issues

Ensure `SESSION_SECRET` is set consistently. Changing it invalidates all sessions.

### Frontend routing 404 on refresh

Cloudflare Pages handles SPA routing automatically when using Pages Functions.
