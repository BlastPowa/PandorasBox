-- PBox collection curation: private saves, public aggregate reactions.

create table if not exists public.collection_reactions (
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('like', 'save')),
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id, reaction)
);

create index if not exists collection_reactions_collection_idx
  on public.collection_reactions (collection_id, reaction, created_at desc);
create index if not exists collection_reactions_user_idx
  on public.collection_reactions (user_id, reaction, created_at desc);

alter table public.collection_reactions enable row level security;

drop policy if exists "users read own collection reactions" on public.collection_reactions;
create policy "users read own collection reactions"
  on public.collection_reactions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users react to public collections" on public.collection_reactions;
create policy "users react to public collections"
  on public.collection_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.collections c
      where c.id = collection_id
        and c.visibility = 'public'
        and c.user_id <> auth.uid()
    )
  );

drop policy if exists "users remove own collection reactions" on public.collection_reactions;
create policy "users remove own collection reactions"
  on public.collection_reactions for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.collection_reaction_counts(p_collection_ids uuid[])
returns table (
  collection_id uuid,
  like_count bigint,
  save_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    count(r.*) filter (where r.reaction = 'like') as like_count,
    count(r.*) filter (where r.reaction = 'save') as save_count
  from unnest(coalesce(p_collection_ids, array[]::uuid[])) requested(id)
  join public.collections c on c.id = requested.id and c.visibility = 'public'
  left join public.collection_reactions r on r.collection_id = c.id
  group by c.id;
$$;

revoke all on function public.collection_reaction_counts(uuid[]) from public;
grant execute on function public.collection_reaction_counts(uuid[]) to anon, authenticated;

select 'collection reactions ready' as status;
