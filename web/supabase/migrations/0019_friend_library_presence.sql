-- Privacy-safe friend presence for title detail pages.
-- Keeps library rows owner-only and exposes only an exact-title match for
-- accepted friends whose profile is visible to friends.

create index if not exists library_data_lookup_idx
  on public.library using gin (data jsonb_path_ops);

create or replace function public.friends_with_library_item(p_media_key text)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  item_status text,
  library_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Authentication required'; end if;
  if p_media_key is null or char_length(trim(p_media_key)) not between 1 and 200 then
    raise exception 'Invalid media key';
  end if;

  return query
  select
    p.id,
    p.username,
    p.avatar_url,
    matched.item ->> 'status',
    l.updated_at
  from public.friendships f
  cross join lateral (
    select case when f.requester = viewer then f.addressee else f.requester end as friend_id
  ) friend
  join public.profiles p on p.id = friend.friend_id
  join public.library l on l.user_id = friend.friend_id
  join lateral (
    select entry as item
    from jsonb_array_elements(coalesce(l.data, '[]'::jsonb)) entry
    where entry ->> 'id' = trim(p_media_key)
    limit 1
  ) matched on true
  where f.status = 'accepted'
    and viewer in (f.requester, f.addressee)
    and p.privacy in ('public', 'friends')
    and l.data @> jsonb_build_array(jsonb_build_object('id', trim(p_media_key)))
  order by l.updated_at desc
  limit 24;
end;
$$;

revoke all on function public.friends_with_library_item(text) from public;
grant execute on function public.friends_with_library_item(text) to authenticated;

select 'PBox friend library presence ready' as status;
