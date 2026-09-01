-- ==============================================================================
-- PEAK VBT PERFORMANCE HUB - SUPABASE DATABASE SCHEMA (vbt_athletes)
-- ==============================================================================
-- Run this script in your Supabase Project's "SQL Editor" tab (1-Click Execution)
-- This creates the vbt_athletes table, configures Row Level Security (RLS), 
-- and enables Supabase Realtime for instant PC <-> Mobile sync.
-- ==============================================================================

-- 1. Create vbt_athletes Table
create table if not exists public.vbt_athletes (
  id text primary key,
  name text not null,
  name_ar text default '',
  sport_event text default '',
  body_weight_kg numeric default 75,
  notes text default '',
  avatar_initials text default 'AT',
  color_accent text default 'cyan',
  manual_1rm_map jsonb default '{}'::jsonb,
  tests jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create updated_at automatic trigger
create or replace function public.handle_vbt_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_vbt_athletes_updated_at on public.vbt_athletes;
create trigger set_vbt_athletes_updated_at
  before update on public.vbt_athletes
  for each row
  execute function public.handle_vbt_updated_at();

-- 3. Enable Row Level Security (RLS)
alter table public.vbt_athletes enable row level security;

-- 4. Policy: Allow public access (Read, Insert, Update, Delete) with anon key
drop policy if exists "Allow public access for all operations on vbt_athletes" on public.vbt_athletes;
create policy "Allow public access for all operations on vbt_athletes"
  on public.vbt_athletes
  for all
  using (true)
  with check (true);

-- 5. Enable Realtime Replication for instant cross-device updates
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'vbt_athletes'
  ) then
    alter publication supabase_realtime add table public.vbt_athletes;
  end if;
end;
$$;

-- Verification query
select * from public.vbt_athletes limit 5;
