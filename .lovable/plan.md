
# Plan

Five related workstreams. Each can ship independently; ordering below is recommended.

---

## 1. Hero CTA — "See how it works"

In `src/pages/Landing.tsx`:
- Add `id="features"` to the Features section wrapper.
- Re-add a secondary action next to **Start Free Assessment**: a `Button variant="ghost"` (inherits hero foreground, no contrast issue) labeled **See how it works** that calls `document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })`.
- Layout returns to `flex flex-col sm:flex-row gap-3 justify-center`.
- Label string goes through i18n (`landing.seeHowItWorks`).

No demo route, no mock dashboard.

---

## 2. i18n coverage expansion

### 2a. Add locales for African markets
Extend `src/i18n/index.ts` `supportedLngs` and resources with:
- `sw` (Swahili — KE)
- `ha` (Hausa — NG)
- `yo` (Yoruba — NG)
- `ig` (Igbo — NG)
- `zu` (Zulu — ZA)
- `af` (Afrikaans — ZA)
- `pt` (Portuguese — fallback for Lusophone Africa)

English remains the fallback. Update `localeToLang()` allow-list. Add matching JSON files under `src/i18n/locales/`. Each file mirrors the `en.json` key tree (machine-translatable strings for nav/auth/dashboard/admin/common — same surface we already translate). We are not promising professional translation; we are removing the silent-English gap for these regions.

