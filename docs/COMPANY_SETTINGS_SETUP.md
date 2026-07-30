# Company Settings Activation

Run this after migrations `001` through `005` have already completed.

## Migration 006

Open Supabase **SQL Editor**, create a new query, and run the complete contents of:

```text
supabase/migrations/202607290006_company_settings_and_profile_fix.sql
```

This migration:

- Adds editable company contact, location, carrier, billing, emergency, website, and internal dispatch fields.
- Allows `owner` and `dispatcher` administrative roles to update company settings.
- Prevents first-time company setup from renaming the signed-in person's profile.
- Restores `steve@arsenalmediaco.com` to `Steve Smith`.
- Sets `legacyhsoffice@gmail.com` to `Jared Guinn` with owner access.
- Connects Jared to the same Legacy Hotshot company as Steve when Steve's company workspace exists.
- Sets the company business owner/contact to Jared Guinn.

## Verify both accounts

Run:

```sql
select
  auth_user.email,
  profile.full_name,
  profile.role,
  profile.setup_complete,
  profile.company_id
from public.profiles as profile
join auth.users as auth_user on auth_user.id = profile.id
where lower(auth_user.email) in (
  lower('steve@arsenalmediaco.com'),
  lower('legacyhsoffice@gmail.com')
)
order by auth_user.email;
```

Expected result:

- Steve's name is `Steve Smith`.
- Jared's name is `Jared Guinn`.
- Both roles are `owner`.
- Both accounts have the same non-null `company_id`.
- Both accounts have `setup_complete = true`.

## Use the screen

After Cloudflare redeploys, open:

```text
https://legacy-hotshot.pages.dev/settings
```

The Company Settings screen includes:

- Legal and display company names
- Business owner / primary contact
- Company and after-hours phone numbers
- Physical and mailing addresses
- City, state, ZIP, and service area
- MC and USDOT numbers
- Website and Facebook URLs
- Billing email and invoice terms
- Communication and detention defaults
- Emergency contact information
- Email signature
- Brand colors
- Internal dispatch notes

Personal user profile names remain separate from all company information.
