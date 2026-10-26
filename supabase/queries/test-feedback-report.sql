-- Islamic+ — test-group report. Paste into Supabase › SQL Editor (runs as the service role).
-- Change the interval to cover the test round.

-- 1) Feedback, newest first
select created_at, category, app_version, platform, language, screen, message,
       error_report is not null as has_error_report
from public.app_feedback
where created_at > now() - interval '14 days'
order by created_at desc;

-- 2) Feedback count per category and version
select app_version, category, count(*)
from public.app_feedback
where created_at > now() - interval '14 days'
group by 1, 2
order by 1 desc, 3 desc;

-- 3) Errors grouped: the most frequent first, with how many distinct users hit them
select message, source, bool_or(fatal) as fatal, count(*) as times,
       count(distinct user_id) as users, min(app_version) as first_version,
       max(created_at) as last_seen, (array_agg(platform order by created_at desc))[1] as last_platform
from public.app_errors
where created_at > now() - interval '14 days'
group by message, source
order by times desc
limit 50;

-- 4) One stack trace for a message from query 3
-- select stack, platform, app_version, occurred_at from public.app_errors
-- where message = '...' order by created_at desc limit 1;
