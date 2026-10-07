# Pandora's Box recovery and independent backups

## Current blocker

Supabase project `grflphqeoktyudsehlse` rejects connections with 57P03; Auth
returns 503. Ticket SU-498632 is open. No complete user-data backup has yet been
captured or restore-tested. A new host cannot reconstruct inaccessible data.

## Prepare privately now

1. Install PostgreSQL client tools (pg_dump, pg_dumpall, pg_restore, psql), at
   least the source server's major version. PostgreSQL 18 can dump older servers.
   Put their bin directory on PATH or set PBOX_PG_BIN in the ignored file below.
   Official Windows downloads: https://www.postgresql.org/download/windows/
2. In Supabase Connect -> Direct / connection string -> Session pooler, copy
   the actual session connection URI (5432, not transaction pooler 6543).
   Replace the password placeholder with the existing password, URL-encoded.
   Do not reset the password simply to configure this backup.
3. Save `PBOX_DATABASE_URL=...` in `web/.env.backup.local`. This file is ignored.
   The local `.env.local` already supplies the Storage API URL/service key.
   Never paste passwords or exports into chat, commits, public folders or builds.
4. Python requires cryptography: `python -m pip install cryptography`.
   Use a backup passphrase saved in a password manager, independent of the
   Supabase password. The script prompts without echoing it; it is not in argv.

## First action as soon as support restores connections

Before deleting data, changing schemas or switching databases:

    python web/scripts/recovery-backup.py

Default output is outside Git: `%USERPROFILE%/PandorasBoxBackups/`.
The script reads a full consistent PostgreSQL dump, including auth.users,
identities, password hashes, public profile/library/review/message tables,
sequences, schema and Storage metadata. It also exports database role definitions
without database-role passwords, and downloads actual Storage objects separately.
SQL database backups alone do not contain uploaded images/attachments.

It creates a streamed AES-256-GCM encrypted archive using a scrypt-derived key,
then decrypts it in a temporary directory and verifies every file's SHA-256.
A failing database/Storage operation aborts instead of producing a backup marked
complete. Temporary plaintext exists on this computer during the export: run on
a trusted encrypted drive. Cleanup does not guarantee forensic secure erasure.
The passphrase is required to recover the archive; do not lose it.

Database and Storage are not a single atomic snapshot. For migration cutover,
temporarily stop new app writes/uploads, finish a final export and reconcile
object manifests before switching. Initial read-only capture should happen first.

Copy the encrypted archive to two independent locations: one external drive and
one private cloud account outside Supabase/Netlify. No external upload destination
or automatic scheduler is configured by this change. Do not store plaintext there.

    python web/scripts/recovery-backup.py --verify PATH_TO_FILE.pboxbackup

Verification checks decryption and checksums, not whether the app can run after a
restore. Keep at least 7 daily and 4 weekly successful copies once scheduled.
Never overwrite/delete the last known good backup because a new run failed.

## Restore rehearsal before migration

Use an isolated PostgreSQL/Supabase test target with enough capacity. Never test
a restore over the production project. Retain the original encrypted archive.
The full custom pg_dump can be inspected with pg_restore --list and is portable
PostgreSQL evidence. Full raw managed auth/storage schemas must NOT be blindly
restored over the managed schemas of a new Supabase project: follow Supabase's
CLI migration procedure, matching managed schema versions and custom policies.

Recover public schema/data and auth users/identities preserving original UUIDs
and password hashes; verify profile and membership relationships, library rows,
messages, collections, review counts, RLS and grants. Recreate Storage buckets,
upload each file using storage-objects.json mappings, and verify file hashes.
Reconfigure OAuth credentials/redirects, SMTP, webhooks, extensions, Realtime
publications, cron and environment variables. Record these settings privately
before leaving Supabase; they are not all captured in pg_dump.

Vault/column-encrypted data may need source encryption root keys via Supabase's
documented procedure. Existing access sessions may expire across projects; test
email/password and Google sign-in with a dedicated test account. Test permission
isolation: another user must not read private messages or libraries.

A different provider such as Neon supplies PostgreSQL, not a drop-in replacement
for Supabase Auth, PostgREST, Storage and Realtime. Preserve the export first;
then select migration scope and implement/test replacements before DNS cutover.

## Find the storage cause and monitor it

After the first backup, run web/supabase/diagnostics/database-size.sql. Record
results off-provider daily with UTC timestamps; compare table/index growth and
write counters (which can reset) instead of storing unbounded monitoring rows
inside the constrained database. No table deletion is authorized by this runbook.
Plan growth alerts at 50/70/85% of capacity, and investigate before 85%.
Netlify usage and database storage need independent checks. Rate limits cannot
cap legitimate aggregate traffic from many independent IPs.

Sources:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/platform/backups
- https://www.postgresql.org/docs/current/app-pgdump.html
