# Legacy Hotshot Command Center

A mobile-first operations command center for **Legacy Hotshot LLC**. The application is designed to help Jared manage loads, customer communication, documents, drivers, vehicles, expenses, invoices, and business performance without turning the first version into an oversized enterprise system.

## Stage 1

This branch contains the production foundation:

- React, TypeScript, and Vite
- Cloudflare Pages routing and health endpoint
- Responsive owner dashboard
- Mobile navigation foundation
- Supabase authentication client
- Owner, dispatcher, driver, and finance role foundation
- First-time company setup wizard
- Company, profile, settings, notification, and audit tables
- Row Level Security policies
- Demo preview with a small amount of clearly labeled sample data
- GitHub Actions type-check and production build validation

The following modules are visible in navigation but intentionally labeled by future stage until their real database workflows are built:

- Loads and load requests
- Customers and quotes
- Documents
- Driver portal
- Communications and Legacy LiveTrack
- Expenses, invoices, reports, drivers, and vehicles

## Repository structure

```text
src/
  auth/          Authentication and role-aware profile loading
  components/    Application shell and reusable interface components
  data/          Stage 1 demo data
  lib/           Supabase and future service clients
  pages/         Login, setup, dashboard, and staged module screens
functions/api/   Cloudflare Pages Functions
public/          Cloudflare redirects and web-app manifest
supabase/        Versioned SQL migrations
```

## Current Supabase project

```text
https://hxbetjesuxmujtpcwxxz.supabase.co
```

## Local setup

Use Node.js 22.12 or newer.

```bash
git clone https://github.com/Memphisslim74/legacy-hotshot.git
cd legacy-hotshot
git checkout develop/stage-1-foundation
npm install
cp .env.example .env.local
npm run dev
```

Open the address shown by Vite, normally `http://localhost:5173`.

To preview the interface before Supabase is connected, leave this value enabled:

```text
VITE_ENABLE_DEMO_MODE=true
```

Then select **Preview Stage 1 Demo** on the sign-in page.

## Supabase environment values

Open Supabase and go to **Project Settings → Data API**.

Copy the project URL and publishable key into `.env.local`:

```text
VITE_SUPABASE_URL=https://hxbetjesuxmujtpcwxxz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_ENABLE_DEMO_MODE=true
```

The publishable key is intended for the browser client. Never place a service-role key in the frontend application.

## Run the database migrations

Run every SQL file in `supabase/migrations` in filename order.

### Migration 1

`202607290001_stage1_foundation.sql`

Creates:

- Companies
- User profiles
- Company settings
- Notifications
- Audit history
- Role types
- New-user profile trigger
- Row Level Security policies

### Migration 2

`202607290002_setup_persistence.sql`

Adds the secure setup function that saves every value collected by Jared’s first-time setup wizard.

### Manual Supabase steps

1. Open the Legacy Hotshot Supabase project.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open the first migration file from this repository.
5. Copy the entire file into the SQL Editor.
6. Select **Run**.
7. Repeat the process for the second migration file.
8. Open **Table Editor** and confirm these tables exist:
   - `companies`
   - `profiles`
   - `company_settings`
   - `notifications`
   - `audit_logs`

## Create Jared’s owner account

All new profiles default to `driver`. This prevents a new account from assigning itself owner access.

1. Open **Supabase → Authentication → Users**.
2. Select **Add user → Create new user**.
3. Enter Jared’s email address and a temporary strong password.
4. Enable **Auto Confirm User** only when he should be able to sign in immediately.
5. Optionally add this user metadata:

```json
{
  "full_name": "Jared"
}
```

6. Create the user.
7. Open **SQL Editor → New query**.
8. Replace the email below with Jared’s exact account email and run the query:

```sql
update public.profiles as profile
set role = 'owner'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('jared@example.com');
```

9. Confirm one row was updated.
10. Jared can now sign in and complete the setup wizard.

Keep public self-registration disabled until a controlled invitation workflow is added.

## Cloudflare Pages

The GitHub repository already has a `main` branch. The complete Stage 1 application currently lives on `develop/stage-1-foundation` for review.

After the pull request is approved and merged:

1. Open **Cloudflare → Workers & Pages**.
2. Select **Create application → Pages → Connect to Git**.
3. Select `Memphisslim74/legacy-hotshot`.
4. Use:
   - Production branch: `main`
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: blank
5. Add production environment variables:
   - `VITE_SUPABASE_URL` = `https://hxbetjesuxmujtpcwxxz.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the Supabase publishable key
   - `VITE_ENABLE_DEMO_MODE` = `false`
   - `ENVIRONMENT` = `production`
6. Deploy.
7. Open `/api/health` on the Pages domain and confirm the response contains `"ok": true`.

For branch previews, use the same Supabase values and leave demo mode enabled until Jared’s owner account is ready.

## Supabase authentication URLs

After Cloudflare creates the Pages domain:

1. Open **Supabase → Authentication → URL Configuration**.
2. Set **Site URL** to the production Cloudflare Pages URL.
3. Add the production URL and any active Cloudflare preview URL under **Redirect URLs**.
4. Save.

## Branding

The Stage 1 interface uses the real Legacy visual direction supplied for the project:

- Black and white foundation
- Silver and charcoal neutrals
- Steel-blue accent
- Winged Legacy-style temporary mark
- Clean, non-generic trucking presentation

The exact logo and truck photographs should be stored as repository assets before the final production branding pass. Secure logo upload is scheduled with the private branding storage work.

## Resend

Resend is deferred until the real load communication workflows are built. No Resend secret is required for Stage 1.

## Still needed

- Supabase publishable key
- Jared’s owner email address
- Cloudflare Pages project URL after deployment
- Original logo image file for repository storage
- Selected truck hero photo file
- Business phone and company email
- MC and USDOT numbers when Jared is ready

## Validation

GitHub Actions runs:

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run build
```

Do not merge the Stage 1 pull request until that workflow passes.
