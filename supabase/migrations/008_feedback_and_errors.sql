-- Islamic+ — tester feedback and app error reports
-- Run AFTER 007_assistant_and_places.sql
--
-- Both tables are write-only from the app: anyone with the anon key (guests included) and
-- signed-in users may INSERT, nobody may read through the API. Read them in the Dashboard
-- (Table Editor / SQL Editor), which uses the service role.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  category text not null check (category in ('bug', 'idea', 'content', 'other')),
  message text not null check (char_length(message) between 3 and 4000),
  screen text check (char_length(screen) <= 80),
  app_version text check (char_length(app_version) <= 40),
  platform text check (char_length(platform) <= 40),
  language text check (char_length(language) <= 8),
  error_report text check (char_length(error_report) <= 20000)
);

create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null default auth.uid(),
  source text not null check (source in ('render', 'global', 'promise')),
  message text not null check (char_length(message) <= 600),
  stack text check (char_length(stack) <= 4000),
  fatal boolean not null default false,
  app_version text check (char_length(app_version) <= 40),
  platform text check (char_length(platform) <= 40),
  occurred_at timestamptz
);

alter table public.app_feedback enable row level security;
alter table public.app_errors enable row level security;

-- user_id can only be the caller's own id (or empty for guests); it cannot be spoofed
drop policy if exists "insert own feedback" on public.app_feedback;
create policy "insert own feedback" on public.app_feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "insert own errors" on public.app_errors;
create policy "insert own errors" on public.app_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

revoke select, update, delete on public.app_feedback from anon, authenticated;
revoke select, update, delete on public.app_errors from anon, authenticated;
grant insert on public.app_feedback to anon, authenticated;
grant insert on public.app_errors to anon, authenticated;

create index if not exists app_feedback_created_idx on public.app_feedback (created_at desc);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
