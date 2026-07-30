# Legacy Hotshot Supabase Activation Guide

This guide assumes the Legacy Hotshot Supabase project is fresh and that **no migrations have been run yet**.

## 1. Run all five migrations

Open **Supabase → SQL Editor → New query**.

Run each file separately, in this exact order:

1. `supabase/migrations/202607290001_stage1_foundation.sql`
2. `supabase/migrations/202607290002_setup_persistence.sql`
3. `supabase/migrations/202607290003_legacy_brand_defaults.sql`
4. `supabase/migrations/202607290004_stage2_operations.sql`
5. `supabase/migrations/202607290005_private_document_storage.sql`

For each file:

1. Open the file in GitHub.
2. Copy the entire SQL file.
3. Paste it into a new Supabase SQL Editor query.
4. Select **Run**.
5. Confirm it succeeds before moving to the next file.

Do not start at migration 004. Migrations 004 and 005 depend on the tables, functions, role types, and policies created by migrations 001 through 003.

## 2. Verify the database

Open **Table Editor** and confirm these tables exist:

- `companies`
- `profiles`
- `company_settings`
- `notifications`
- `audit_logs`
- `customers`
- `load_requests`
- `quotes`
- `loads`
- `load_status_history`
- `documents`

Open **Storage** and confirm:

- Bucket name: `legacy-documents`
- Visibility: **Private**

Do not make the bucket public. Authorized users receive temporary signed links when opening documents.

## 3. Create Jared Guinn's owner account

Create Jared only after the migrations have been run.

1. Open **Authentication → Users**.
2. Select **Add user → Create new user**.
3. Enter Jared Guinn's email address and a temporary strong password.
4. Enable **Auto Confirm User** when he should be able to sign in immediately.
5. Add this metadata:

```json
{
  "full_name": "Jared Guinn"
}
```

6. Create the user.
7. Open **SQL Editor → New query**.
8. Replace the example email with Jared's exact email and run:

```sql
update public.profiles as profile
set role = 'owner',
    full_name = 'Jared Guinn'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('jared@example.com');
```

9. Confirm one row was updated.

Jared can then sign in and complete the first-time setup wizard. That wizard creates the Legacy Hotshot company record and connects Jared's profile to it.

## 4. Configure Supabase authentication URLs

Open **Authentication → URL Configuration**.

Use:

```text
Site URL: https://legacy-hotshot.pages.dev
Redirect URL: https://legacy-hotshot.pages.dev/**
```

Save the settings.

## 5. Add Supabase values to Cloudflare

Open **Cloudflare → Workers & Pages → legacy-hotshot → Settings → Environment variables**.

Add these under Production:

```text
VITE_SUPABASE_URL=https://hxbetjesuxmujtpcwxxz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<copy the Supabase publishable key>
VITE_ENABLE_DEMO_MODE=false
ENVIRONMENT=production
```

Never place the Supabase service-role key in a `VITE_` variable.

Save the values, open **Deployments**, and retry the latest production deployment.

## 6. Test the internal workflow

Sign in at:

```text
https://legacy-hotshot.pages.dev/login
```

Test:

1. Complete Jared's first-time company setup.
2. Create a customer.
3. Create a load request.
4. Confirm it appears under **Loads → Load Requests**.
5. Create a quote.
6. Create a booked load.
7. Change the load status.
8. Upload a PDF or image under **Documents**.
9. Confirm the private document opens through a signed link.

## 7. Test the public request form

Open an incognito browser window and visit:

```text
https://legacy-hotshot.pages.dev/request-load
```

Submit a test request, then sign into the Command Center and confirm it appears under **Loads → Load Requests**.

The public form does not automatically book or price a shipment.

## 8. Production cleanup

After testing:

1. Remove test customers, requests, quotes, loads, and documents.
2. Confirm `VITE_ENABLE_DEMO_MODE=false` in Cloudflare production.
3. Keep public self-registration disabled.
4. Keep the `legacy-documents` bucket private.