### 2b. Audit & translate every UI string
Convert hardcoded English in:
- `src/pages/Landing.tsx` (hero, features array titles/descriptions, footer)
- `src/pages/Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `AuthCallback.tsx`
- `src/pages/Assessment.tsx` (step titles, helper text, validation toasts)
- `src/pages/Dashboard.tsx` + every `src/components/dashboard/*Tab.tsx` and panel (Home, Report, Ideas, Plan, Productivity, Metrics, Habits, Tasks, BudgetEstimator, EventSlideBoard, ScoreRing labels)
- `src/pages/ProfileEdit.tsx`, `SecuritySettings.tsx`, `AdminEvents.tsx`
- `CheckInboxCard`, `NavLink` tooltips

Add a new key namespace per page (e.g. `landing.*`, `assessment.*`, `dashboard.home.*`, `dashboard.report.*`, …) and an `empty.*` namespace so every "No X yet" empty state has a key. Replace literals with `t("...")`.

### 2c. Toasts
All `toast({ title, description })` calls across pages and hooks (`useDashboardData`, etc.) move to `t("toasts.<key>")`. Add a `toasts.*` namespace.

### 2d. AI coach + edge functions
- `supabase/functions/ai-coach/index.ts`: accept `locale` in the request body, inject `"Respond in {language}. Use {currency} for money."` into the system prompt. Same change for `generate-report`, `generate-deck`, `generate-lesson`, `generate-worksheet`, `budget-analysis`, `inflation-analysis`.
- Client callers pass `profile.language` (or i18n current lng) + `profile.currency`.
- PDF generators (`src/lib/report-pdf.ts`, `src/lib/worksheet-pdf.ts`): accept a `strings` map keyed by locale (or take a `t` function) so headings, section titles, and footer text render in the user's language. Numbers/dates already use `formatMoney` + locale.

### 2e. RTL plumbing (foundation only)
- Add `ar` and `he` to `supportedLngs` with placeholder JSONs (English values).
- In `src/main.tsx` or an `<I18nDirection>` wrapper, set `document.documentElement.dir = ["ar","he","fa","ur"].includes(i18n.language) ? "rtl" : "ltr"` and update on `languageChanged`.
- Audit Tailwind classes for hard-coded `ml-*` / `mr-*` / `left-*` / `right-*` in shared layout (nav, sidebar, dashboard shell) and replace with logical equivalents (`ms-*`, `me-*`, `start-*`, `end-*`) where Tailwind v3 supports them; for the rest, document follow-up.

We are not adding full ar/he translations now — just the plumbing so a future translator can drop strings in.

---

## 3. Geo detection — keep ipapi.co, add lightweight fallbacks

Update `src/lib/regions.ts` `detectCountryByIP()`:

1. Check `sessionStorage` cache (unchanged).
2. Try `https://ipapi.co/json/` (unchanged) with a 2.5 s `AbortController` timeout.
3. On 429 / network error / timeout, try `https://get.geojs.io/v1/ip/country.json` (free, no key).
4. On second failure, try `https://ipwho.is/` (free, no key).
5. Final fallback → existing `detectCountry()` from `navigator.language`.

No paid tier, no Cloudflare/Vercel headers (we are static-hosted). Cache the resolved country code in `sessionStorage` as today; also cache negative results for 10 minutes to avoid hammering on repeated failures.

---

## 4. Events: scheduling + targeting

### 4a. Schema migration (new migration file)
Add to `events_announcements`:
- `publish_at timestamptz` (nullable; defaults to `date` when null — backwards compatible)
- `target_countries text[]` (nullable = all countries)
- `target_roles app_role[]` (nullable = all roles)
- `target_languages text[]` (nullable = all)

Add helpful index on `(is_active, publish_at)`.

Update RLS read policy: a row is visible to a user when
```
is_active = true
AND (publish_at IS NULL OR publish_at <= now())
AND (target_countries IS NULL OR profile.country = ANY(target_countries))
AND (target_languages IS NULL OR profile.language = ANY(target_languages))
AND (target_roles IS NULL OR EXISTS user_roles match)
```
Implement via a SECURITY DEFINER function `event_is_visible(event_id, user_id)` to keep the policy clean, or inline. Admins always see all rows (existing policy).

GRANTs preserved.

### 4b. Admin UI (`src/pages/AdminEvents.tsx`)
Add to the create/edit dialog:
- `publish_at` datetime-local (default = now)
- Multi-select chips for **Countries** (from `COUNTRIES`)
- Multi-select chips for **Languages** (from supportedLngs)
- Multi-select chips for **Roles** (`admin`, `moderator`, `user`)
- Visual badge on each row: "Scheduled · Mar 12" if `publish_at > now`; "Targeted: NG, KE" when filters set.

### 4c. Client surface (`EventSlideBoard.tsx`)
No change required — RLS handles filtering. Add `order("publish_at", { ascending: false, nullsFirst: false })`.

---

## 5. Admin surface expansion

The role system currently powers only one page. Add two admin pages, gated by `useIsAdmin`:

### 5a. `/admin/users` — Users & Roles
- Table of profiles (paginated, search by name/email) — join `profiles` + `auth.users.email` via a `SECURITY DEFINER` RPC `admin_list_users(limit, offset, search)` returning email/full_name/country/created_at/roles[].
- Row actions: **Promote to admin / moderator**, **Demote**. Implemented via `admin_set_role(user_id, role, action)` RPC (security definer, checks `has_role(auth.uid(), 'admin')`).
- Disable/cannot-delete self-demote of the last admin.

### 5b. `/admin/analytics` — basic platform metrics
Read-only cards driven by simple aggregate queries (admin-only RPC `admin_metrics()`):
- Total users, new users (7d / 30d)
- Users by country (bar chart, recharts already in deps)
- Assessments completed, reports generated, ideas generated
- Active events count
Charts reuse existing recharts components.

### 5c. Sidebar
In `src/pages/Dashboard.tsx` (or wherever the admin link lives), replace the single "Admin · Events" entry with a collapsible **Admin** group containing **Users**, **Events**, **Analytics** — only rendered when `isAdmin`.

---

## Technical notes

- All new strings added in step 2 live in `en.json` first; other locale files initially copy English values for any missing key (so `t()` never returns the raw key). A small Node script `scripts/i18n-sync.mjs` (dev-only) can fill missing keys with English placeholders — optional.
- All edge-function changes are backwards compatible: `locale` and `currency` are optional with English / NGN defaults.
- Migrations are additive (nullable columns, new RPCs); no destructive change.
- No new third-party deps required. Geo fallbacks are public GET endpoints.
- RTL pass is foundation only; full audit of dashboard tabs ships as a follow-up.

---

## Out of scope (call out explicitly)

- Professional human translation for the new locales — placeholders only, English fallback intact.
- Paid geo-IP provider, Cloudflare/Vercel header reading (static host, not applicable).
- Per-event email notifications / push.
- Full RTL visual QA on every dashboard component.
