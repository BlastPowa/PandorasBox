-- Pandora's Box — user-submitted support issues (FAQ "contact admin" form).
-- Rows are only ever written by the server (service-role client in /api/contact),
-- never directly by users, so there is no public insert policy — this table has
-- zero anon/authenticated write surface. Admins can read them as an email fallback.

-- Defensive (re)create in case an earlier migration run didn't persist this —
-- safe to run even if it already exists correctly.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table if not exists public.user_issues (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  message text not null,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.user_issues enable row level security;

drop policy if exists "admins read issues" on public.user_issues;
create policy "admins read issues"
  on public.user_issues for select using (public.is_admin());

drop policy if exists "admins update issues" on public.user_issues;
create policy "admins update issues"
  on public.user_issues for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete issues" on public.user_issues;
create policy "admins delete issues"
  on public.user_issues for delete using (public.is_admin());
