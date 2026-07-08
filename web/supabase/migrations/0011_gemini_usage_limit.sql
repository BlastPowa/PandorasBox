-- Pandora's Box — global daily usage counter for the Gemini-powered Memory
-- Search feature. The free Gemini tier is capped at ~20 requests/day and
-- 10/minute PER PROJECT (not per-user), so per-IP rate limiting alone doesn't
-- protect the shared quota — a handful of people searching (or one abuser)
-- could exhaust the entire day's budget for everyone. This table + function
-- give an atomic, race-safe global counter so the API can stop calling Gemini
-- once the daily budget is spent and fall back to the free keyword index
-- instead of erroring. Idempotent.

create table if not exists public.api_usage_counters (
  usage_key text not null,
  day date not null,
  count int not null default 0,
  primary key (usage_key, day)
);

alter table public.api_usage_counters enable row level security;
-- No public policies — only the service-role key (used server-side only) may
-- read/write this table.

-- Atomically increments today's count for a key and returns the new total.
-- The caller compares this against its own limit; once over, every call that
-- day keeps returning a value > limit (no separate "am I blocked" state to
-- get out of sync), and a fresh row starts the count at 1 again tomorrow.
create or replace function public.increment_usage_counter(p_key text)
returns int language plpgsql as $$
declare
  new_count int;
begin
  insert into public.api_usage_counters (usage_key, day, count)
  values (p_key, current_date, 1)
  on conflict (usage_key, day) do update set count = public.api_usage_counters.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

select 'gemini usage limiter ready' as status;
