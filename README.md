# Otoköprü

**Otoköprü** is a production-grade automotive workflow platform for managing vehicle applications, dealer operations, offers, and sales processes from a single web application.

The project was designed and built end-to-end with a strong focus on **security, multi-tenant data isolation, operational reliability, testability, and production readiness**.

**Live production:** https://www.otokopru.com

---

## Overview

Otoköprü provides separate workflows for applicants, dealers, and administrators.

The platform supports:

- public vehicle application flows
- dealer-specific application management
- offer and sales workflows
- administrative user management
- secure application status tracking
- production monitoring and operational tooling
- database migrations and Row Level Security
- automated and manual quality gates before release

The application runs on **Next.js 16** with **Supabase/PostgreSQL** as the production data and authentication layer, **Vercel** for hosting, **Cloudflare Turnstile** for bot protection, and **Sentry** for error monitoring.

---

## Tech Stack

### Application

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Zod

### Backend & Data

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security (RLS)
- SQL migrations
- Supabase Storage

### Security & Reliability

- Cloudflare Turnstile
- rate limiting
- SHA-256 tracking-secret hashing
- server-side authorization
- environment-based secret management
- Sentry monitoring

### Testing & Quality

- Vitest
- Playwright
- Supabase database tests
- RLS policy tests
- axe accessibility checks
- ESLint
- TypeScript type checking
- npm security audit

### Infrastructure

- Vercel
- GitHub
- Supabase CLI
- production runbooks and recovery procedures

---

## Product Architecture

The application is organized around three main user groups.

### Applicants

Applicants can submit vehicle information through a public dealer-specific form.

After a successful submission, the system generates a private tracking credential that allows the applicant to later check the status of the application.

The raw tracking secret is shown only once. The application stores only its **SHA-256 hash**, reducing the impact of accidental database exposure.

### Dealers

Dealer users can manage applications associated with their own organization, review incoming submissions, work with offers, and progress applications through the business workflow.

Tenant isolation is enforced at the database layer with **PostgreSQL Row Level Security**, rather than relying exclusively on UI-level filtering.

### Administrators

Administrative users have dedicated management functionality for platform-level operations such as account and user management.

Authentication and authorization are backed by Supabase Auth and database policies.

---

## Secure Application Tracking

Public application tracking was designed to avoid exposing a predictable identifier as the only access mechanism.

A tracking request requires:

1. an application reference
2. a private tracking secret

Only the SHA-256 hash of that secret is persisted.

Additional protections include:

- rate limiting by IP and application reference
- optional Cloudflare Turnstile verification
- immediate invalidation when a tracking secret is regenerated
- server-side verification before returning application information

The tracking feature is intentionally disabled in local demo mode.

---

## Multi-Tenant Data Isolation

Dealer data isolation is enforced using **Supabase/PostgreSQL Row Level Security**.

The database schema and policies are version-controlled through:

```
supabase/migrations/
```

Database tests validate important authorization boundaries and help prevent one dealer from accessing another dealer's data.

For development and testing, RLS tests can be executed against a local Supabase environment running through Docker.

---

## Local Development

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

By default, development can use a local data mode that does not require production credentials.

A public demo flow is available at:

```
/form/test-galeri
```

Local demo data is stored inside the Git-ignored:

```
.local-data/
```

Authentication-backed dealer and admin sessions require Supabase.

---

## Environment Configuration

The repository includes a safe template:

```
.env.example
```

No production credentials are stored in the repository.

Important configuration groups include:

- Supabase URL and keys
- application data mode
- Vercel project access
- Cloudflare Turnstile
- rate-limit secrets
- scheduled maintenance secrets
- Sentry monitoring
- one-time administrator bootstrap credentials

Production secrets are configured in the deployment environment rather than committed to Git.

---

## Database Migrations

Supabase migrations are the source of truth for the production database schema.

