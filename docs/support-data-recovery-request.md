# Follow-up for Supabase ticket SU-498632

Project: PandorasBox / grflphqeoktyudsehlse

Our project still cannot serve users. Please prioritize preservation and recovery
of existing data. We need either a temporary read-only export window or a recoverable
snapshot/logical dump of the existing database. Please confirm what recovery
artifacts exist for this Free project; we are not assuming backups are available.

Checks performed on 8 October 2026:
- Auth administrative user-list endpoint: HTTP 503.
- PostgREST profiles and library reads: HTTP 503, PGRST002.
- Storage bucket listing: HTTP 544, DatabaseTimeout.
- Session-pooler SQL connection timed out; direct PostgreSQL connection unavailable.
- Dashboard previously reported FATAL 57P03, recovery mode / hot standby disabled.
- Reported database size before the outage was 1,387.28 MB.

Requested recovery scope:
1. Preserve the current database volume and any available snapshot/WAL recovery
   artifacts before resets or destructive maintenance.
2. Restore enough read access for pg_dump, or provide a supported export including
   auth.users/auth.identities and password hashes, all public user tables and
   storage metadata. Original user UUIDs and relationships must be retained.
3. Explain how to recover uploaded Storage objects as well; database metadata alone
   does not include actual images and message attachments.
4. Identify the storage/startup failure and whether read access can be temporarily
   restored without upgrading. We have an independent encrypted export tool ready.

Please advise on preservation/export options before any operation that could erase
or reset accounts, libraries, reviews, collections, friendships or messages.

This text is prepared locally for the owner to send on the existing ticket. It
has not been submitted or sent by the assistant. No credentials are included.
