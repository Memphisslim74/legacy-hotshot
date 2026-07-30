# Stage 2 Activation Guide

Stage 2 adds live customers, load requests, quotes, loads, status history, and private documents.

## 1. Run the Stage 2 operations migration

1. Sign in to Supabase.
2. Open the Legacy Hotshot project.
3. Select **SQL Editor**.
4. Select **New query**.
5. Open `supabase/migrations/202607290004_stage2_operations.sql` from GitHub.
6. Copy the entire file into the Supabase SQL Editor.
7. Select **Run**.
8. Confirm the query completes without errors.
9. Open **Table Editor** and confirm these new tables exist:
   - `customers`
   - `load_requests`
   - `quotes`
   - `loads`
   - `load_status_history`
   - `documents`

## 2. Create private document storage

1. Return to **SQL Editor**.
2. Select **New query**.
3. Open `supabase/migrations/202607290005_private_document_storage.sql` from GitHub.
4. Copy the entire file into the SQL Editor.
5. Select **Run**.
6. Open **Storage**.
7. Confirm the bucket `legacy-documents` exists.
8. Confirm the bucket is marked **Private**.

Do not make the bucket public. The application creates temporary signed links when an authorized user opens a document.

## 3. Add the Supabase values to Cloudflare

1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Select the `legacy-hotshot` Pages project.
4. Open **Settings**.
5. Open **Environment variables**.
6. Add these production variables:

```text
VITE_SUPABASE_URL=https://hxbetjesuxmujtpcwxxz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<copy the Supabase publishable key>
VITE_ENABLE_DEMO_MODE=false
ENVIRONMENT=production
```

7. Save the variables.
8. Open **Deployments**.
9. Select the latest production deployment.
10. Choose **Retry deployment** so Vite rebuilds the application with the new values.

Never place the Supabase service-role key in a `VITE_` variable.

## 4. Confirm Jared Guinn's owner profile

1. Open Supabase.
2. Select **Authentication** and then **Users**.
3. Open Jared Guinn's user.
4. Copy the user UUID.
5. Open **Table Editor** and select `profiles`.
6. Find the row with the same UUID.
7. Confirm:
   - `full_name` is `Jared Guinn`
   - `role` is `owner`
   - `setup_complete` is checked
   - `company_id` contains the Legacy Hotshot company UUID

## 5. Test the internal workflow

Sign in at:

```text
https://legacy-hotshot.pages.dev/login
```

Test these screens:

1. **Customers** — create a test customer.
2. **New Load** — create a load request.
3. **Loads** — confirm it appears under Load Requests.
4. **Quotes** — create a quote tied to that request.
5. **New Load** — create a booked load.
6. **Loads** — change the status and open the load workspace.
7. **Documents** — upload a PDF or image and confirm it can be opened.

## 6. Test the public request form

Open an incognito browser window and visit:

```text
https://legacy-hotshot.pages.dev/request-load
```

Submit a complete test request. Then sign back into the Command Center and confirm the request appears under **Loads → Load Requests**.

Submitting the public form does not automatically book or price a shipment.

## 7. Production cleanup

After testing:

1. Remove test customers, requests, quotes, loads, and documents.
2. Confirm `VITE_ENABLE_DEMO_MODE` is `false` in Cloudflare production.
3. Confirm only authorized users can sign in.
4. Keep the `legacy-documents` bucket private.
