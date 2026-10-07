# Free hosting recovery

Vercel has paused this team after exceeding CPU, origin transfer, invocations,
CDN requests and memory allowances. Code optimizations do not clear consumed usage.
Supabase independently exceeds its 500 MB database allowance. Moving the web
server does not restore database writes or sign-ups while that restriction remains.

## Database first

The current project reports `57P03: the database system is not accepting
connections; Hot standby mode is disabled`, with Database/Auth/PostgREST/Storage
unhealthy. Until it accepts connections, no size audit, backup or safe cleanup can
run. Try one restart through Supabase Project Settings -> General, then wait a
few minutes. If it remains unhealthy, request Supabase support recovery for
project `grflphqeoktyudsehlse` and include the error and database quota screenshot.
Do not reset/delete the project or repeatedly pause/resume it to bypass quotas.
The dashboard currently reports no backups; preserve the original project.

Run `web/supabase/diagnostics/database-size.sql` in Supabase SQL Editor and inspect
the largest tables. Back up before any maintenance. `person_cache` is rebuildable
provider data; this app no longer reads or writes it. Optional
`memory_search_index` writes now default off. Do not delete users, library entries,
collections, reviews, messages, integration tokens or pending sync tasks.
Do not assume these caches explain the excess until their sizes are measured.
Postgres may need vacuuming to reclaim space; `VACUUM FULL` locks the target table
and needs working space. Supabase fair-use restrictions can persist after cleanup
because billing-period average size is used. Check the dashboard restriction and
contact Supabase support if necessary. No production cleanup is automated here.

## Render fallback

Import this repository as a Render Blueprint using root `render.yaml`.
The service is explicitly `plan: free`. Supply the requested environment values
privately in Render; never paste service-role keys into chat or source control.
Add other provider/integration/email/push variables from the existing deployment
if those features are required. All NEXT_PUBLIC variables must be present BEFORE
the build; changing them requires a rebuild. In particular copy the VAPID public
key together with its matching private key to keep existing push subscriptions.

The monorepo build creates `.next/standalone/web/server.js`. The preparation
script copies static assets and public downloads to the runnable app. Render's
PORT is honored; HOSTNAME binds to 0.0.0.0.

Test the onrender.com URL first: catalogue, signup/login, Google OAuth, a library
update, messages, extension pairing and static downloads. Add its exact
`https://SERVICE.onrender.com/auth/callback` to Supabase's allowed redirects for
the temporary test. Keep the canonical Site URL at https://www.pandorasbox.live.
Once both hosting and Supabase writes work, add www.pandorasbox.live as a Render
custom domain and use the exact DNS values Render shows. Change the apex redirect
as well so it no longer points to paused Vercel. Verify HTTPS and Google login
again before retiring the old host. No DNS changes are made by this repository.

Render free web services sleep after 15 minutes idle and share 750 instance hours
per workspace/month. New Hobby workspaces include only 5 GB outbound bandwidth
and 500 build minutes. The existing Vercel screenshot already shows 11.54 GB fast
data transfer, so Render free is a temporary fallback, not a sustainable capacity
upgrade at that traffic level. With no payment method, over-limit services may be
suspended; with a payment method, overage charges can apply. Keep paid overages
disabled if zero spend is required. Disk is ephemeral; Next caches can disappear
on restart.
Vercel cron definitions do not run on Render. Availability/integration scheduled
refreshes require a separately configured authenticated scheduler; do not expose
the cron secret or run aggressive keep-alive polling. Render free Postgres expires
after 30 days and must not replace the production database.

## Usage controls included

- Catalogue API success responses have short browser and shared CDN caches;
  private API responses and errors are not given shared caching.
- UI links no longer speculatively render linked pages through automatic prefetch.
- API routes and assets bypass page authentication proxy; private routes continue
  enforcing their own auth, and pages retain nonce-based CSP.
- Auth/profile lookups are deduplicated within each React server render only.
- Best-effort per-instance rate-limit storage is bounded. For Vercel abuse control,
  use an edge WAF rule before function execution; in-function 429s still invoke it.

## Other free hosting options

An Oracle Always Free Ubuntu ARM server can run the prepared standalone app with
Node 22, an HTTPS reverse proxy and a service manager. The current documented
allowance is 2 OCPUs and 12 GB RAM total for ARM, with 200 GB total boot/block
volume storage. Capacity depends on the home region; idle instances can be
reclaimed. Provision only resources within the Always Free labels/allowances;
trial credits are not a permanent free plan. This requires patching, monitoring,
backups and server administration. It is a candidate, not a deployed service.

Cloudflare Workers Free has 10 ms CPU per request and 100,000 requests/day. The
existing dynamic Next/Supabase application is not a safe drop-in migration to
that plan. A static/client-heavy redesign may fit better, but requires separate
backend/auth architecture and testing. A raw new Postgres database also cannot
replace Supabase Auth, Storage, Realtime and row-level security by changing one URL.

After hosting is restored, measure actual requests and CPU for normal use before
deciding whether a free plan is sustainable. A new deploy cannot unpause exhausted
provider quotas, and splitting accounts to evade quotas is not a recovery strategy.

Sources: https://render.com/docs/free,
https://render.com/docs/outbound-bandwidth,
https://supabase.com/docs/guides/platform/database-size,
https://supabase.com/docs/guides/troubleshooting/project-status-reports-unhealthy-services,
https://vercel.com/docs/errors/deployment_disabled,
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm,
https://developers.cloudflare.com/workers/platform/limits/.
