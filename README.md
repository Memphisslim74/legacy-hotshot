# Legacy Hotshot Command Center

A mobile-first operations command center for **Legacy Hotshot LLC**, owned by **Jared Guinn**.

Live application:

```text
https://legacy-hotshot.pages.dev
```

Public load request form:

```text
https://legacy-hotshot.pages.dev/request-load
```

## Current application status

The repository currently includes:

- React, TypeScript, and Vite
- Cloudflare Pages deployment
- Responsive owner dashboard
- Supabase authentication and role foundation
- First-time company setup wizard
- Customers
- Public and internal load requests
- Quotes
- Booked loads and status history
- Load profitability and mileage fields
- Private operational documents
- Row Level Security policies
- Demo mode until Supabase is activated

## Important: Supabase is currently a fresh project

No Legacy Hotshot migrations have been run yet.

Do not begin with migration 004 or 005. Run **every SQL file** in `supabase/migrations` in filename order.

### Required migration order

1. `202607290001_stage1_foundation.sql`
   - Creates companies, profiles, company settings, notifications, audit logs, role types, triggers, helper functions, and initial Row Level Security.

2. `202607290002_setup_persistence.sql`
   - Adds the secure first-time owner setup function used by the application.

3. `202607290003_legacy_brand_defaults.sql`
   - Applies the approved Legacy red brand color and the owner name Jared Guinn.

4. `202607290004_stage2_operations.sql`
   - Creates customers, load requests, quotes, loads, status history, documents, operational functions, and related security policies.

5. `202607290005_private_document_storage.sql`
   - Creates the private `legacy-documents` Supabase Storage bucket and its access policies.

## Exact fresh Supabase setup

### 1. Run migration 001

1. Open the Legacy Hotshot project in Supabase.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open `supabase/migrations/202607290001_stage1_foundation.sql` in GitHub.
5. Copy the entire file.
6. Paste it into Supabase SQL Editor.
7. Select **Run**.
8. Wait for a successful result before continuing.

### 2. Run migrations 002 through 005

Repeat the same process, one file at a time, in this exact order:

```text
202607290002_setup_persistence.sql
202607290003_legacy_brand_defaults.sql
202607290004_stage2_operations.sql
202607290005_private_document_storage.sql
```

Do not paste multiple migrations into one query. Run each file separately so an error is easy to identify.

### 3. Verify the database

Open **Table Editor** and confirm these tables exist:

```text
companies
profiles
company_settings
notifications
audit_logs
customers
load_requests
quotes
loads
load_status_history
documents
```

Open **Storage** and confirm:

```text
Bucket: legacy-documents
Visibility: Private
```

Do not make the bucket public.

## Create Jared Guinn's owner account

Create the user only after migration 001 has been run, because migration 001 creates the trigger that automatically creates the matching profile.

1. Open **Authentication → Users**.
2. Select **Add user → Create new user**.
3. Enter Jared Guinn's email address.
4. Enter a temporary strong password.
5. Enable **Auto Confirm User** when he should be able to sign in immediately.
6. Add this user metadata:

```json
{
  "full_name": "Jared Guinn"
}
```

7. Create the user.
8. Open **SQL Editor → New query**.
9. Replace the example email with Jared's exact email and run:

```sql
update public.profiles as profile
set role = 'owner',
    full_name = 'Jared Guinn'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('jared@example.com');
```

10. Confirm one row was updated.
11. Jared can then sign in and complete the first-time company setup wizard.

All newly created users default to `driver`. Keep public self-registration disabled until a controlled invitation workflow is added.

## Supabase browser values

Open **Supabase → Project Settings → Data API** and copy the browser-safe publishable key.

Use:

```text
VITE_SUPABASE_URL=https://hxbetjesuxmujtpcwxxz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
VITE_ENABLE_DEMO_MODE=false
ENVIRONMENT=production
```

Never place the service-role key in a `VITE_` variable or frontend code.

## Add the values to Cloudflare Pages

1. Open **Cloudflare → Workers & Pages**.
2. Select `legacy-hotshot`.
3. Open **Settings → Environment variables**.
4. Add the four values listed above under **Production**.
5. Save them.
6. Open **Deployments**.
7. Retry the latest production deployment so Vite rebuilds with the new environment values.

Cloudflare build settings:

```text
Production branch: main
Framework preset: React
Build command: npm run build
Build output directory: dist
Root directory: blank
```

## Supabase authentication URL settings

Open **Authentication → URL Configuration** and use:

```text
Site URL: https://legacy-hotshot.pages.dev
Redirect URL: https://legacy-hotshot.pages.dev/**
```

## Local development

Use Node.js 22.12 or newer.

```bash
git clone https://github.com/Memphisslim74/legacy-hotshot.git
cd legacy-hotshot
npm install
cp .env.example .env.local
npm run dev
```

## Validation

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run build
```

More activation details are available in `docs/STAGE2_SETUP.md`.
