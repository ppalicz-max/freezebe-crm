# Freezbee Sales CRM

Mobile sales CRM for Freezbee frozen pizzas: clients, orders, commission, follow-ups.
Vite + React, Supabase (Postgres, Auth, row-level security) in the EU, deployed on Vercel.

- Reps see only their own clients and orders. Owners also see the **Team** view, edit the
  product catalog and manage team members. The database enforces this (row-level security), not just the app.
- Commission = pieces × commission per piece. Price and commission are copied onto each order line
  when it is saved, so catalog changes never change past commission.
- Sign-in by email code (6 digits; the email also has a link). Only emails on the team list can sign in.
- Hungarian and English.

The plan and design decisions are in [docs/PLAN.md](docs/PLAN.md). The original Claude artifact is kept in
[docs/original-artifact.html](docs/original-artifact.html).

## Deploying

### 1. Supabase (database and sign-in)

1. Create a project at [supabase.com](https://supabase.com) in region **Central EU (Frankfurt)**.
2. In `supabase/seed.sql`, replace `owner@example.com` with the first owner's email.
3. Create the tables: either paste each file in `supabase/migrations/` (in name order) and then
   `supabase/seed.sql` into **SQL Editor** and run them, or use the CLI:
   `npx supabase link --project-ref <ref>`, `npx supabase db push`, then run the seed in the SQL editor.
4. **Authentication → Sign In / Providers → Email**: keep Email enabled and **Allow new users to sign up** on
   (the hook below limits sign-ups to the team list). Email OTP length: 6.
5. **Authentication → Hooks**: add a **Before User Created** hook of type *Postgres function*,
   function `public.hook_before_user_created`. If your plan doesn't offer this hook, people not on the
   list can still create a login, but they only see a "No access" screen and the database gives them no data.
6. **Authentication → Emails → Templates**: paste `supabase/templates/sign_in_code.html` into both
   **Magic link** and **Confirm signup** (it shows the 6-digit code and a link).
7. **Authentication → Emails → SMTP settings**: set up your own email sender (for example Brevo, Resend or
   Postmark, with an EU region). Supabase's built-in sender is only for testing and sends very few emails per hour.
8. **Authentication → URL Configuration**: set **Site URL** to the Vercel address (e.g. `https://crm.freezbee.hu`).

### 2. Vercel

1. Import this repository in Vercel (framework preset: **Vite**).
2. Add the environment variables (Production and Preview):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` | the anon (or publishable) key, same page |

3. Deploy. Use the **Pro** plan: Vercel's free Hobby plan is for non-commercial use only.

### 3. First sign-in

Open the site, enter the owner email from the seed, type the code from the email. Then add the reps under
**Team → Team members**; each can sign in with their own email.

## Local development

```bash
npm install
cp .env.example .env   # fill in a Supabase dev project
npm run dev            # http://localhost:5173
```

With Docker you can run Supabase locally instead: `npx supabase start` (applies the migration and seed,
and shows sign-in emails at http://localhost:54324). Put the URL and anon key it prints into `.env`.

## Tests

| Command | What it checks |
|---|---|
| `npm test` | Commission maths, helpers, CSV, strings |
| `npm run test:db` | Row-level security and commission rules in the real schema, on a throwaway Postgres 16 |
| `npm run test:e2e` | Phone-sized browser run-through: sign-in, clients, orders, team view, catalog changes, removing a member |

`test:db` needs Postgres 16+ binaries. `test:e2e` also needs [PostgREST](https://postgrest.org) on the PATH
(or `POSTGREST_BIN`); it starts a local stack with a fake sign-in server (code `123456`).
The database check can also run against a Supabase dev database: `psql "$DATABASE_URL" -f tests/db/rls_test.sql`
(it rolls back everything it does).

## Project layout

```
src/               React app: screens/, sheets/, components/, lib/ (db, commission, format, csv), i18n.ts
supabase/          migrations, seed, local config, email template
tests/             unit/, db/, e2e/
```
