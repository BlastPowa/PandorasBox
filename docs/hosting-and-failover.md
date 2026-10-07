# Hosting and failover setup

## Current status

The optimized Next app is deployed on Netlify as `pandorasbox-live`, with public
production access and verified HTTPS for www.pandorasbox.live (apex redirects).
Cloudflare and automatic failover are not configured. The Supabase database is a separate recovery
dependency; hosting migration alone cannot restore sign-ups or library writes.

The repository includes a Netlify catalogue guard edge function: 120 requests per
60 seconds per IP/domain on selected catalogue APIs. It passes requests through
without database calls or changing cached/private responses. Provider deployment
logs must confirm the rule was accepted; it does not protect direct Supabase
calls, cap total traffic or transfer the Vercel rule to Netlify. Auth, messages,
cron, health and static files are excluded. See data-recovery-runbook.md for
encrypted exports and pending backup prerequisites.

On 7 October 2026 deployment 6ac6a17a5569990008c233e7 published commit e6d3020.
Its post-processing log confirms one accepted programmatic rule, window 120/60,
IP/domain aggregation and HTTP 429 action. Login/health/search returned 200;
unauthenticated messages returned 401. No production load test was performed.

## Netlify import

1. Sign into Netlify. Import existing repository `BlastPowa/PandorasBox`, branch
   `main`. The root config selects base `web`, build `npm run build`, publish
   `.next`, Node 22. Use the automatically managed current Next adapter.
2. Enter existing environment values privately in the dashboard before building.
   The required list is NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY and TMDB_API_KEY. Copy all configured optional
   integration, IGDB, ComicVine, email, Gemini and push variables as well if those
   features are needed. Never put server keys under NEXT_PUBLIC names.
3. Keep NEXT_PUBLIC_SITE_URL at https://www.pandorasbox.live. For initial testing,
   add the exact new `https://SITE.netlify.app/auth/callback` URL (and the callback
   next-query wildcard used by the existing setup) in Supabase redirect allowlists.
   Existing OAuth uses the current browser origin, so previews need an allowlist.
4. Netlify environment variables must cover Builds AND Functions where applicable.
   NEXT_PUBLIC values are compiled into browser assets, so rebuild after changes.
5. Test the temporary URL first: /api/health, artwork/static downloads, home/search,
   signup/login, Google callback, a library write, private messages, game previews,
   calendar and extension pairing. Database recovery is required for account tests.
6. Enable the site's public access if Netlify creates it private. Add the custom
   domain only once these checks pass; use the exact DNS records shown by Netlify,
   verify HTTPS, and update the apex redirect so it does not route via paused Vercel.
7. Vercel cron definitions are not executed by Netlify. Configure one authenticated
   scheduler separately for availability/integration refreshes. Only one host may
   run the scheduled jobs; a standby must not duplicate integration writes.

Netlify Free includes 300 credits/month. Current published rates are 20 credits/GB
bandwidth, 2 credits/10,000 requests, 10 credits/GB-hour compute and 15 credits per
production deployment. Using 1,123,428 requests and 11.54 GB bandwidth from the
screenshots is approximately 455 credits BEFORE compute/deployments. This is only
a comparison, not a forecast: hosts meter compute differently, and code changes
should reduce traffic. Do not enable paid auto-recharge without explicit approval.
Avoid automatic production deployments on every small commit for a standby.

## Automatic failover design

Use a health-aware reverse proxy/load balancer in front of two tested origins,
with the public URL always https://www.pandorasbox.live. Cloudflare Load Balancing
is one managed option; it is a paid add-on and has not been purchased or configured.
Cloudflare Workers Free has 100,000 dynamic requests/day; the incident peak was
above that, so a Worker proxy cannot be assumed to solve this within the free tier.

The load balancer should:

- Probe /api/health for hosting health, with a small timeout; switch after several
  failed probes, not one transient response, and fail back only after sustained
  recovery. Check the actual plan's supported intervals and thresholds.
- Treat 402 provider suspension as an unhealthy origin, alongside timeouts/5xx.
- Preserve public host, forwarded protocol, request bodies, cookies and response
  cookies. Configure origin Host header/SNI/certificates as required by each host;
  do not guess that the same hostname can simply be attached at both providers.
- Send new traffic to the standby when the primary fails. Do not automatically
  replay POST/PATCH/DELETE or Next server actions after a network failure; the first
  attempt may already have created a user, message, payment or library change.
- Deploy matching application versions and the same supported
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY to both servers where adapters honor it.
  Keep the previous deployment's assets available during changes; different builds
  can otherwise break existing tabs and server actions. Test adapter behavior.
- Monitor Supabase separately. A shared database failure affects both origins;
  switching hosts must not be presented as restoring accounts when it does not.
- Carry over edge rate limiting and catalogue cache rules. The Vercel WAF rule is
  provider-specific and does not protect Netlify/Render automatically.

DNS switching alone is slower and less predictable because resolvers cache DNS.
Two A/CNAME values provide no reliable health detection. A prepared manual switch
is a useful initial recovery path, but is not automatic failover.

## Launch order

Recover Supabase -> back up and measure/reduce database usage -> deploy optimized
primary to a temporary URL -> verify user flows -> move public domain -> measure
ordinary traffic -> deploy/test standby -> configure approved health-based routing.
Use provider alerts and review headroom at 50/70/85%. Back up the database off-host
and test restore procedures before claiming database resilience. Do not create
separate unsynchronized user databases at each host.

Sources:
- https://www.netlify.com/pricing/
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/build/configure-builds/monorepos/
- https://developers.cloudflare.com/load-balancing/
- https://developers.cloudflare.com/workers/platform/limits/
