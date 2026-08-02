# Supabase deployment notes

## Edge Function

This repository includes the `create-staff-user` Edge Function in `supabase/functions/create-staff-user/index.ts`.

### Required secrets

Set these secrets only in the Supabase Edge Function environment:

- `SUPABASE_SERVICE_ROLE_KEY` — required for `auth.admin.createUser()` and cleanup on partial failure.
- `SUPABASE_URL` — available by default in Supabase Edge Functions, but also required when serving locally.

> Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend `.env` files or any `VITE_*` variable.

## SQL migration

Apply the migration in `supabase/migrations/20260802170000_secure_staff_provisioning.sql` to enforce case-insensitive duplicate-email protection and align branch-manager profile policies.

## Exact deployment commands

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY --project-ref YOUR_PROJECT_REF
supabase functions deploy create-staff-user --project-ref YOUR_PROJECT_REF
```

## Local function testing

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions serve create-staff-user --env-file ./supabase/.env.local
```
