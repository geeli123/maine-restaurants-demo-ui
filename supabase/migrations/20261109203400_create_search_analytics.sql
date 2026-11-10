-- Migration: create_search_analytics
-- Description: Create search_analytics table to log user search queries and keywords from the generate-embedding Edge Function

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

create index if not exists idx_search_analytics_created_at
  on public.search_analytics (created_at desc);

create index if not exists idx_search_analytics_normalized_query
  on public.search_analytics (normalized_query);

create index if not exists idx_search_analytics_keywords
  on public.search_analytics using gin (keywords);

alter table public.search_analytics enable row level security;

drop policy if exists "Service role can manage search analytics" on public.search_analytics;
create policy "Service role can manage search analytics"
  on public.search_analytics
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read search analytics" on public.search_analytics;
create policy "Authenticated users can read search analytics"
  on public.search_analytics
  for select
  to authenticated
  using (true);

