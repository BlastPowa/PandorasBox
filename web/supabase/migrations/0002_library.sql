-- Pandora's Box — per-user library blob (stores ReelItem[] as JSON).
-- Reuses core/storage/ListManager unchanged via a Supabase StorageAdapter.
-- One row per user; RLS isolates each user's library; Realtime broadcasts changes.

create table if not exists public.library (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.library enable row level security;

create policy "users read own library"
  on public.library for select using (auth.uid() = user_id);
create policy "users upsert own library"
  on public.library for insert with check (auth.uid() = user_id);
create policy "users update own library"
  on public.library for update using (auth.uid() = user_id);
create policy "users delete own library"
  on public.library for delete using (auth.uid() = user_id);

-- allow Realtime to stream row changes for this table
alter publication supabase_realtime add table public.library;
