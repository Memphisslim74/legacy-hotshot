# Legacy Hotshot Command Center

A mobile-friendly operations command center for **Legacy Hotshot LLC**. The application is being built in phases so Jared can start with a useful, simple operating system and add deeper trucking workflows as the company grows.

## Stage 1 status

Stage 1 establishes the production foundation:

- React + TypeScript + Vite application
- Responsive owner dashboard
- Desktop sidebar and driver-friendly mobile navigation
- Supabase authentication integration
- Owner, dispatcher, driver, and finance role foundation
- First-time company setup wizard
- Company/profile/settings/notification/audit database foundation
- Row Level Security policies
- Cloudflare Pages SPA routing
- Cloudflare Pages health endpoint
- Clearly labeled demo preview when Supabase is not connected

The dashboard uses a small amount of realistic sample data until Stage 2 connects loads, customers, quotes, and documents to Supabase.

## Application structure

```text
src/
  auth/          Authentication state and role-aware profile loading
  components/    Shell, branding, icons, cards, and status UI
  data/          Small Stage 1 preview dataset
  lib/           Supabase client and future integrations
  pages/         Login, setup, dashboard, and staged module screens
functions/
  api/           Cloudflare Pages Functions
public/          Cloudflare redirects and web-app manifest
supabase/
  migrations/    Versioned database and security changes
```

## Page map

- `/login` — secure sign-in and optional local demo preview
- `/setup` — first-time owner setup wizard
- `/` — owner Command Center dashboard
- `/loads`
- `/loads/new`
- `/customers`
- `/drivers`
- `/vehicles`
- `/documents`
- `/communications`
- `/expenses`
- `/invoices`
- `/reports`
- `/settings`

Routes beyond the dashboard are intentionally labeled with their scheduled stage rather than pretending to be finished.

## Database plan

The first migration creates:

- `companies` — business account record
- `profiles` — protected application profile for each Supabase Auth user
- `company_settings` — company identity, terms, branding, and communication defaults
- `notifications` — in-app owner and driver notifications
- `audit_logs` — protected history for important business actions

It also creates role enums, the new-user profile trigger, owner setup RPC, company-scoped helper functions, updated-at triggers, and Row Level Security policies.

Stage 2 will add customers, locations, load requests, quotes, loads, status history, documents, and secure customer tracking tokens.

## Run locally

### 1. Install Node.js

Use Node.js **22.12 or newer**.

```bash
node --version
npm --version
```

### 2. Clone and install

```bash
git clone https://github.com/Memphisslim74/legacy-hotshot.git
cd legacy-hotshot
git checkout develop/stage-1-foundation
npm install
```

### 3. Create the local environment file

```bash
cp .env.example .env.local
```

The app can be previewed without Supabase by leaving `VITE_ENABLE_DEMO_MODE=true` and selecting **Preview Stage 1 Demo** on the sign-in screen.

### 4. Start the application

```bash
npm run dev
```

Open the address shown by Vite, normally `http://localhost:5173`.

## Supabase project

The current Legacy Hotshot Supabase project URL is:

```text
https://hxbetjesuxmujtpcwxxz.supabase.co
```

## Run the Stage 1 database migration

1. Open the Legacy Hotshot Supabase project.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open `supabase/migrations/202607290001_stage1_foundation.sql` from this repository.
5. Copy the entire file into the SQL Editor.
6. Select **Run**.
7. Confirm the query completes without errors.
8. Open **Table Editor** and confirm these tables exist:
   - `companies`
   - `profiles`
   - `company_settings`
   - `notifications`
   - `audit_logs`

## Add the Supabase browser values

1. Open the Supabase project.
2. Select **Project Settings**.
3. Select **Data API**.
4. Copy the **Project URL**.
5. Copy the **Publishable key**.
6. Open `.env.local`.
7. Enter:

```text
VITE_SUPABASE_URL=https://hxbetjesuxmujtpcwxxz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_ENABLE_DEMO_MODE=true
```

Do not use the service-role key in the browser application.

## Create Jared’s first owner account

All new profiles default to the `driver` role. This prevents anyone from assigning themselves elevated access through signup metadata.

1. Open Supabase.
2. Select **Authentication**.
3. Select **Users**.
4. Select **Add user**.
5. Select **Create new user**.
6. Enter Jared’s email address.
7. Enter a temporary strong password.
8. Turn on **Auto Confirm User** only if Jared should sign in immediately.
9. In **User Metadata**, optionally add:

```json
{
  "full_name": "Jared"
}
```

10. Select **Create user**.
11. Open **SQL Editor** and select **New query**.
12. Replace the email in the statement below with Jared’s exact account email, then run it:

```sql
update public.profiles as profile
set role = 'owner'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('jared@example.com');
```

13. Confirm the result reports one updated row.
14. Jared can now sign in and complete the company setup wizard.

Keep public self-registration disabled unless a later project stage intentionally adds a controlled invitation workflow.

## Cloudflare Pages deployment

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Select **Create application**.
4. Select **Pages**.
5. Select **Connect to Git**.
6. Select GitHub and authorize access if requested.
7. Choose `Memphisslim74/legacy-hotshot`.
8. Use these build settings:
   - Production branch: `main`
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave blank
9. Under **Environment variables**, add:
   - `VITE_SUPABASE_URL` = `https://hxbetjesuxmujtpcwxxz.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the Supabase publishable key
   - `VITE_ENABLE_DEMO_MODE` = `false` for production
   - `ENVIRONMENT` = `production`
10. Save and deploy.
11. After deployment, open `/api/health` on the Pages domain. It should return JSON with `"ok": true`.

For branch previews, add the same values under the Preview environment and leave `VITE_ENABLE_DEMO_MODE=true` until Jared’s test account is ready.

## Authentication URL settings

After Cloudflare creates the Pages URL:

1. Open Supabase.
2. Select **Authentication**.
3. Select **URL Configuration**.
4. Set **Site URL** to the production Cloudflare Pages URL.
5. Add both the production URL and the development preview URL under **Redirect URLs**.
6. Save changes.

## Resend

Resend is intentionally deferred until Stage 4, when real load communications and customer templates are added. No Resend secret is required for Stage 1.

## Current external information still needed

- Supabase publishable key
- Jared’s owner email address
- Cloudflare Pages project URL after first deployment
- Actual Legacy Hotshot logo and brand colors
- Business phone number and contact email
- MC and USDOT numbers when Jared is ready to add them

## Testing status

The code and configuration have been reviewed manually. Dependency installation and the production build could not be executed inside the current restricted package environment, so the first Cloudflare preview build should be treated as the authoritative installation test. Any build error should be fixed before merging to `main`.
