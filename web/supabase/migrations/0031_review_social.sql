-- PBox review social layer: explicit spoiler labels and lightweight helpful votes.

alter table public.reviews
  add column if not exists is_spoiler boolean not null default false;

create table if not exists public.review_helpful (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_helpful_review_idx
  on public.review_helpful (review_id, created_at desc);

alter table public.review_helpful enable row level security;

drop policy if exists "review helpful readable by everyone" on public.review_helpful;
create policy "review helpful readable by everyone"
  on public.review_helpful for select using (true);

drop policy if exists "users add own helpful vote" on public.review_helpful;
create policy "users add own helpful vote"
  on public.review_helpful for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users remove own helpful vote" on public.review_helpful;
create policy "users remove own helpful vote"
  on public.review_helpful for delete to authenticated
  using (auth.uid() = user_id);

select 'review social layer ready' as status;
