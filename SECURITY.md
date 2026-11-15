# Security notes — Retire Reimagined

## Key handling (read before touching any client code)

The browser bundle must only ever contain the **publishable (anon) key**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Both are read in `src/integrations/supabase/client.ts`, which is **auto-generated** —
do not edit it (changes are overwritten). These two values are designed to ship
publicly; Row Level Security is what protects the data.

**Never** place `SUPABASE_SERVICE_ROLE_KEY` (or any secret) in `src/`, in an
`import.meta.env.VITE_*` variable, or in any file that reaches the browser. The
service-role key bypasses RLS entirely, so a single leak exposes every user's
data. It belongs only in edge functions, read via `Deno.env.get(...)`.

Current service-role usage is server-side only, through `Deno.env`: report
generation, account provisioning, scheduled retention email, habit seeding,
administrator audit writes, and the shared rate/quota guard.

## Row Level Security

Every table in `public` has RLS enabled, and every policy is scoped
`TO authenticated` with ownership enforced via `auth.uid() = user_id` (or via
the parent row for `goal_milestones`). Telemetry tables (`client_errors`,
`page_events`) accept inserts from the row owner and restrict reads to admins
through `public.has_role(auth.uid(), 'admin')`.

`public.rate_limits` intentionally has **no policies** and no client grants:
RLS denies all client roles, and only the service-role guard can touch it.

## Rate limiting

Expensive edge functions call `checkRateLimit()` for burst control. This
short-window guard remains fail-open for availability. Immediately before an AI
gateway call, all six paid AI functions also atomically consume a hard quota
through a service-role-only database function. Quota-store failures fail closed
with HTTP 503; reached caps return HTTP 429. UTC daily/monthly ceilings are
defined in `supabase/functions/_shared/ai-usage-limits.ts` and the quota
migration. Current defaults per user are: Coach 100/day and 2,000/month; report
10/day and 60/month; pension document parsing 10/day and 50/month; budget and
inflation analysis 30/day and 300/month each; idea viability 40/day and
300/month. These are adjustable product defaults, not provider billing caps.
Admins can review current usage in Observability.

Authentication endpoints (sign-in, sign-up, password reset) are protected by the
platform's built-in per-IP auth rate limits plus the auth email/hour cap.

## Storage and uploaded pension documents

The `pension-documents` bucket is private with a 10 MB per-file limit. Existing
`storage.objects` policies permit authenticated upload, read, and delete only
when the first folder segment equals the signed-in user's ID. The `user_documents`
metadata table has owner-only read, insert, and delete policies. The document
parser repeats the owner-folder check before downloading. Storage objects must
be backed up separately from database rows; see `OPERATIONS.md`.

## Reports and administrator audit

Users can read only their own official reports. Direct client report creation
and changes are revoked; only trusted server functions can write official
scores. Administrator audit rows are readable only by admins, and role changes,
announcement edits, invitations, and account creation are recorded. Admin
activity reads require a database-side administrator check.

The retention-email dispatcher requires the managed cron bearer credential.
Its monthly job runs at 07:00 UTC on the 3rd and is managed through Lovable's
authenticated HTTP scheduler; direct unauthenticated requests return 401.

## Authentication

Email confirmation remains required; anonymous sign-in is disabled. Passwords
are checked against known breached-password lists and password changes require
the current password. The existing app form requires at least 8 characters.
Hosted sessions use managed refresh tokens; custom session expiry/inactivity
settings are not available in Lovable Cloud. App-user TOTP MFA is not currently
documented as a supported Cloud Auth capability, so no misleading setup control
was added.

## Response headers

`public/_headers` provides a CSP and baseline browser protections for static
hosts that honor the `_headers` convention, such as Cloudflare Pages or Netlify.
Lovable-managed hosting does not document support for project-supplied response
headers; verify production responses or configure equivalent rules at an
external hosting layer. Vite development settings are not a production security
boundary. CSP allows the current Google Fonts, Lovable Cloud, AI gateway, and
country-detection origins. Inline styles remain allowed because the UI uses
runtime style attributes.

## Automated scanning and threat model

Dependabot, CodeQL, and verified-secret scanning are configured in `.github/`.
Their execution depends on repository workflow permissions and GitHub's
availability of CodeQL scanning for the repository.

Primary assets and controls:
- **Financial profiles and official scores:** owner-scoped RLS, server-only
  score generation, and client write revocation for reports.
- **Pension documents:** private bucket, owner-folder policies, parser ownership
  checks, and a 10 MB upload ceiling.
- **AI spend:** per-user daily/monthly hard caps plus burst throttling.
- **Administrator privileges:** server-checked role gates and protected audit
  history.
- **Application secrets:** backend-only secrets; only publishable values may be
  included in browser code.
