-- Islamic+ — anonymized profiles + auth event logs
-- Run in Supabase SQL Editor after creating a project.

-- Profiles: no plain email; only hash + display pseudonym
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email_hash text not null unique,
  pseudonym text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auth audit log (sign up, sign in, sign out, failures, guest)
create table if not exists public.auth_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null check (
    event_type in (
      'sign_up',
      'sign_in',
      'sign_out',
      'sign_in_failed',
      'guest_start'
    )
  ),
  pseudonym text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_logs_created_at_idx on public.auth_logs (created_at desc);
create index if not exists auth_logs_user_id_idx on public.auth_logs (user_id);

alter table public.profiles enable row level security;
alter table public.auth_logs enable row level security;

-- Users manage only their own profile row
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Authenticated users can insert their own auth logs
create policy "auth_logs_insert_own"
  on public.auth_logs for insert
  with check (user_id is null or auth.uid() = user_id);

-- Users can read only their own logs (developer: use Supabase Dashboard / service role)
create policy "auth_logs_select_own"
  on public.auth_logs for select
  using (user_id is null or auth.uid() = user_id);

-- Auto-create profile row when email is confirmed (optional; client also upserts)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email_hash, pseudonym)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'email_hash', 'pending'),
    coalesce(new.raw_user_meta_data->>'pseudonym', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
