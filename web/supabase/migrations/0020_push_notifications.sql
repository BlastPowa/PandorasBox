-- Opt-in Web Push subscriptions. Each browser/device owns its endpoint and
-- category preferences; service-role delivery never exposes endpoints to users.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  messages_enabled boolean not null default true,
  shares_enabled boolean not null default true,
  friends_enabled boolean not null default true,
  groups_enabled boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "users read own push subscriptions" on public.push_subscriptions;
create policy "users read own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "users create own push subscriptions" on public.push_subscriptions;
create policy "users create own push subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
drop policy if exists "users update own push subscriptions" on public.push_subscriptions;
create policy "users update own push subscriptions" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users delete own push subscriptions" on public.push_subscriptions;
create policy "users delete own push subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

select 'PBox push notifications ready' as status;
