# Asiana Hub

A staff management portal with a Money Advance Request module for managing and tracking student advance requests.

## Features

- 🔐 **Secure authentication** — email/password login, account lockout, password reset
- 👥 **Role-based access** — Requester, Approver, Administrator
- 💰 **Money Advance module** — full request lifecycle (Pending → Attended → Pending Return → Completed)
- 🎓 **Student management** — searchable student list with CSV bulk import
- 📋 **Audit trail** — every action recorded with user and timestamp
- 🏦 **Bank reference generator** — one-click copy of formatted transfer reference
- 🔍 **Search & filtering** — filter requests by student, status, date, requester
- 🛡️ **Security hardened** — HTTPS, bcrypt, JWT, parameterised queries, security headers

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** SQLite via Prisma ORM
- **Styling:** Tailwind CSS
- **Auth:** JWT (jose) + bcrypt
- **Email:** Nodemailer + Resend
- **Validation:** Zod
- **Hosting:** Render

---

## Quick Start (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your values
```

Minimum required for local dev:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="any-long-random-string-for-dev"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set up database

```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Create default admin account
```

### 4. Start the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Default admin login:**
- Email: `admin@asianahub.com`
- Password: `Admin@1234!`

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full step-by-step Render deployment instructions.

## Backup

See **[docs/BACKUP.md](docs/BACKUP.md)** for database backup and restore instructions.

## Admin Guide

See **[docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)** for administrator instructions.

## User Guide

See **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** for requester and approver instructions.

---

## Project Structure

```
asiana-hub/
├── docs/                        # Guides
│   ├── DEPLOYMENT.md
│   ├── BACKUP.md
│   ├── ADMIN_GUIDE.md
│   └── USER_GUIDE.md
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Initial admin seed
│   └── migrations/              # SQL migration files
├── src/
│   ├── app/
│   │   ├── (app)/               # Authenticated pages (with sidebar layout)
│   │   │   ├── dashboard/
│   │   │   ├── advance-requests/
│   │   │   │   ├── page.tsx     # List
│   │   │   │   ├── new/         # Submit form
│   │   │   │   └── [id]/        # Detail + actions
│   │   │   └── admin/
│   │   │       ├── registrations/
│   │   │       ├── users/
│   │   │       └── students/
│   │   ├── api/                 # API routes
│   │   │   ├── auth/
│   │   │   ├── requests/
│   │   │   ├── students/
│   │   │   └── admin/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── change-password/
│   └── lib/
│       ├── auth.ts              # JWT, session, password hashing
│       ├── email.ts             # Email sending
│       ├── prisma.ts            # Prisma client singleton
│       ├── utils.ts             # Helpers, bank reference generator
│       └── validations.ts       # Zod schemas
├── middleware.ts                # Route protection
├── .env.example
├── Dockerfile
└── docker-entrypoint.sh
```

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@asianahub.com | Admin@1234! |

⚠️ Change the admin password immediately on first login.

---

## License

Private — for internal organisational use only.
