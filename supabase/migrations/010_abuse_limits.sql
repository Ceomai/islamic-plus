-- Islamic+ — limits against abuse found in the pre-release audit (DENETIM_RAPORU.md: Y9, Y10)
-- Run AFTER 009_feedback_flood_guard.sql (uses public.guard_insert_rate from 009)
--
-- 1. auth_logs: anyone with the anon key could insert rows without limit through log_auth_event
-- 2. sync_user_app_data / upsert_reading_progress: no limit on how many scopes a user creates,
--    no size check on reading progress, and every push appended tasbih sessions and zakat rows again
-- 3. profiles.email_hash came from the client: another account could claim someone's hash first and
--    make that person's sign-up fail on the unique index ("Database error saving new user")

-- ── 1. Rate limit on auth_logs ──
drop trigger if exists auth_logs_rate on public.auth_logs;
create trigger auth_logs_rate before insert on public.auth_logs
  for each row execute function public.guard_insert_rate('300', '20');

-- ── 2a. Scope rules shared by the sync RPCs ──
create or replace function public.check_sync_scope(p_scope text, p_table text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_others int;
begin
  if p_scope !~ '^[A-Za-z0-9_-]{1,64}$' then
    raise exception 'invalid profile scope';
  end if;
  -- 'default' plus family members; 10 is far above real use
  execute format('select count(*) from public.%I where user_id = $1 and profile_scope <> $2', p_table)
    into v_others using auth.uid(), p_scope;
  if v_others >= 10 then
    raise exception 'too many profile scopes';
  end if;
end;
$$;

revoke all on function public.check_sync_scope(text, text) from public, anon, authenticated;

-- ── 2b. App data sync: validated scope ──
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
  perform check_sync_scope(v_scope, 'user_app_sync');
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

-- ── 2c. Detail tables: replace instead of append, bounded row counts ──
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
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'forbidden';
  end if;

  delete from prayer_completions where user_id = p_user_id and profile_scope = p_scope;
  insert into prayer_completions (user_id, profile_scope, prayer_name, completion_date, completed_at)
  select p_user_id, p_scope,
    (x->>'prayer')::text,
    (x->>'date')::date,
    coalesce((x->>'completedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'prayerCompletions', '[]'::jsonb)) with ordinality as t(x, n)
  where n <= 6000
  on conflict do nothing;

  -- Sessions used to be appended on every push, so the table grew without end
  delete from tasbih_sessions where user_id = p_user_id and profile_scope = p_scope;
  insert into tasbih_sessions (user_id, profile_scope, session_count, target_count, completed_at)
  select p_user_id, p_scope,
    (x->>'count')::int,
    coalesce((x->>'target')::int, 33),
    coalesce((x->>'completedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'tasbih'->'sessions', '[]'::jsonb)) with ordinality as t(x, n)
  where n <= 200
  on conflict do nothing;

  delete from habit_completion_logs where user_id = p_user_id and profile_scope = p_scope;
  for v_habit in select x from jsonb_array_elements(coalesce(p_payload->'habits', '[]'::jsonb)) with ordinality as t(x, n) where n <= 200
  loop
    for v_date in select d from jsonb_array_elements_text(coalesce(v_habit->'completedDates', '[]'::jsonb)) with ordinality as u(d, m) where m <= 1200
    loop
      insert into habit_completion_logs (user_id, profile_scope, habit_id, habit_title, completion_date)
      values (p_user_id, p_scope, left(v_habit->>'id', 64), left(v_habit->>'title', 200), v_date::date)
      on conflict do nothing;
    end loop;
  end loop;

  delete from dua_read_logs where user_id = p_user_id and profile_scope = p_scope;
  for v_dua in
    select key as dua_id, value::int as read_count
    from jsonb_each_text(coalesce(p_payload->'duaProgress', '{}'::jsonb))
    limit 500
  loop
    insert into dua_read_logs (user_id, profile_scope, dua_id, read_count, last_read_at)
    values (p_user_id, p_scope, left(v_dua.dua_id, 64), v_dua.read_count, now());
  end loop;

  delete from education_progress where user_id = p_user_id and profile_scope = p_scope;
  insert into education_progress (user_id, profile_scope, topic_id, read_count, last_opened_at)
  select p_user_id, p_scope,
    left(x->>'topicId', 64),
    coalesce((x->>'readCount')::int, 1),
    coalesce((x->>'lastOpenedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'educationProgress', '[]'::jsonb)) with ordinality as t(x, n)
  where n <= 500
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

  -- Same as tasbih: replace, keep the latest 20 (the app keeps 20)
  delete from zakat_calculations where user_id = p_user_id and profile_scope = p_scope;
  insert into zakat_calculations (user_id, profile_scope, calculated_at, input_data, result_data, is_obligatory)
  select p_user_id, p_scope,
    coalesce((x->>'calculatedAt')::timestamptz, now()),
    coalesce(x->'input', '{}'::jsonb),
    coalesce(x->'result', '{}'::jsonb),
    coalesce((x->>'isObligatory')::boolean, false)
  from jsonb_array_elements(coalesce(p_payload->'zakatHistory', '[]'::jsonb)) with ordinality as t(x, n)
  where n <= 20
  on conflict do nothing;

  if p_payload->'locationPref' is not null and p_payload->'locationPref' != 'null'::jsonb then
    insert into location_prefs (user_id, profile_scope, city, country, latitude, longitude, updated_at)
    values (
      p_user_id, p_scope,
      left(p_payload->'locationPref'->>'city', 120),
      left(p_payload->'locationPref'->>'country', 120),
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
    left(x->>'id', 64), left(x->>'name', 120), coalesce(left(x->>'avatarEmoji', 16), '👤'), coalesce(x->>'role', 'other'),
    coalesce(x->'habitIds', '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_payload->'family', '[]'::jsonb)) with ordinality as t(x, n)
  where n <= 20
  on conflict do nothing;
end;
$$;

revoke execute on function public.sync_user_detail_tables(uuid, text, jsonb) from public, anon, authenticated;

-- ── 2d. Reading progress: validated scope and size ──
create or replace function public.upsert_reading_progress(
  p_profile_scope text,
  p_quran jsonb,
  p_hadith jsonb
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
  perform check_sync_scope(v_scope, 'user_reading_progress');
  if pg_column_size(p_quran) + pg_column_size(p_hadith) > 256 * 1024 then
    raise exception 'payload too large';
  end if;

  insert into public.user_reading_progress (user_id, profile_scope, quran_progress, hadith_progress, updated_at)
  values (auth.uid(), v_scope, coalesce(p_quran, '{}'::jsonb), coalesce(p_hadith, '{}'::jsonb), v_updated)
  on conflict (user_id, profile_scope) do update
  set quran_progress = excluded.quran_progress, hadith_progress = excluded.hadith_progress, updated_at = v_updated;

  return v_updated;
end;
$$;

revoke execute on function public.upsert_reading_progress(text, jsonb, jsonb) from public, anon;
grant execute on function public.upsert_reading_progress(text, jsonb, jsonb) to authenticated;

-- ── 3. email_hash comes from the account's own e-mail, never from the client ──
-- Same value the app computes (sha256 of the trimmed, lower-case address, hex).
create or replace function public.email_hash_of(p_email text)
returns text
language sql
immutable
as $$
  select case when p_email is null then null else encode(sha256(convert_to(lower(trim(p_email)), 'UTF8')), 'hex') end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := coalesce(public.email_hash_of(new.email), 'pending');
begin
  -- A row that claimed this hash without owning the address gives it up
  update public.profiles set email_hash = 'pending' where email_hash = v_hash and id <> new.id;
  insert into public.profiles (id, email_hash, pseudonym)
  values (new.id, v_hash, left(coalesce(new.raw_user_meta_data->>'pseudonym', 'user'), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- p_email_hash is kept for older app builds but ignored
create or replace function public.upsert_user_profile(
  p_email_hash text,
  p_pseudonym text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select coalesce(public.email_hash_of(email), 'pending') into v_hash from auth.users where id = auth.uid();
  update public.profiles set email_hash = 'pending' where email_hash = v_hash and id <> auth.uid();

  insert into public.profiles (id, email_hash, pseudonym)
  values (auth.uid(), v_hash, left(coalesce(p_pseudonym, 'user'), 120))
  on conflict (id) do update
  set email_hash = excluded.email_hash, pseudonym = excluded.pseudonym, updated_at = now();
end;
$$;

revoke execute on function public.upsert_user_profile(text, text) from public, anon;
grant execute on function public.upsert_user_profile(text, text) to authenticated;

-- Fix hashes claimed before this migration
update public.profiles p
set email_hash = 'pending'
where p.email_hash <> 'pending'
  and p.email_hash is distinct from (select public.email_hash_of(u.email) from auth.users u where u.id = p.id);

-- …then give each account its own hash back
update public.profiles p
set email_hash = public.email_hash_of(u.email), updated_at = now()
from auth.users u
where u.id = p.id
  and p.email_hash = 'pending'
  and u.email is not null
  and not exists (select 1 from public.profiles o where o.email_hash = public.email_hash_of(u.email));
