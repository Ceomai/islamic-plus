-- Islamic+ — fix logging visibility + activity & AI chat analytics
-- Run in Supabase SQL Editor AFTER 001_auth_profiles_logs.sql

-- ── Fix profiles: multiple 'pending' email_hash blocked 2nd user ──
alter table public.profiles drop constraint if exists profiles_email_hash_key;
create unique index if not exists profiles_email_hash_unique_idx
  on public.profiles (email_hash)
  where email_hash is not null and email_hash <> 'pending';

-- ── RPC: reliable auth event logging (bypasses RLS insert quirks) ──
create or replace function public.log_auth_event(
  p_event_type text,
  p_pseudonym text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in (
    'sign_up', 'sign_in', 'sign_out', 'sign_in_failed', 'guest_start'
  ) then
    raise exception 'invalid auth event type: %', p_event_type;
  end if;

  insert into public.auth_logs (user_id, event_type, pseudonym, metadata)
  values (
    auth.uid(),
    p_event_type,
    p_pseudonym,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.upsert_user_profile(
  p_email_hash text,
  p_pseudonym text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, email_hash, pseudonym)
  values (auth.uid(), p_email_hash, p_pseudonym)
  on conflict (id) do update
  set
    email_hash = excluded.email_hash,
    pseudonym = excluded.pseudonym,
    updated_at = now();
end;
$$;

-- ── Activity tracking (screen time + actions) ──
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (
    event_type in ('screen_enter', 'screen_leave', 'feature_action', 'app_open')
  ),
  feature_id text not null,
  screen_name text,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_id_idx on public.activity_logs (user_id);
create index if not exists activity_logs_feature_idx on public.activity_logs (feature_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

-- ── AI chat message log ──
create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chat_session_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_logs_user_id_idx on public.ai_chat_logs (user_id);
create index if not exists ai_chat_logs_session_idx on public.ai_chat_logs (chat_session_id);
create index if not exists ai_chat_logs_created_at_idx on public.ai_chat_logs (created_at desc);

alter table public.activity_logs enable row level security;
alter table public.ai_chat_logs enable row level security;

-- Authenticated users insert/read own rows
drop policy if exists "activity_logs_insert_own" on public.activity_logs;
create policy "activity_logs_insert_own"
  on public.activity_logs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "activity_logs_select_own" on public.activity_logs;
create policy "activity_logs_select_own"
  on public.activity_logs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_chat_logs_insert_own" on public.ai_chat_logs;
create policy "ai_chat_logs_insert_own"
  on public.ai_chat_logs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_chat_logs_select_own" on public.ai_chat_logs;
create policy "ai_chat_logs_select_own"
  on public.ai_chat_logs for select to authenticated
  using (auth.uid() = user_id);

-- RPC: activity events
create or replace function public.log_activity_event(
  p_event_type text,
  p_feature_id text,
  p_screen_name text default null,
  p_duration_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if p_event_type not in ('screen_enter', 'screen_leave', 'feature_action', 'app_open') then
    raise exception 'invalid activity event type: %', p_event_type;
  end if;

  insert into public.activity_logs (
    user_id, event_type, feature_id, screen_name, duration_ms, metadata
  ) values (
    auth.uid(),
    p_event_type,
    p_feature_id,
    p_screen_name,
    p_duration_ms,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

-- RPC: AI chat messages
create or replace function public.log_ai_chat_message(
  p_chat_session_id uuid,
  p_role text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if p_role not in ('user', 'assistant') then
    raise exception 'invalid chat role: %', p_role;
  end if;

  insert into public.ai_chat_logs (
    user_id, chat_session_id, role, message, metadata
  ) values (
    auth.uid(),
    p_chat_session_id,
    p_role,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.log_auth_event(text, text, jsonb) to anon, authenticated;
grant execute on function public.upsert_user_profile(text, text) to authenticated;
grant execute on function public.log_activity_event(text, text, text, integer, jsonb) to authenticated;
grant execute on function public.log_ai_chat_message(uuid, text, text, jsonb) to authenticated;

-- ── Developer views (visible in Table Editor → public schema) ──
create or replace view public.admin_auth_summary as
select
  event_type,
  count(*) as event_count,
  max(created_at) as last_seen
from public.auth_logs
group by event_type
order by event_count desc;

create or replace view public.admin_user_overview as
select
  p.id as user_id,
  p.pseudonym,
  p.email_hash,
  p.created_at as registered_at,
  (select count(*) from public.auth_logs al where al.user_id = p.id) as auth_events,
  (select count(*) from public.activity_logs ac where ac.user_id = p.id) as activity_events,
  (select count(*) from public.ai_chat_logs ai where ai.user_id = p.id) as ai_messages
from public.profiles p
order by p.created_at desc;

create or replace view public.admin_feature_time as
select
  user_id,
  feature_id,
  count(*) filter (where event_type = 'screen_enter') as visits,
  coalesce(sum(duration_ms) filter (where event_type = 'screen_leave'), 0) as total_ms,
  round(
    coalesce(sum(duration_ms) filter (where event_type = 'screen_leave'), 0) / 60000.0,
    1
  ) as total_minutes,
  max(created_at) as last_active
from public.activity_logs
group by user_id, feature_id
order by total_ms desc;

create or replace view public.admin_ai_conversations as
select
  user_id,
  chat_session_id,
  count(*) as message_count,
  min(created_at) as started_at,
  max(created_at) as last_message_at
from public.ai_chat_logs
group by user_id, chat_session_id
order by last_message_at desc;
