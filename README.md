# Tuition Manager (web app)

Tuition Classes Management System, sold as a multi-institute subscription SaaS.
Next.js 16 (App Router) frontend for the Express + Neon Postgres API in `../tuition-backend`.
Roles: **Admin, Teacher, Student, Parent**, plus **Platform admin** (runs the SaaS).

## Quick start (local)

```bash
# 1. backend (see ../tuition-backend/README.md)
cd ../tuition-backend && npm install && npm run db:migrate && npm run dev   # http://localhost:4000

# 2. this app
cd ../tuition-management && npm install
cp .env.example .env    # API_INTERNAL_KEY must equal the backend's
npm run dev             # http://localhost:3100
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3100 |
| `npm run typecheck` / `npm run lint` / `npm run build` | Quality gates |

Database migrations, SQL tests (`db:test`), demo seed and the platform-admin script live in the backend.

## Environment (`.env`)
`API_URL` (backend URL), `API_INTERNAL_KEY` (**server only**, same value as the backend), `NEXT_PUBLIC_SITE_URL`,
and optional `SUPPORT_EMAIL` / `SUPPORT_PHONE` / `SUPPORT_WHATSAPP`, which appear on the institute's Subscription page.

## Multi-institute SaaS
- New institutes sign up at `/register` and get a free trial.
- Everyone signs in at `/login` with their **institute code**. The device remembers the code, and links like
  `/login?code=ABC1234` fill it in. One login can belong to several institutes and switch between them.
- Platform admins sign in at `/platform/login` and manage institutes, plans and subscriptions at `/platform`.
  Payments are recorded by hand (there is no payment gateway yet).
- Admins see their plan, usage and renewal contacts at `/admin/subscription`. Features not in the plan are hidden from
  the sidebar and show an upgrade notice (`src/components/shared/feature-gate.tsx`). Expired subscriptions are read-only.

## Architecture

```
src/app/(auth)/           login, register, forgot/reset password
src/app/{admin,teacher,student,parent}/   role portals (layout = role guard)
src/app/platform/         platform admin console
src/app/api/files/        proxy for short-lived signed file URLs
src/features/<module>/    server actions + module UI
src/components/           ui (shadcn/Base UI), shared (DataTable, filters, dialogs…), layout, dashboard
src/lib/api/server.ts     the only place that calls the backend (adds API key + session token)
src/lib/                  auth/session, permissions/navigation, validations (zod), calculations, utilities
src/proxy.ts              route protection middleware
```

- The browser never talks to the backend directly. The session token lives in an httpOnly cookie, and the Next.js
  server forwards it as `Authorization: Bearer` together with `x-internal-key`.
- Authorization is enforced in the backend (route checks plus Postgres Row Level Security per institute).
  The UI guards only decide what to show.
- Money is never moved by the client: payments, reversals, waivers and admissions are single-transaction SQL functions.

## Status
All role portals are built: students, teachers, classes, batches, subjects, attendance, timetable, fees, payments
and receipts, exams and results, homework, study materials, notifications, users, settings, audit logs, subscription.
Still hidden (`ready: false` in `src/lib/permissions/navigation.ts`): **Income & Expenses** and **Reports & Analytics**.
Not built yet: payment gateway (Razorpay), trial-expiry emails, moving files from local disk to S3/R2, and impersonation.
