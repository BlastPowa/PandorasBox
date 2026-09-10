alter table public.integrations
  drop constraint if exists integrations_provider_check;

alter table public.integrations
  add constraint integrations_provider_check
  check (provider in ('mal', 'anilist', 'trakt'));

alter table public.sync_queue
  drop constraint if exists sync_queue_provider_check;

alter table public.sync_queue
  add constraint sync_queue_provider_check
  check (provider in ('mal', 'anilist', 'trakt'));
