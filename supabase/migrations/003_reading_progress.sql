-- Islamic+ — reading progress (Quran + Hadith) cloud sync
-- Run AFTER 002_analytics_rpc.sql

create table if not exists public.user_reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_scope text not null default 'default',
  quran_progress jsonb not null default '{}'::jsonb,
  hadith_progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, profile_scope)
);

create index if not exists user_reading_progress_user_idx
  on public.user_reading_progress (user_id);

alter table public.user_reading_progress enable row level security;

drop policy if exists "reading_progress_select_own" on public.user_reading_progress;
create policy "reading_progress_select_own"
  on public.user_reading_progress for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reading_progress_insert_own" on public.user_reading_progress;
create policy "reading_progress_insert_own"
  on public.user_reading_progress for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reading_progress_update_own" on public.user_reading_progress;
create policy "reading_progress_update_own"
  on public.user_reading_progress for update to authenticated
  using (auth.uid() = user_id);

-- Upsert full reading state (debounced from app — not per-ayah)
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
  v_updated timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_reading_progress (
    user_id, profile_scope, quran_progress, hadith_progress, updated_at
  ) values (
    auth.uid(),
    coalesce(nullif(trim(p_profile_scope), ''), 'default'),
    coalesce(p_quran, '{}'::jsonb),
    coalesce(p_hadith, '{}'::jsonb),
    v_updated
  )
  on conflict (user_id, profile_scope) do update
  set
    quran_progress = excluded.quran_progress,
    hadith_progress = excluded.hadith_progress,
    updated_at = v_updated;

  return v_updated;
end;
$$;

create or replace function public.get_reading_progress(p_profile_scope text)
returns table (
  quran_progress jsonb,
  hadith_progress jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    urp.quran_progress,
    urp.hadith_progress,
    urp.updated_at
  from public.user_reading_progress urp
  where urp.user_id = auth.uid()
    and urp.profile_scope = coalesce(nullif(trim(p_profile_scope), ''), 'default');
end;
$$;

grant execute on function public.upsert_reading_progress(text, jsonb, jsonb) to authenticated;
grant execute on function public.get_reading_progress(text) to authenticated;

create or replace view public.admin_reading_overview as
select
  urp.user_id,
  p.pseudonym,
  urp.profile_scope,
  urp.quran_progress -> 'lastRead' ->> 'surahName' as quran_last_surah,
  urp.quran_progress -> 'lastRead' ->> 'ayahNumber' as quran_last_ayah,
  jsonb_array_length(coalesce(urp.quran_progress -> 'bookmarks', '[]'::jsonb)) as quran_bookmarks,
  urp.hadith_progress -> 'lastRead' ->> 'collectionName' as hadith_last_collection,
  jsonb_array_length(coalesce(urp.hadith_progress -> 'bookmarks', '[]'::jsonb)) as hadith_bookmarks,
  urp.updated_at
from public.user_reading_progress urp
left join public.profiles p on p.id = urp.user_id
order by urp.updated_at desc;
