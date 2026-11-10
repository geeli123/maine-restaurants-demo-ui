-- ==========================================================
-- Search Analytics Table
-- Used by Supabase Edge Function: generate-embedding
-- Captures search queries and extracted keywords to analyze
-- what users are searching for in Maine Menu Match.
-- ==========================================================

create table if not exists public.search_analytics (
  id bigint generated always as identity primary key,
  query_text text not null,
  normalized_query text not null,
  query_hash text not null,
  keywords text[] not null default '{}'::text[],
  cache_hit boolean not null default false,
  user_agent text,
  referer text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for analytics queries
create index if not exists idx_search_analytics_created_at
  on public.search_analytics (created_at desc);

create index if not exists idx_search_analytics_normalized_query
  on public.search_analytics (normalized_query);

create index if not exists idx_search_analytics_keywords
  on public.search_analytics using gin (keywords);

-- Enable Row Level Security (RLS)
alter table public.search_analytics enable row level security;

-- Policy: Allow service role full access (Edge Function runs with service role key)
drop policy if exists "Service role can manage search analytics" on public.search_analytics;
create policy "Service role can manage search analytics"
  on public.search_analytics
  for all
  to service_role
  using (true)
  with check (true);

-- Policy: Allow authenticated users (e.g. admins) to read analytics
drop policy if exists "Authenticated users can read search analytics" on public.search_analytics;
create policy "Authenticated users can read search analytics"
  on public.search_analytics
  for select
  to authenticated
  using (true);

-- ==========================================================
-- Example Analytics Queries (Run in Supabase SQL Editor)
-- ==========================================================
--
-- 1. Most popular full search queries:
-- select normalized_query, count(*) as total_searches, max(created_at) as last_searched_at
-- from public.search_analytics
-- group by normalized_query
-- order by total_searches desc
-- limit 25;
--
-- 2. Most popular individual keywords / wizard choices:
-- select unnest(keywords) as keyword, count(*) as total_searches
-- from public.search_analytics
-- group by keyword
-- order by total_searches desc;
--
-- 3. Daily search volume & cache hit rate:
-- select
--   date_trunc('day', created_at) as day,
--   count(*) as total_searches,
--   count(*) filter (where cache_hit) as cache_hits,
--   round(100.0 * count(*) filter (where cache_hit) / nullif(count(*), 0), 1) as cache_hit_pct
-- from public.search_analytics
-- group by day
-- order by day desc;

