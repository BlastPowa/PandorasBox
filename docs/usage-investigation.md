# Usage incident: 7 October 2026

## Confirmed evidence

The dashboard screenshots show 12h 1m active CPU (4h allowance), 18.1 GB origin
transfer (10 GB), roughly 1.6m function invocations (1m), 1.1m CDN requests (1m),
and 364.1 GB-hours memory (360). Fast data transfer is 11.54 GB out of 100 GB;
that is not the Vercel limit causing this pause. Transfer and requests rose
sharply around 4–7 October. The live domain returned 402 DEPLOYMENT_DISABLED.

Supabase's email reports 1387.28 MB database size against 500 MB. Its project is
unhealthy and SQL rejects connections with 57P03. Table sizes and bloat cannot
currently be measured. Cache growth, auth logs, database indexes, repeated JSON
updates and dead rows are possible contributors, not established causes.

The repository previously prefetched catalogue/navigation links, ran the
authentication proxy on API calls and many assets, rendered pages dynamically,
and stored person/provider data plus optional search indexing in Supabase.
These amplify the cost of traffic; they do not establish who generated it.
The first three cost reductions and database-cache write reductions are now in
GitHub. They are not yet verified in live traffic because hosting remains paused.

## Historical evidence limits

The authenticated Vercel historical Observability query returned 402 requiring
Observability Plus. Firewall summary reported no events and attack-status no
anomalies in the requested incident range. This does NOT rule out scraping,
bots, distributed low-rate traffic, or missing retained evidence. Do not call
this an attack or normal user growth without traffic evidence.

Code review found debounced live search, realtime-driven messages/library and
daily cron jobs. No confirmed self-sustaining Vercel request loop was found in
those reviewed flows. Chat typing polls Supabase every 2.5 seconds; that adds
database reads but does not itself invoke a Vercel function.

## Protection installed

Vercel WAF configuration version 1 is active with a valid free fixed-window rule:
120 shared catalogue GET requests/minute/IP. It covers catalogue pages and public
catalogue APIs, while excluding account operations, messaging, cron, health checks
and static assets. Requests exceeding the limit receive edge rate limiting before
application compute. Config source: web/security/vercel-firewall.json.

Do not PUT that file over future user rules: it was applied only after confirming
that no active/draft rules existed. Future edits must preserve other rules. Disable
this specific rule in the dashboard if legitimate shared-IP traffic is affected.
It does not reset consumed quotas, prevent distributed abuse, or carry over to
Render/other hosts. Recreate protection at the new host's proxy/CDN before launch.

## How to identify the cause after recovery

1. Back up the recovered database. Run the updated read-only database-size SQL,
   including auth and other schemas, index sizes, estimated dead rows and write
   counters. Establish which tables actually account for the extra ~887 MB.
2. In Vercel Usage, select this project and the incident dates, not only all-team
   totals. If request breakdowns are available, export highest paths, user agents,
   IP/ASN distribution, prefetch share and cache hit/miss counts. Compare to actual
   user sign-ins and visits. Basic Hobby history may no longer contain the detail.
3. With the optimized app online, use browser Network tools for a normal home
   visit, search, library update and idle chat. Count requests; look for calls
   continuing without user actions. Never load-test production to its limits.
4. Observe firewall rate-limit events and ordinary traffic. A single-IP rule does
   not cap total requests from many independent IPs.
5. Review provider usage at 50%, 70% and 85% of the smallest allowance. At 70%,
   inspect growth and expensive routes; at 85%, reduce optional refresh work or
   move/resize capacity before the provider pauses all users. These are operating
   thresholds, not an automated notification system installed by this change.

## Reset behavior

Vercel Hobby has no ordinary monthly billing cycle; usage restrictions generally
require waiting for usage to age out over about 30 days. There is no manual reset
button. A still-paused team may need support after all exceeded metrics are back
within allowance. Do not promise a recovery date from screenshots alone.

Database storage is persistent and does not reset monthly. Supabase fair-use
restrictions can also use billing-period average size, so cleanup may not lift a
restriction immediately. Both problems must be resolved independently.

Sources:
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/logs/runtime
- https://supabase.com/docs/guides/platform/database-size
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
