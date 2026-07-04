-- Pandora's Box — user-submitted support issues (FAQ "contact admin" form).
-- Rows are only ever written by the server (service-role client in /api/contact),
-- never directly by users, so there is no public insert policy — this table has
-- zero anon/authenticated write surface. Admins can read them as an email fallback.

create table if not exists public.user_issues (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  message text not null,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.user_issues enable row level security;

create policy "admins read issues"
  on public.user_issues for select using (public.is_admin());

create policy "admins update issues"
  on public.user_issues for update using (public.is_admin()) with check (public.is_admin());
