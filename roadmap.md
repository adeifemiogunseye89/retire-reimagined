# Security hardening roadmap

- [x] Add deployable security headers and document managed-hosting limitation.
- [x] Verify private pension document bucket and owner-only object access.
- [x] Assess app-user TOTP support and document hosted auth limits; no supported app-user TOTP flow was available, so no unsupported controls were added.
- [x] Add admin-only audit records for admin mutations.
- [x] Add per-user daily/monthly AI caps and admin remaining-usage visibility.
- [x] Add dependency, CodeQL, and secret scanning configuration.
- [x] Update security/operations docs; tests, type checks, build, and quick scan pass; deep scan is running.
- [ ] Commit the finished security changes.
- [x] Replace the legacy monthly email callback with authenticated managed scheduling.
- [ ] Verify CSP and security headers on published responses; managed hosting does not document custom header support.
