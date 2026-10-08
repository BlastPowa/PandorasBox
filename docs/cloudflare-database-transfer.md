# Cloudflare database transfer preparation

Status: staging export/import tools prepared; production still uses Supabase.
A free D1 staging database was created on 8 October 2026 in the existing account:
`pandorasbox-migration-staging`, ID `23defc2f-47ae-4449-98b8-28acb9659d89`,
with a Western Europe location hint. It has no app/Worker binding or imported data.
No paid plan, user-data upload or live switch was performed.
The selected preparation targets D1 on the free plan; paid resources and upgrades
are not authorized. Hyperdrive is an alternative when a separate
PostgreSQL provider is chosen; it is a connector/cache, not database hosting.

## Existing app dependencies

The repository audit found 61 app/lib/component files with Supabase dependencies.
These include:

| Current dependency | Cloudflare replacement work |
| --- | --- |
| Auth email/password, Google, cookies, auth.users UUIDs | Verified auth service; preserve identities/hash formats, reset tokens, cookie/session protection and OAuth callbacks. D1 alone has no Supabase Auth replacement. |
| public tables, PostgreSQL JSONB, RPC functions | D1 tables/queries and server-side API handlers; convert PostgreSQL-specific SQL. |
| RLS policies and security-definer RPCs | Explicit ownership, admin, friendship/block and conversation-membership checks on every read/write. D1 has no PostgreSQL RLS. |
| Library adapter and realtime updates | Server API adapter and authenticated update notification transport. Never trust client-supplied user IDs. |
| Messages, notifications, group membership and typing | Authenticated Workers/Durable Objects or bounded polling; preserve ordered events and authorization. |
| Avatars, banners, backgrounds, message attachments | Private R2 buckets with authenticated uploads/downloads, content checks and signed access for private media. Rewrite old Storage URL references only after uploads verify. |
| Integration secrets, webhooks, cron, push | Private secret configuration and one scheduler; deduplicate sync writes. |

Critical files: web/lib/supabase/{client,server,admin}.ts, web/proxy.ts,
web/lib/library/{adapter,use-library}.tsx/ts, web/components/messages/messages-view.tsx,
web/app/api/messages, web/app/auth, web/supabase/migrations.

## Capture and stage existing data

After recovery, before cleanup:

    python web/scripts/recovery-backup.py --portable-d1

This retains the full encrypted PostgreSQL/Storage backup and additionally captures
all public/auth/storage table rows as JSON in a read-only repeatable-read snapshot.
Rows preserve original UUIDs, password hashes, timestamps, JSON and numeric text.
The pg_dump and portable snapshot have different snapshot times; stop source
writes for the final cutover snapshot. An initial recovery capture can be live.

    python web/scripts/prepare-d1-import.py PATH_TO_FILE.pboxbackup

The converter verifies encryption/checksums, then creates private staging SQL
outside Git under `%USERPROFILE%/PandorasBoxMigration`. It validates every table's
row count and refuses missing auth.users, oversized statements and free-tier
headroom violations. It does not print row contents or make network requests.
Outputs are plaintext sensitive data: keep on an encrypted trusted drive, never
upload to Netlify or commit. Use a new output directory for each capture.

The staging schema contains source_tables and source_records with original JSON
rows and per-record checksums. It is a migration archive, not the final application
schema. Auth hashes/identities are preserved for a compatible auth migration;
their presence does not by itself make old passwords or Google sign-in work.
Source managed-schema details also remain in the full PostgreSQL dump.

## Cloudflare staging import (after selecting capacity/account)

The separate D1 database pandorasbox-migration-staging is created. Keep it unbound
to public Workers. cloudflare/wrangler.toml pins the existing account and database.
After authenticating official Wrangler to that same account:

    npx wrangler d1 execute pandorasbox-migration-staging --config=cloudflare/wrangler.toml --remote --file=PATH_TO_STAGING_SQL
    npx wrangler d1 execute pandorasbox-migration-staging --config=cloudflare/wrangler.toml --remote --command="SELECT table_name,count(*) FROM source_records GROUP BY table_name"

Compare counts with validation.json. A Wrangler import may have partially loaded
data on failure: use a fresh empty staging database for each attempt, never merge
unverified retries with a production database. No automatic import command is run
by this repository. Check maximum row size and native D1 database size after import.

D1 Free has 500 MB per database, despite 5 GB total account storage; the existing
1.39 GB reported PostgreSQL size is not assumed to fit. Staging JSON and indexes
can have different sizes. Paid D1 has a 10 GB per-database limit. Do not shard users
blindly merely to bypass quotas: cross-user messaging requires a designed model.
Large library blobs should become per-item records in the final schema.

## Required gates before changing the site

1. Independent verified backup, staging counts/checksums and recovered source kept.
   Stop the free migration if the native D1 database plus required application
   indexes cannot fit below 450 MB; do not silently activate billing or split data.
2. Select the auth replacement and verify password-hash compatibility; preserve
   user IDs and provider subject IDs. Never link accounts from unverified email.
3. Implement core profile/library/watchlist adapter, then reviews/collections,
   messaging, notifications, integrations and media access with explicit policies.
4. Test two-user isolation, blocked users, private collections/messages/media,
   admin-only operations, login/logout/reset, OAuth and extension sync.
5. Restore files to R2 and reconcile checksums/URLs. Preserve private visibility.
6. Configure budgets, retention, encrypted off-provider exports and restore drill.
7. Final write pause/export/reconciliation; switch one backend at a time. Rollback
   must account for new writes, not simply point DNS at an old snapshot.

Netlify may continue hosting the Next frontend while private server-to-server APIs
run in Workers. Avoid exposing admin tokens or arbitrary SQL endpoints to browsers.
Retain the Supabase backend until all replacement gates pass. Existing unavailable
source data cannot be reconstructed by creating a new empty Cloudflare database.

Sources:
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/best-practices/import-export-data/
- https://developers.cloudflare.com/hyperdrive/
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
