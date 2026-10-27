# บ้านอุ่นใจ — Family Expense Tracker

A responsive, Thai-language family expense tracker built with Next.js App Router, TypeScript, Tailwind CSS, Recharts, and Supabase.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set your Supabase project URL and anon/publishable key.
3. Apply `supabase/migrations/20261025000000_family_expense_tracker.sql` to the Supabase project (for example, with the Supabase CLI or SQL Editor).
4. In Supabase Authentication settings, enable email/password signup and set the local site URL to `http://localhost:3000`.
5. Start the app with `npm run dev`.

The dashboard opens in a clearly labeled demo mode when Supabase is not configured or when no user is signed in. Demo changes live only in browser memory. Signup creates a new family, assigns the first user the admin role, and seeds the default expense categories. Supabase email confirmation behavior depends on the project's Auth settings.

## Features

- Thai responsive dashboard with monthly totals, remaining budget, category pie chart, and last-30-days daily spending chart.
- Expense create, edit, delete, and search.
- Monthly category budgets and admin-managed categories.
- Supabase email/password authentication and signup-time family provisioning.
- PostgreSQL Row Level Security policies isolate family data.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
