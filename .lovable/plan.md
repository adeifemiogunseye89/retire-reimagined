## Auth hardening — fix the 3 production gaps

### 1. Smart post-login redirect (no forced /assessment bounce)

**Problem:** `redirect_uri: "/assessment"` sends every Google sign-in through assessment, even returning users with completed profiles.

**Fix:**
- Add a `<AuthRedirect />` landing component mounted at `/auth/callback` (and reused as a helper after email sign-in).
- It checks `profiles` for the current user:
  - No row OR `assessment_completed_at` is null → `/assessment`
  - Otherwise → `/dashboard`
- Update Google button: `redirect_uri: \`${window.location.origin}/auth/callback\``.
- Update email sign-in handler in `Auth.tsx` to call the same routing helper instead of hard-navigating to `/assessment`.
- Preserve an optional `?next=` query param (e.g. when `ProtectedRoute` kicks unauth users out) so they land back where they came from.

**DB:** add nullable `assessment_completed_at timestamptz` column on `profiles`; set it from the Assessment final-step submit.

### 2. Password reset / email verification UX

**Problem:** Only a toast confirms the reset email was sent; no clear "check your inbox" state, no resend, no signup-confirmation screen.

**Fix:**
- `ForgotPassword.tsx`: already toggles a `sent` state — upgrade it to a full inbox-confirmation card: mail icon, "We sent a link to **email**", "Didn't get it? Resend in 30s" countdown button, "Wrong email? Try another" link. Keep generic copy so we don't leak account existence.
- `Auth.tsx` signup branch: after successful `signUp`, switch to a `<CheckInboxCard>` (same component) explaining they must verify before signing in, with a resend-verification action (`supabase.auth.resend({ type: 'signup', email })`).
- `ResetPassword.tsx`: keep current logic but show a clearer "Link expired or invalid" empty state with a "Request a new link" button rather than auto-redirecting silently.
- Sign-in error handling: detect `Email not confirmed` and surface a "Resend verification" CTA inline.

### 3. Linked accounts view + provider-collision handling

**Problem:** A user who signs up with email then tries Google with the same address gets undefined behavior, and they have no UI to see/manage linked identities.

**Fix:**
- New page `/profile/security` (linked from ProfileEdit and the avatar menu):
  - Lists `user.identities` (email, google, …) with provider icon, email, "linked on" date.
  - "Link Google" button → `supabase.auth.linkIdentity({ provider: 'google' })` when not yet linked.
  - "Unlink" button (only enabled when ≥2 identities remain) → `supabase.auth.unlinkIdentity(identity)`.
  - "Change password" entry point (reuses reset flow for current email).
- Auth.tsx: catch the OAuth error returned when the email already exists under another provider and show a clear explanation: "This email is already registered. Sign in with your password, then link Google from Security settings."
- Document in copy that Supabase's default is to treat matching verified emails as the same user only when `Link accounts with same email` is enabled — we'll keep it ON (set via Cloud config) so the Google-after-email path Just Works, and rely on the Security page for visibility.

### Files touched

- New: `src/pages/AuthCallback.tsx`, `src/pages/SecuritySettings.tsx`, `src/components/auth/CheckInboxCard.tsx`
- Edit: `src/pages/Auth.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/Assessment.tsx` (write `assessment_completed_at`), `src/pages/ProfileEdit.tsx` (link to Security), `src/App.tsx` (routes)
- Migration: add `assessment_completed_at` to `profiles`

### Out of scope (call-outs)

- Branded auth emails (separate task — would use Lovable's auth email templates).
- 2FA / MFA enrollment.
- Admin-side "force re-verify" tooling.

Want me to also scaffold branded auth email templates as part of this, or keep that as a follow-up?
