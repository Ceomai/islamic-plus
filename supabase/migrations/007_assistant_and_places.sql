-- Islamic+ — server-side AI assistant quota and nearby-places cache
-- Run AFTER 006_account_deletion.sql
--
-- Both tables are written only by Edge Functions with the service role. RLS is enabled with no
-- policies, so the anon and authenticated roles can neither read nor write them through the API.

-- ─── Assistant: requests per user per day ───────────────────────────────────
create table if not exists public.assistant_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  requests integer not null default 0,
  primary key (user_id, day)
);

alter table public.assistant_usage enable row level security;

-- Counts one request and says whether the user is still within the daily limit.
-- Atomic, so parallel requests cannot slip past the limit.
create or replace function public.consume_assistant_quota(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.assistant_usage as u (user_id, day, requests)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1
  returning requests into v_count;
  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_assistant_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_assistant_quota(uuid, integer) to service_role;

-- ─── Nearby places: shared cache of OpenStreetMap answers ───────────────────
-- Keyed by place type, radius and a ~1 km grid cell; Google Places results are never stored here
-- (Google's terms only allow caching place IDs).
create table if not exists public.places_cache (
  cache_key text primary key,
  places jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.places_cache enable row level security;

create index if not exists places_cache_created_at_idx on public.places_cache (created_at);
