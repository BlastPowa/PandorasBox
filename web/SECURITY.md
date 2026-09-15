# Pandora's Box — Security

A summary of the protections in place and the (free) dashboard steps to finish hardening.

## What the app enforces (in code)

- **Per-user data isolation (data theft prevention).** Every Supabase table uses
  **Row Level Security**. Users can only read/write their own `library`, `collections`,
  `collection_items`, and `profiles` rows (`auth.uid() = user_id`). `watch_links`,
  `site_directory` and `announcements` are public-read but **admin-only write**
  (`public.is_admin()`); `availability` is public-read, admin/cron write. Even with the
  public anon key, no user can reach another user's list.
- **Service-role key is server-only.** `SUPABASE_SERVICE_ROLE_KEY` is used exclusively in
  `lib/supabase/admin.ts` + `lib/availability-refresh.ts` (both `server-only`), never shipped
  to the browser. Public keys are the anon key (safe by design) + TMDB/OMDb keys used
  server-side in route handlers.
- **Auth.** Handled by Supabase (bcrypt-hashed passwords, secure session cookies via
  `@supabase/ssr`). The app never stores or sees raw passwords. Protected routes
  (`/library`, `/collections`, `/stats`, `/settings`, `/admin`) are gated in `proxy.ts`;
  `/admin` additionally checks `role = 'admin'`.
- **Rate limiting (anti-abuse / anti-scraping).** All public API routes
  (`/api/search`, `/api/random`, `/api/trailer`, `/api/episodes`) and `/api/admin/refresh`
  use a per-IP sliding-window limiter (`lib/rate-limit.ts`) returning `429` when exceeded.
- **Input hardening.** Query/id params are length-capped and type-validated before use;
  numeric params are parsed and checked. No user input is interpolated into SQL (Supabase
  client parameterizes everything).
- **Cron protection.** `/api/cron/refresh-availability` requires the `CRON_SECRET` bearer
  token that Vercel Cron sends automatically.
- **HTTP security headers** (`proxy.ts` + `next.config.ts`): a per-request nonce-based
  Content-Security-Policy restricts scripts, connect, img and frame sources while still allowing
  Next.js bootstrap scripts to hydrate safely. `frame-ancestors 'none'` blocks clickjacking;
  `object-src 'none'` and `base-uri 'self'` close legacy injection paths. Static headers include
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Strict-Transport-Security` (HSTS preload), `Permissions-Policy`
  (camera/mic/geo disabled), `poweredByHeader: false`.
- **XSS.** React escapes rendered values and AniList HTML descriptions are stripped to plain
  text before display. The pre-hydration appearance bootstrap is a static same-origin file at
  `/theme-init.js`; framework inline scripts must carry the request-specific CSP nonce.
- **Secrets.** `.env*` is git-ignored; nothing sensitive is committed.
- **Patched framework baseline.** The web app is pinned to Next.js `16.3.5`, replacing the
  vulnerable `16.2.10` build and clearing the current npm dependency audit.

## Browser extension hardening

- Production builds do not ship JavaScript source maps.
- The manifest requests only the extension permissions currently used, while network access is
  limited to Reel's metadata APIs and configured Supabase cloud projects.
- Runtime messages must come from the extension itself and use a known message type before the
  service worker dispatches them.
- Sync settings are length/type validated, Supabase endpoints must use HTTPS on `supabase.co`,
  and every installation gets a separate random sync identity instead of sharing a default row.
- Remote sync payloads are validated as Reel list data before they can replace local state.
- Netflix history import reads the user's exported CSV locally. The extension never asks for or
  stores Netflix credentials.

## Finish in the Supabase dashboard (free, ~2 min)

1. **Authentication → Providers → Email:** enable **"Leaked password protection"** (checks
   passwords against HaveIBeenPwned) and set a **minimum password length** (e.g. 8+).
2. **Authentication → Rate limits:** keep the default sign-in/sign-up limits on (they're on by default).
3. **Authentication → URL configuration:** set Site URL + add only your real domains to the
   redirect allow-list (prevents open-redirect abuse).
4. Confirm all three migrations ran (`0001`, `0002`, `0003`) so RLS is active on every table.

## Optional next-level hardening

- Swap the in-memory limiter for **Upstash Redis** (free tier) for a distributed limit that
  survives serverless cold starts.
- Turn on Vercel **Attack Challenge / WAF** (available on the project's Firewall settings).
