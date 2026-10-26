-- Islamic+ — security hardening
-- Run AFTER 004_user_app_data.sql
--
-- Fixes:
--   1. sync_user_detail_tables(p_user_id, ...) was SECURITY DEFINER and callable by
--      anon/authenticated → anyone could wipe/overwrite another user's data.
--   2. admin_* views bypassed RLS (owner rights) and were readable with the anon key.
--   3. auth_logs: every user could read all rows with user_id = null.
--   4. Logging RPCs accepted unbounded payloads (spam / storage abuse).

-- ── 1. Internal helper: not callable from the API, and only for the caller's own rows ──
revoke execute on function public.sync_user_detail_tables(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.sync_user_detail_tables(
  p_user_id uuid,
  p_scope text,
  p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_habit jsonb;
  v_date text;
  v_dua record;
begin
  -- Defense in depth: even if EXECUTE is granted again by mistake, a caller can only touch their own rows.
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'forbidden';
  end if;

  delete from prayer_completions where user_id = p_user_id and profile_scope = p_scope;
  insert into prayer_completions (user_id, profile_scope, prayer_name, completion_date, completed_at)
  select p_user_id, p_scope,
    (x->>'prayer')::text,
    (x->>'date')::date,
    coalesce((x->>'completedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'prayerCompletions', '[]'::jsonb)) as x
  on conflict do nothing;

  insert into tasbih_sessions (user_id, profile_scope, session_count, target_count, completed_at)
  select p_user_id, p_scope,
    (x->>'count')::int,
    coalesce((x->>'target')::int, 33),
    coalesce((x->>'completedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'tasbih'->'sessions', '[]'::jsonb)) as x
  on conflict do nothing;

  delete from habit_completion_logs where user_id = p_user_id and profile_scope = p_scope;
  for v_habit in select * from jsonb_array_elements(coalesce(p_payload->'habits', '[]'::jsonb))
  loop
    for v_date in select jsonb_array_elements_text(coalesce(v_habit->'completedDates', '[]'::jsonb))
    loop
      insert into habit_completion_logs (user_id, profile_scope, habit_id, habit_title, completion_date)
      values (p_user_id, p_scope, v_habit->>'id', v_habit->>'title', v_date::date)
      on conflict do nothing;
    end loop;
  end loop;

  delete from dua_read_logs where user_id = p_user_id and profile_scope = p_scope;
  for v_dua in
    select key as dua_id, value::int as read_count
    from jsonb_each_text(coalesce(p_payload->'duaProgress', '{}'::jsonb))
  loop
    insert into dua_read_logs (user_id, profile_scope, dua_id, read_count, last_read_at)
    values (p_user_id, p_scope, v_dua.dua_id, v_dua.read_count, now());
  end loop;

  delete from education_progress where user_id = p_user_id and profile_scope = p_scope;
  insert into education_progress (user_id, profile_scope, topic_id, read_count, last_opened_at)
  select p_user_id, p_scope,
    x->>'topicId',
    coalesce((x->>'readCount')::int, 1),
    coalesce((x->>'lastOpenedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'educationProgress', '[]'::jsonb)) as x
  on conflict do nothing;

  insert into user_preferences (
    user_id, profile_scope, theme_id, dark_mode, app_language,
    home_launcher, widget_prefs, notification_prefs, updated_at
  ) values (
    p_user_id, p_scope,
    p_payload->'settings'->>'themeId',
    coalesce((p_payload->'darkMode')::boolean, false),
    p_payload->'settings'->>'appLanguage',
    coalesce(p_payload->'settings'->'homeLauncher'->'order', '[]'::jsonb),
    coalesce(p_payload->'settings'->'widgetPrefs', '{}'::jsonb),
    jsonb_build_object(
      'globalNotificationsEnabled', p_payload->'settings'->'globalNotificationsEnabled',
      'prayerNotifications', p_payload->'settings'->'prayerNotifications',
      'disabledPrayerRules', p_payload->'settings'->'disabledPrayerRules',
      'customReminders', p_payload->'settings'->'customReminders'
    ),
    now()
  )
  on conflict (user_id, profile_scope) do update set
    theme_id = excluded.theme_id,
    dark_mode = excluded.dark_mode,
    app_language = excluded.app_language,
    home_launcher = excluded.home_launcher,
    widget_prefs = excluded.widget_prefs,
    notification_prefs = excluded.notification_prefs,
    updated_at = now();

  insert into zakat_calculations (user_id, profile_scope, calculated_at, input_data, result_data, is_obligatory)
  select p_user_id, p_scope,
    coalesce((x->>'calculatedAt')::timestamptz, now()),
    coalesce(x->'input', '{}'::jsonb),
    coalesce(x->'result', '{}'::jsonb),
    coalesce((x->>'isObligatory')::boolean, false)
  from jsonb_array_elements(coalesce(p_payload->'zakatHistory', '[]'::jsonb)) as x
  on conflict do nothing;

  if p_payload->'locationPref' is not null and p_payload->'locationPref' != 'null'::jsonb then
    insert into location_prefs (user_id, profile_scope, city, country, latitude, longitude, updated_at)
    values (
      p_user_id, p_scope,
      p_payload->'locationPref'->>'city',
      p_payload->'locationPref'->>'country',
      (p_payload->'locationPref'->>'latitude')::double precision,
      (p_payload->'locationPref'->>'longitude')::double precision,
      coalesce((p_payload->'locationPref'->>'updatedAt')::timestamptz, now())
    )
    on conflict (user_id, profile_scope) do update set
      city = excluded.city,
      country = excluded.country,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      updated_at = excluded.updated_at;
  end if;

  delete from family_members where user_id = p_user_id and profile_scope = p_scope;
  insert into family_members (user_id, profile_scope, member_id, name, avatar_emoji, member_role, habit_ids)
  select p_user_id, p_scope,
    x->>'id', x->>'name', coalesce(x->>'avatarEmoji', '👤'), coalesce(x->>'role', 'other'),
    coalesce(x->'habitIds', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'family', '[]'::jsonb)) as x
  on conflict do nothing;
end;
$$;

revoke execute on function public.sync_user_detail_tables(uuid, text, jsonb) from public, anon, authenticated;

-- Public entry point: payload size + scope length limits
create or replace function public.sync_user_app_data(
  p_profile_scope text,
  p_payload jsonb
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := coalesce(nullif(trim(p_profile_scope), ''), 'default');
  v_updated timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if length(v_scope) > 64 then
    raise exception 'invalid profile scope';
  end if;
  if pg_column_size(p_payload) > 512 * 1024 then
    raise exception 'payload too large';
  end if;

  insert into user_app_sync (user_id, profile_scope, payload, updated_at)
  values (auth.uid(), v_scope, coalesce(p_payload, '{}'::jsonb), v_updated)
  on conflict (user_id, profile_scope) do update
  set payload = excluded.payload, updated_at = v_updated;

  perform sync_user_detail_tables(auth.uid(), v_scope, p_payload);
  return v_updated;
end;
$$;

revoke execute on function public.sync_user_app_data(text, jsonb) from public, anon;
grant execute on function public.sync_user_app_data(text, jsonb) to authenticated;

-- Remaining RPCs: authenticated only (anon keeps log_auth_event for failed sign-in / guest events)
revoke execute on function public.upsert_user_profile(text, text) from public, anon;
revoke execute on function public.log_activity_event(text, text, text, integer, jsonb) from public, anon;
revoke execute on function public.log_ai_chat_message(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.upsert_reading_progress(text, jsonb, jsonb) from public, anon;
revoke execute on function public.get_reading_progress(text) from public, anon;
revoke execute on function public.get_user_app_data(text) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── 2. Admin views: developer-only (Dashboard / service role) ──
alter view public.admin_auth_summary set (security_invoker = true);
alter view public.admin_user_overview set (security_invoker = true);
alter view public.admin_feature_time set (security_invoker = true);
alter view public.admin_ai_conversations set (security_invoker = true);
alter view public.admin_reading_overview set (security_invoker = true);
alter view public.admin_app_data_overview set (security_invoker = true);

revoke all on public.admin_auth_summary from public, anon, authenticated;
revoke all on public.admin_user_overview from public, anon, authenticated;
revoke all on public.admin_feature_time from public, anon, authenticated;
revoke all on public.admin_ai_conversations from public, anon, authenticated;
revoke all on public.admin_reading_overview from public, anon, authenticated;
revoke all on public.admin_app_data_overview from public, anon, authenticated;

-- ── 3. auth_logs: users see only their own rows; client inserts must carry their own id ──
drop policy if exists "auth_logs_select_own" on public.auth_logs;
create policy "auth_logs_select_own"
  on public.auth_logs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "auth_logs_insert_own" on public.auth_logs;
create policy "auth_logs_insert_own"
  on public.auth_logs for insert to authenticated
  with check (auth.uid() = user_id);

-- ── 4. Logging RPCs: bounded input ──
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
  if length(coalesce(p_pseudonym, '')) > 120 or pg_column_size(p_metadata) > 2048 then
    raise exception 'payload too large';
  end if;

  insert into public.auth_logs (user_id, event_type, pseudonym, metadata)
  values (auth.uid(), p_event_type, p_pseudonym, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_auth_event(text, text, jsonb) from public;
grant execute on function public.log_auth_event(text, text, jsonb) to anon, authenticated;

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
  if length(p_feature_id) > 64 or length(coalesce(p_screen_name, '')) > 64
     or pg_column_size(p_metadata) > 2048 then
    raise exception 'payload too large';
  end if;

  insert into public.activity_logs (
    user_id, event_type, feature_id, screen_name, duration_ms, metadata
  ) values (
    auth.uid(), p_event_type, p_feature_id, p_screen_name, p_duration_ms,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

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
  if length(p_message) > 4000 or pg_column_size(p_metadata) > 2048 then
    raise exception 'payload too large';
  end if;

  insert into public.ai_chat_logs (user_id, chat_session_id, role, message, metadata)
  values (auth.uid(), p_chat_session_id, p_role, p_message, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- create or replace keeps existing grants; re-assert them explicitly
revoke execute on function public.log_activity_event(text, text, text, integer, jsonb) from public, anon;
revoke execute on function public.log_ai_chat_message(uuid, text, text, jsonb) from public, anon;
grant execute on function public.log_activity_event(text, text, text, integer, jsonb) to authenticated;
grant execute on function public.log_ai_chat_message(uuid, text, text, jsonb) to authenticated;
