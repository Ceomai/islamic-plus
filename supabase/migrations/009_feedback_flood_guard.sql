-- Islamic+ — flood guard for the write-only feedback and error tables
-- Run AFTER 008_feedback_and_errors.sql
--
-- app_feedback and app_errors accept inserts from the anon key, so a script could fill them.
-- These triggers cap how many rows can arrive per minute (globally, and per signed-in user).
-- Real testers stay far below the limits; a flood gets "rate limit" errors instead of rows.

create or replace function public.guard_insert_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  global_limit int := tg_argv[0]::int;
  user_limit int := tg_argv[1]::int;
  recent int;
begin
  execute format('select count(*) from public.%I where created_at > now() - interval ''1 minute''', tg_table_name)
    into recent;
  if recent >= global_limit then
    raise exception 'rate limit' using errcode = 'P0001';
  end if;

  if new.user_id is not null then
    execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 minute''', tg_table_name)
      into recent using new.user_id;
    if recent >= user_limit then
      raise exception 'rate limit' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_insert_rate() from public, anon, authenticated;

drop trigger if exists app_feedback_rate on public.app_feedback;
create trigger app_feedback_rate before insert on public.app_feedback
  for each row execute function public.guard_insert_rate('30', '5');

drop trigger if exists app_errors_rate on public.app_errors;
create trigger app_errors_rate before insert on public.app_errors
  for each row execute function public.guard_insert_rate('120', '20');

create index if not exists app_feedback_user_idx on public.app_feedback (user_id, created_at desc);
create index if not exists app_errors_user_idx on public.app_errors (user_id, created_at desc);