Typical setup:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
```

Existing migration files are treated as immutable once applied. Database changes are introduced through forward migrations.

---

## Administrator Bootstrap

The initial administrator can be created using:

```bash
npm run bootstrap:admin
```

Bootstrap credentials are intended for one-time use and should be removed from the environment immediately afterward.

Subsequent user management is handled through the application.

---

## Quality Gates

The project includes multiple quality checks covering static analysis, unit behavior, database security, browser flows, accessibility, dependencies, and production builds.

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:e2e
npm audit --omit=dev --audit-level=high
npm run build
```

### Unit Testing

Vitest is used for application-level tests.

### Database & RLS Testing

Supabase database tests validate schema behavior and critical Row Level Security rules.

These tests require a local Supabase environment.

### End-to-End Testing

Playwright covers critical browser workflows across desktop and mobile Chromium configurations.

The E2E suite also includes accessibility checks using axe.

---

## Observability

Production errors are monitored through **Sentry** across supported client, server, and edge environments.

Operational investigation can combine:

- Sentry events
- Vercel logs
- request/correlation identifiers
- application activity records

This makes production failures easier to trace across application and infrastructure layers.

---

## Bot Protection & Rate Limiting

Public-facing workflows are protected with:

- Cloudflare Turnstile
- per-IP rate limiting
- per-reference rate limiting
- server-side validation

The goal is to reduce automated abuse without placing unnecessary friction on legitimate users.

---

## Deployment

Production runs on **Vercel**.

The repository contains CI/deployment workflow definitions capable of:

1. installing dependencies
2. applying Supabase migrations
3. building the production application
4. deploying a prebuilt Vercel artifact

The project can also operate in a zero-budget deployment mode where GitHub Actions are disabled and pushes to the production branch are deployed through Vercel's native Git integration.

The exact operational process, rollback procedures, required secret names, backup strategy, and incident-response steps are documented in:

[`docs/production-runbook.md`](docs/production-runbook.md)

---

## Backup & Recovery

The production design includes database backup and recovery procedures.

The runbook documents:

- daily backup expectations
- Point-in-Time Recovery where supported by the active Supabase plan
- isolated restore testing
- database row-count verification
- storage verification
- RLS testing against restored data
- rollback procedures

Recovery drills are designed to validate that backups can actually be restored rather than assuming that backup availability alone is sufficient.

---

## Scheduled Maintenance

A protected maintenance endpoint is designed for scheduled housekeeping tasks such as:

- removing expired rate-limit records
- cleaning abandoned upload sessions
- archiving old applications
- removing expired application photos
- anonymizing personal data after the configured retention period

Scheduled operations require a dedicated secret and are not exposed as unrestricted public actions.

---

## Security Principles

Several security decisions are intentionally built into the architecture:

- secrets are provided through environment variables
- public signup is disabled for privileged user types
- authorization is enforced server-side and at the database layer
- dealer isolation uses RLS
- tracking secrets are stored as hashes
- public endpoints are rate-limited
- bot-sensitive flows can require Turnstile
- database changes are migration-driven
- production failures are observable through Sentry
- recovery and secret-rotation procedures are documented

See [`SECURITY.md`](SECURITY.md) for additional project security information.

---

## Repository Structure

A simplified view of the repository:

```text
src/
  app/                  Next.js routes, pages and server actions
  ...                   application modules

supabase/
  migrations/           version-controlled database schema changes
  tests/                database and RLS tests

tests/                  application and end-to-end tests

scripts/                operational and bootstrap scripts

docs/
  production-runbook.md production, recovery and incident procedures

public/                 static assets
```

---

## Production Operations

The production runbook covers:

- release validation
- deployment
- database migrations
- backup and recovery
- rollback
- incident response
- secret rotation
- data lifecycle procedures

This project treats production operation as part of software engineering rather than an afterthought.

---

## Why I Built This

Otoköprü was built as a real product, not as a tutorial or portfolio-only demo.

The goal was to take a business workflow from idea to production and own the full lifecycle:

- product flow design
- frontend implementation
- database architecture
- authentication and authorization
- security controls
- testing
- deployment
- observability
- production operations

It represents the type of work I enjoy most: turning a real operational problem into software that can be deployed, monitored, maintained, and improved over time.

---

## Author

Built and maintained by **Emir**.

GitHub: https://github.com/emirpadisah
