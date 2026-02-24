# Otopass

Next.js + Supabase application for vehicle intake and dealer offer workflow.

## Production model

- User provisioning is admin-only (`/admin/users`)
- Public signup is disabled
- Role model is DB-based (`user_roles`)
- Dealer data access is tenant-scoped through RLS
- Application photos are private storage objects served via signed URLs

## Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPTIONAL_ENABLE_CAPTCHA=false
```

## Setup

1. Install dependencies
   `npm install`
2. Apply `supabase-schema.sql` to your Supabase project.
3. Create a private storage bucket named `applications`.
4. Run app:
   `npm run dev`

## Quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Release flow

1. Deploy to staging first
2. Validate admin provisioning, dealer isolation, offer flow
3. Promote to production
