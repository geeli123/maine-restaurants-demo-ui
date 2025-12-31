-- Enable the pgvector extension for vector similarity search
create extension if not exists vector with schema extensions;

-- Create the restaurant_reviews table
create table if not exists public.restaurant_reviews (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Article metadata
  title text not null,
  link text,
  content text,
  post_id text,
  post_date_gmt timestamp with time zone,
  post_modified_gmt timestamp with time zone,

  -- Restaurant information
  restaurant_name text,
  restaurant_name_rationale text,
  location text,
  location_rationale text,
  cuisines jsonb default '[]'::jsonb,

  -- Google Maps data
  google_maps_place_id text,
  latitude double precision,
  longitude double precision,
  address text,

  -- Condensed review
  short_review text,

  -- Vector embedding for semantic search
  embedding vector(768)  -- Adjust dimension based on your embedding model
);

-- Create indexes for common queries
create index if not exists restaurant_reviews_post_id_idx on public.restaurant_reviews (post_id);
create index if not exists restaurant_reviews_restaurant_name_idx on public.restaurant_reviews (restaurant_name);
create index if not exists restaurant_reviews_location_idx on public.restaurant_reviews (location);
create index if not exists restaurant_reviews_post_date_idx on public.restaurant_reviews (post_date_gmt desc);

-- Create vector similarity search index using HNSW (Hierarchical Navigable Small World)
create index if not exists restaurant_reviews_embedding_idx on public.restaurant_reviews
using hnsw (embedding vector_cosine_ops);

-- Alternative: IVFFlat index (uncomment if preferred)
-- create index if not exists restaurant_reviews_embedding_idx on public.restaurant_reviews
-- using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Create GIN index for JSONB cuisines column
create index if not exists restaurant_reviews_cuisines_idx on public.restaurant_reviews using gin (cuisines);

-- Create a function to automatically update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-update updated_at
create trigger set_updated_at
  before update on public.restaurant_reviews
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security (RLS)
alter table public.restaurant_reviews enable row level security;

-- Create RLS policies
-- Allow public read access (adjust based on your security requirements)
create policy "Allow public read access" on public.restaurant_reviews
  for select using (true);

-- Allow authenticated users to insert (adjust based on your security requirements)
create policy "Allow authenticated insert" on public.restaurant_reviews
  for insert with check (auth.role() = 'authenticated');

-- Allow authenticated users to update their own entries (adjust based on your requirements)
create policy "Allow authenticated update" on public.restaurant_reviews
  for update using (auth.role() = 'authenticated');

-- Allow authenticated users to delete (adjust based on your security requirements)
create policy "Allow authenticated delete" on public.restaurant_reviews
  for delete using (auth.role() = 'authenticated');

-- Create a view for all restaurant reviews
create or replace view public.restaurant_reviews_rated as
select *
from public.restaurant_reviews;

-- Function for semantic search using vector similarity
create or replace function public.search_restaurant_reviews(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  restaurant_name text,
  location text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    restaurant_reviews.id,
    restaurant_reviews.title,
    restaurant_reviews.restaurant_name,
    restaurant_reviews.location,
    restaurant_reviews.content,
    1 - (restaurant_reviews.embedding <=> query_embedding) as similarity
  from public.restaurant_reviews
  where 1 - (restaurant_reviews.embedding <=> query_embedding) > match_threshold
  order by restaurant_reviews.embedding <=> query_embedding
  limit match_count;
$$;

-- Function for hybrid search (combining full-text and vector search)
create or replace function public.hybrid_search_restaurant_reviews(
  search_query text,
  query_embedding vector(768),
  match_count int default 10
)
returns table (
  id uuid,
  title text,
  restaurant_name text,
  location text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    restaurant_reviews.id,
    restaurant_reviews.title,
    restaurant_reviews.restaurant_name,
    restaurant_reviews.location,
    restaurant_reviews.content,
    1 - (restaurant_reviews.embedding <=> query_embedding) as similarity
  from public.restaurant_reviews
  where
    restaurant_reviews.content ilike '%' || search_query || '%'
    or restaurant_reviews.title ilike '%' || search_query || '%'
    or restaurant_reviews.restaurant_name ilike '%' || search_query || '%'
  order by restaurant_reviews.embedding <=> query_embedding
  limit match_count;
$$;
