# Otopass

Next.js application for vehicle intake and dealer offer workflow. Public vehicle intake data can
run in a self-contained local mode, while panel authentication uses Supabase for production.

## Local quick start

```bash
npm install
npm run dev
```

No environment file is required for the public vehicle intake demo. Local records are persisted in
`.local-data/` and that folder is ignored by Git. Local user authentication is disabled by default;
existing local users and sessions are ignored, and new local data stores do not seed user accounts.
Admin and dealer panel access requires Supabase configuration.

The dealer's public intake form is available at `/form/test-galeri`.

## Production model

- User provisioning is admin-only (`/admin/users`)
- Public signup is disabled
- Role model is DB-based (`user_roles`)
- Dealer data access is tenant-scoped through RLS
- Application photos are private storage objects served via signed URLs

## Supabase production mode

Copy `.env.example` to `.env.local`, set `OTOPASS_DATA_MODE=supabase`, and provide all three
Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OTOPASS_ENABLE_LOCAL_AUTH=false
OPTIONAL_ENABLE_CAPTCHA=false
```

## Setup

1. Apply `supabase-schema.sql` to your Supabase project.
2. Create a private storage bucket named `applications`. The upload action also creates it when
   the configured service role has permission.
3. Run `npm run dev`.

## Quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Release flow

1. Deploy to staging first
2. Validate admin provisioning, dealer isolation, offer flow
3. Promote to production
