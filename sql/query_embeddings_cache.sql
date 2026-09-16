-- ==========================================================
-- Query Embeddings Cache Table
-- Used by Supabase Edge Function: generate-embedding
-- Caches 768-dimensional text embeddings to prevent repeat
-- Google Gemini API calls and reduce search latency.
-- ==========================================================

-- Ensure vector extension exists
create extension if not exists vector with schema extensions;

-- Create query_embeddings_cache table
create table if not exists public.query_embeddings_cache (
  id bigint generated always as identity primary key,
  query_text text not null,
  query_hash text not null unique,
  embedding vector(768) not null,
  hit_count integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_accessed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Fast lookup index on the query hash
create index if not exists idx_query_embeddings_cache_hash 
  on public.query_embeddings_cache (query_hash);

-- Enable Row Level Security (RLS)
alter table public.query_embeddings_cache enable row level security;

-- Policy: Allow service role full access (Edge Function runs with service role key)
drop policy if exists "Service role can manage embedding cache" on public.query_embeddings_cache;
create policy "Service role can manage embedding cache"
  on public.query_embeddings_cache
  for all
  to service_role
  using (true)
  with check (true);

-- Policy: Allow authenticated/anon to read cached embeddings if needed
drop policy if exists "Public read access to embedding cache" on public.query_embeddings_cache;
create policy "Public read access to embedding cache"
  on public.query_embeddings_cache
  for select
  to anon, authenticated
  using (true);
