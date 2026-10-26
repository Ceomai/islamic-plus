-- Islamic+ — full app data sync (prayer, tasbih, habits, duas, education, prefs, zakat, location, family)
-- Run AFTER 003_reading_progress.sql

create table if not exists public.user_app_sync (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_scope)
);

create table if not exists public.prayer_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  prayer_name text not null,
  completion_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, profile_scope, prayer_name, completion_date)
);

create table if not exists public.tasbih_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  session_count integer not null,
  target_count integer not null,
  completed_at timestamptz not null default now()
);

create table if not exists public.habit_completion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  habit_id text not null,
  habit_title text not null,
  completion_date date not null,
  unique (user_id, profile_scope, habit_id, completion_date)
);

create table if not exists public.dua_read_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  dua_id text not null,
  read_count integer not null default 1,
  last_read_at timestamptz not null default now(),
  unique (user_id, profile_scope, dua_id)
);

create table if not exists public.education_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  topic_id text not null,
  read_count integer not null default 1,
  last_opened_at timestamptz not null default now(),
  unique (user_id, profile_scope, topic_id)
);

create table if not exists public.user_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  theme_id text,
  dark_mode boolean not null default false,
  app_language text,
  home_launcher jsonb not null default '[]'::jsonb,
  widget_prefs jsonb not null default '{}'::jsonb,
  notification_prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_scope)
);

create table if not exists public.zakat_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  calculated_at timestamptz not null default now(),
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  is_obligatory boolean not null default false
);

create table if not exists public.location_prefs (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  city text,
  country text,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_scope)
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  member_id text not null,
  name text not null,
  avatar_emoji text not null default '👤',
  member_role text not null default 'other',
  habit_ids jsonb not null default '[]'::jsonb,
  unique (user_id, profile_scope, member_id)
);

alter table public.user_app_sync enable row level security;
alter table public.prayer_completions enable row level security;
alter table public.tasbih_sessions enable row level security;
alter table public.habit_completion_logs enable row level security;
alter table public.dua_read_logs enable row level security;
alter table public.education_progress enable row level security;
alter table public.user_preferences enable row level security;
alter table public.zakat_calculations enable row level security;
alter table public.location_prefs enable row level security;
alter table public.family_members enable row level security;

-- RLS: own data only
do $$
declare t text;
begin
  foreach t in array array[
    'user_app_sync','prayer_completions','tasbih_sessions','habit_completion_logs',
    'dua_read_logs','education_progress','user_preferences','zakat_calculations',
    'location_prefs','family_members'
  ] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('create policy "%s_insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('create policy "%s_update" on public.%I for update to authenticated using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);
    execute format('create policy "%s_delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

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
  delete from prayer_completions where user_id = p_user_id and profile_scope = p_scope;
  insert into prayer_completions (user_id, profile_scope, prayer_name, completion_date, completed_at)
  select p_user_id, p_scope,
    (x->>'prayer')::text,
    (x->>'date')::date,
    coalesce((x->>'completedAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_payload->'prayerCompletions', '[]'::jsonb)) as x;

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
    for v_date in select jsonb_array_elements_text(v_habit->'completedDates')
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
  from jsonb_array_elements(coalesce(p_payload->'educationProgress', '[]'::jsonb)) as x;

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
  from jsonb_array_elements(coalesce(p_payload->'family', '[]'::jsonb)) as x;
end;
$$;

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

  insert into user_app_sync (user_id, profile_scope, payload, updated_at)
  values (auth.uid(), v_scope, coalesce(p_payload, '{}'::jsonb), v_updated)
  on conflict (user_id, profile_scope) do update
  set payload = excluded.payload, updated_at = v_updated;

  perform sync_user_detail_tables(auth.uid(), v_scope, p_payload);
  return v_updated;
end;
$$;

create or replace function public.get_user_app_data(p_profile_scope text)
returns table (payload jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := coalesce(nullif(trim(p_profile_scope), ''), 'default');
begin
  if auth.uid() is null then return; end if;
  return query
  select uas.payload, uas.updated_at
  from user_app_sync uas
  where uas.user_id = auth.uid() and uas.profile_scope = v_scope;
end;
$$;

grant execute on function public.sync_user_app_data(text, jsonb) to authenticated;
grant execute on function public.get_user_app_data(text) to authenticated;

create or replace view public.admin_app_data_overview as
select
  p.pseudonym,
  uas.user_id,
  uas.profile_scope,
  uas.updated_at,
  (select count(*) from prayer_completions pc where pc.user_id = uas.user_id) as prayers_logged,
  (select count(*) from tasbih_sessions ts where ts.user_id = uas.user_id) as tasbih_sessions,
  (select count(*) from dua_read_logs dr where dr.user_id = uas.user_id) as duas_read,
  (select count(*) from education_progress ep where ep.user_id = uas.user_id) as topics_read,
  (select count(*) from zakat_calculations zc where zc.user_id = uas.user_id) as zakat_calcs,
  (select count(*) from family_members fm where fm.user_id = uas.user_id) as family_members
from user_app_sync uas
left join profiles p on p.id = uas.user_id
order by uas.updated_at desc;
