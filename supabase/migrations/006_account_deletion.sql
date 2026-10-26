-- Islamic+ — self-service account deletion (App Store / Google Play requirement)
-- Run AFTER 005_security_hardening.sql
--
-- Deleting the auth.users row cascades to profiles, activity_logs, ai_chat_logs,
-- user_reading_progress, user_app_sync and every 004 detail table (all "on delete cascade").
-- auth_logs uses "on delete set null", so the user's rows there are removed explicitly first.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.auth_logs where user_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
