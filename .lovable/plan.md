# Reignite security hardening

## Goal
Apply the uploaded Layer-1 security checklist to Reignite with minimal, verifiable changes, preserving existing ownership policies and user flows.

## Work
1. Add a deployable static-host header policy and document the managed-hosting limitation; verify its CSP against the app's required sources.
2. Verify and tighten private pension-document storage ownership rules without weakening existing access controls.
3. Add optional TOTP enrollment and sign-in challenge for users who enable it; preserve current sign-in screens and document hosted auth settings that cannot be changed in code.
4. Add admin-only audit records for user creation, role changes, and announcement changes.
5. Add per-user daily/monthly AI usage ceilings alongside existing fail-open burst throttles, and expose remaining usage to admins.
6. Add dependency update, CodeQL, and secret scanning configuration; update secret-ignore rules.
7. Update SECURITY.md and OPERATIONS.md, run relevant checks/security scans, and report hosting/auth limitations and residual risks.

## Technical details
- Use the Lovable Database migration tool for additive schema and secure database functions.
- Keep service-role credentials in Edge Functions only; hard caps fail closed if quota enforcement is unavailable, while the existing short-window throttling remains fail-open.
- Use an external static-host `_headers` file only as a deployable policy template; Lovable-managed hosting does not document custom response-header configuration, so production header delivery must be confirmed at the hosting layer.
- Do not change public user data ownership or add raw IP addresses to audit records.
