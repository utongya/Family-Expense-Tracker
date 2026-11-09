# บ้านอุ่นใจ — Family Expense Tracker

A responsive, Thai-language family expense tracker built with Next.js App Router, TypeScript, Tailwind CSS, Recharts, and Supabase.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set your Supabase project URL and anon/publishable key. To send family invitations, also set the server-only `SUPABASE_SERVICE_ROLE_KEY` to a Supabase secret or legacy service-role key. Never use a `NEXT_PUBLIC_` prefix for this key or commit it.
3. Apply all SQL files in `supabase/migrations` in filename order to the Supabase project (for example, with the Supabase CLI or SQL Editor).
4. In Supabase Authentication settings, enable email/password signup and set the local site URL to `http://localhost:3000`.
5. Start the app with `npm run dev`.

The dashboard opens in a clearly labeled demo mode when Supabase is not configured or when no user is signed in. Demo changes live only in browser memory. Signup creates a new family, assigns the first user the admin role, and seeds the default expense categories. Supabase email confirmation behavior depends on the project's Auth settings.

## Invitations and password recovery

- An admin can invite a new email from the family settings. Supabase creates the Auth user and the database trigger adds the profile to the family; the invitation row may already be gone before the member opens the email.
- In Supabase Authentication → URL Configuration, allow `http://localhost:3000/auth/set-password` for local use and the equivalent `/auth/set-password` URL for each deployed site. Configure the production site URL and any other auth callback URLs as appropriate. The default Invite User and Reset Password email templates should link to `{{ .ConfirmationURL }}`; customized templates must preserve the Supabase verification and redirect flow. These pages use the implicit link flow, not a PKCE `code` link.
- The member opens the invitation and sets a password for the email shown on the page. A different signed-in account is not used to set that password. Once saved, the browser signs in as that member.
- If an invitation is expired or was already used, or a member never successfully set a password, use **ลืมรหัสผ่านหรือตั้งรหัสผ่านครั้งแรก?** on the login screen. The recovery email sets a password on the existing account; it does not delete the member or their expenses. Check spam and Supabase email/SMTP settings if no email arrives.
- Configure `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the hosting provider's environment settings as well as locally, then redeploy. Keep the service key private; rotate it if exposed. Supabase's built-in email service has delivery restrictions, so configure custom SMTP for production.

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
node --experimental-strip-types --test tests/password-link.test.mjs
```

The authentication tests use a mocked Supabase endpoint and Node.js 22 or newer; they do not send email or alter real accounts. A production deployment still requires a real invitation and recovery test with a separate test account.
