# Tuition Manager

Tuition Classes Management System: Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage, RLS).
Built to the project SOP. Roles: **Admin, Teacher, Student, Parent**.

## Quick start (local)

```bash
npm install
npm run db:start        # local Supabase in Docker (applies supabase/migrations)
npm run dev             # http://localhost:3100
```

Multi-institute SaaS: new institutes sign up at `/register` (free trial). Everyone signs in at `/login` with their
**institute code** (remembered on the device; share links like `/login?code=DEMO2026`). Platform admins sign in at
`/platform/login` and manage institutes, plans and subscriptions at `/platform`. Admins see their plan, usage and
renewal contacts at `/admin/subscription`; features not in the plan are hidden from the sidebar and show an upgrade
notice (`src/components/shared/feature-gate.tsx`).
Local emails (invitations, password resets) are captured by Mailpit at http://127.0.0.1:54324.

| Script | Purpose |
|---|---|
| `npm run db:test` | Business-rule & RLS test suite (63 checks, runs in a rolled-back transaction) |
| `npm run db:types` | Regenerate `src/types/database.ts` from the local schema |
| `npm run db:reset` | Recreate the local DB from migrations |
| `npm run typecheck` / `npm run lint` / `npm run build` | Quality gates |

## Environment

Copy `.env.example` → `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` is **server-only** (never prefix with `NEXT_PUBLIC_`).
It is used only after `assertRole("admin")`, for account creation/invites.

### Hosted Supabase checklist
1. Push migrations: `npx supabase db push --db-url "postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres"`
2. Auth → URL Configuration: **Site URL** = your app URL; **Redirect URLs** include `https://<app-domain>/**` (and `http://localhost:3100/**` for dev).
3. Auth → Providers → Email: **disable "Allow new users to sign up"** (accounts are created by the institute only).
4. Auth → SMTP: configure a real SMTP provider. The built-in sender is heavily rate-limited, and invitations/password resets depend on it.

## Architecture

```
src/app/(auth)/          login, forgot/reset password, first-run setup
src/app/{admin,teacher,student,parent}/   role portals (layout = requireRole guard)
src/app/auth/callback    email-link landing (implicit / PKCE / token-hash)
src/features/<module>/   server actions + module UI
src/components/          ui (shadcn/Base UI), shared (DataTable, filters, dialogs…), layout, dashboard
src/lib/                 supabase clients, auth/session, validations (zod), calculations, utilities
supabase/migrations/     schema, functions, RLS (source of truth)
supabase/tests/          SQL business-rule & permission tests
```

### Security model
- **RLS on every table.** Admin = own institute; Teacher = assigned batches only; Student = self; Parent = linked children.
- Roles live in `user_roles` and can only be written with the service role. Users can't change their own role, status or institute (DB trigger).
- **Money never moves from the client.** `record_payment`, `reverse_payment`, `waive_obligation`, `admit_student` and others are single-transaction `SECURITY DEFINER` functions.
  Payments, allocations, reversals and receipts are append-only (update/delete blocked by triggers). Each payment needs an idempotency key, so a double-submit can't record it twice.
- Sensitive actions are written to `audit_logs` (read-only to admins).
- Private files live in the `files` bucket under `{institute}/{area}/…`, readable only through signed URLs that storage policies check.

### Reporting basis
Fee collection = payments by payment date − reversals by reversal date. Outstanding = unpaid net obligations. Unpaid fees are never counted as cash.
Fee receipts are reported from `payments`, and `income_entries` holds only non-fee income, so nothing is counted twice.

## Implementation status (SOP §28 order)

| # | Module | Status |
|---|---|---|
| 1–4 | Project setup, full DB schema (45+ tables), auth (email/mobile login, remember me, reset, invites), RBAC + RLS | ✅ Done, tested |
| 5 | Institute settings (profile, logo, academic years, fee/attendance/exam/notification policies, grading) | ✅ |
| 6 | Students: admission wizard, profile, edit, status, transfer, documents, photo, family logins | ✅ |
| 7 | Teachers: profiles, login provisioning, staff attendance | ✅ |
| 8–9 | Classes, subjects, batches, teacher/student assignment, capacity override | ✅ |
| — | Admin dashboard (live), user management, audit logs, notifications, teacher/student/parent dashboards | ✅ |
| 10 | Timetable & session generation | 🟡 DB + rules done, UI next |
| 11 | Attendance marking & reports | 🟡 DB + rules done, UI next |
| 12–13 | Fee structures, payments, receipts (PDF), reversals | 🟡 DB + rules done, UI next |
| 14–15 | Exams, marks entry, results publication | 🟡 DB + rules done, UI next |
| 16–17 | Homework, study materials | 🟡 DB done, UI next |
| 18 | Income & expenses, salaries | 🟡 DB done, UI next |
| 19 | Notifications: in-app ✅; email/push/WhatsApp + scheduled jobs | ⏳ |
| 20 | Reports & exports (PDF/Excel/CSV) | ⏳ |
| 24–26 | Security pass, full QA, Vercel deployment | ⏳ |

Sidebar items for modules without UI yet are hidden (`ready: false` in `src/lib/permissions/navigation.ts`) so no menu entry leads to a dead screen.
