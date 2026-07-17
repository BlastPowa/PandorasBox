-- Follow-up for installations that already applied 0016: correctly notify
-- revived friend requests and remove social history when a blocked row is
-- inserted after an old friendship row is deleted.

create or replace function public.notify_friendship_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending'
    and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    update public.notifications
    set actor_id = new.requester, read_at = null, dismissed_at = null, created_at = now()
    where user_id = new.addressee and type = 'friend_request' and friendship_id = new.id;
    if not found then
      insert into public.notifications (user_id, actor_id, type, friendship_id)
      values (new.addressee, new.requester, 'friend_request', new.id);
    end if;
  elsif new.status = 'accepted'
    and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    update public.notifications
    set actor_id = new.addressee, read_at = null, dismissed_at = null, created_at = now()
    where user_id = new.requester and type = 'friend_accepted' and friendship_id = new.id;
    if not found then
      insert into public.notifications (user_id, actor_id, type, friendship_id)
      values (new.requester, new.addressee, 'friend_accepted', new.id);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.cleanup_friendship_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if tg_op = 'DELETE' then
    a := old.requester;
    b := old.addressee;
  else
    a := new.requester;
    b := new.addressee;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.status = 'blocked' then
    delete from public.social_shares
    where (sender_id = a and recipient_id = b)
       or (sender_id = b and recipient_id = a);
    delete from public.notifications
    where (user_id = a and actor_id = b)
       or (user_id = b and actor_id = a);
  elsif tg_op = 'DELETE'
    or (tg_op = 'UPDATE' and old.status = 'accepted' and new.status <> 'accepted') then
    update public.social_shares
    set revoked_at = coalesce(revoked_at, now())
    where revoked_at is null
      and ((sender_id = a and recipient_id = b)
        or (sender_id = b and recipient_id = a));
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists friendship_share_cleanup on public.friendships;
create trigger friendship_share_cleanup
  after insert or update or delete on public.friendships
  for each row execute function public.cleanup_friendship_shares();

select 'PBox social sharing hardening ready' as status;
