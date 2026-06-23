-- Enable the pgvector extension for vector similarity search
create extension if not exists vector with schema extensions;

-- Create curation status enum
do $$ begin
  create type curation_status as enum ('ACTIVE', 'STAGING', 'DISCARDED', 'APPROVED');
exception
  when duplicate_object then null;
end $$;

-- Create the restaurants table (Parent)
create table if not exists public.restaurants_1 (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  description text,

  name text not null,
  location text,

  --Keywords
  keywords text[],

  -- Google Maps data
  google_maps_place_id text,
  latitude double precision,
  longitude double precision,
  address text,

  -- Vector embedding for semantic search directly against the restaurant
  embedding vector(768),  -- Adjust dimension based on your embedding model

  -- Best of Lists
  best_of_2025 boolean default false,
  best_of_2024 boolean default false,
  best_of_2023 boolean default false,
  best_of_2022 boolean default false,
  best_of_2021 boolean default false,

  -- Curation fields
  status curation_status default 'STAGING',
  is_reviewed boolean default false,

  constraint unique_google_maps_place_id unique (google_maps_place_id)
);

-- Create the restaurant_reviews table (Child)
create table if not exists public.restaurant_reviews_1 (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid not null references public.restaurants_1(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Article metadata
  title text not null,
  link text,
  content text,
  post_id text,
  post_date_gmt timestamp with time zone,
  post_modified_gmt timestamp with time zone,

  -- Condensed review
  short_review text,

  -- Curation fields
  status curation_status default 'STAGING',
  is_reviewed boolean default false,

  constraint unique_restaurant_post unique (restaurant_id, post_id)
);

-- Enable Row Level Security (RLS)
alter table public.restaurant_reviews_1 enable row level security;
alter table public.restaurants_1 enable row level security;

-- Drop existing RLS policies to be idempotent
drop policy if exists "Allow public read access" on public.restaurant_reviews_1;
drop policy if exists "Allow public read access" on public.restaurants_1;
drop policy if exists "Allow authenticated insert" on public.restaurant_reviews_1;
drop policy if exists "Allow authenticated insert" on public.restaurants_1;
drop policy if exists "Allow authenticated update" on public.restaurant_reviews_1;
drop policy if exists "Allow authenticated update" on public.restaurants_1;
drop policy if exists "Allow authenticated delete" on public.restaurants_1;
drop policy if exists "Allow authenticated delete" on public.restaurant_reviews_1;

-- Create RLS policies
-- Allow public read access (adjust based on your security requirements)
create policy "Allow public read access" on public.restaurant_reviews_1
  for select using (true);
create policy "Allow public read access" on public.restaurants_1
  for select using (true);

-- Allow authenticated users to insert (adjust based on your security requirements)
create policy "Allow authenticated insert" on public.restaurant_reviews_1
  for insert with check (auth.role() = 'authenticated');
create policy "Allow authenticated insert" on public.restaurants_1
  for insert with check (auth.role() = 'authenticated');

-- Allow authenticated users to update their own entries (adjust based on your requirements)
create policy "Allow authenticated update" on public.restaurant_reviews_1
  for update using (auth.role() = 'authenticated');
create policy "Allow authenticated update" on public.restaurants_1
  for update using (auth.role() = 'authenticated');

-- Allow authenticated users to delete (adjust based on your security requirements)
create policy "Allow authenticated delete" on public.restaurants_1
  for delete using (auth.role() = 'authenticated');
create policy "Allow authenticated delete" on public.restaurant_reviews_1
  for delete using (auth.role() = 'authenticated');

-- Create indexes for performance
create index if not exists restaurants_1_name_idx on public.restaurants_1 (name);
create index if not exists restaurants_1_location_idx on public.restaurants_1 (location);
create index if not exists restaurant_reviews_1_restaurant_id_idx on public.restaurant_reviews_1 (restaurant_id);
create index if not exists restaurant_reviews_1_post_id_idx on public.restaurant_reviews_1 (post_id);
create index if not exists restaurant_reviews_1_post_date_idx on public.restaurant_reviews_1 (post_date_gmt desc);

-- Create vector similarity search index using HNSW for restaurants_1
create index if not exists restaurants_1_embedding_idx on public.restaurants_1
using hnsw (embedding vector_cosine_ops);

-- Create a function to automatically update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Drop existing triggers to be idempotent
drop trigger if exists set_restaurants_1_updated_at on public.restaurants_1;
drop trigger if exists set_restaurant_reviews_1_updated_at on public.restaurant_reviews_1;

-- Create triggers to auto-update updated_at for both tables
create trigger set_restaurants_1_updated_at
  before update on public.restaurants_1
  for each row
  execute function public.handle_updated_at();

create trigger set_restaurant_reviews_1_updated_at
  before update on public.restaurant_reviews_1
  for each row
  execute function public.handle_updated_at();

-- Drop existing search functions since the return table signature has changed
drop function if exists public.search_restaurants(vector(768), float, int);
drop function if exists public.search_restaurants(vector, float, int);

-- Function for semantic search using vector similarity against restaurants_1
create or replace function public.search_restaurants(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  name text,
  location text,
  address text,
  description text,
  keywords text[],
  best_of_2025 boolean,
  best_of_2024 boolean,
  best_of_2023 boolean,
  best_of_2022 boolean,
  best_of_2021 boolean,
  status curation_status,
  is_reviewed boolean,
  similarity float,
  reviews json,
  google_maps_place_id text
)
language plpgsql stable
as $$
begin
  return query
  select
    r.id,
    r.name,
    r.location,
    r.address,
    r.description,
    r.keywords,
    r.best_of_2025,
    r.best_of_2024,
    r.best_of_2023,
    r.best_of_2022,
    r.best_of_2021,
    r.status,
    r.is_reviewed,
    1 - (r.embedding <=> query_embedding) as similarity,
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', rev.id,
            'title', rev.title,
            'content', rev.content,
            'short_review', rev.short_review,
            'link', rev.link,
            'post_date_gmt', rev.post_date_gmt,
            'status', rev.status,
            'is_reviewed', rev.is_reviewed
          )
        )
        from public.restaurant_reviews_1 rev
        where rev.restaurant_id = r.id
      ),
      '[]'::json
    ) as reviews,
    r.google_maps_place_id
  from public.restaurants_1 r
  where 1 - (r.embedding <=> query_embedding) > match_threshold
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Drop existing hybrid search functions since the return table signature has changed
drop function if exists public.hybrid_search_restaurants(text, vector(768), int);
drop function if exists public.hybrid_search_restaurants(text, vector, int);

-- Function for hybrid search (combining full-text and vector search) on restaurants_1
create or replace function public.hybrid_search_restaurants(
  search_query text,
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  name text,
  location text,
  address text,
  description text,
  keywords text[],
  best_of_2025 boolean,
  best_of_2024 boolean,
  best_of_2023 boolean,
  best_of_2022 boolean,
  best_of_2021 boolean,
  status curation_status,
  is_reviewed boolean,
  similarity float,
  reviews json,
  google_maps_place_id text
)
language plpgsql stable
as $$
begin
  return query
  select
    r.id,
    r.name,
    r.location,
    r.address,
    r.description,
    r.keywords,
    r.best_of_2025,
    r.best_of_2024,
    r.best_of_2023,
    r.best_of_2022,
    r.best_of_2021,
    r.status,
    r.is_reviewed,
    1 - (r.embedding <=> query_embedding) as similarity,
    coalesce(
      (
        select json_agg(
          json_build_object(
            'id', rev.id,
            'title', rev.title,
            'content', rev.content,
            'short_review', rev.short_review,
            'link', rev.link,
            'post_date_gmt', rev.post_date_gmt,
            'status', rev.status,
            'is_reviewed', rev.is_reviewed
          )
        )
        from public.restaurant_reviews_1 rev
        where rev.restaurant_id = r.id
      ),
      '[]'::json
    ) as reviews,
    r.google_maps_place_id
  from public.restaurants_1 r
  where
    r.name ilike '%' || search_query || '%'
    or r.location ilike '%' || search_query || '%'
    or array_to_string(r.keywords, ' ') ilike '%' || search_query || '%'
    or exists (select 1 from unnest(r.keywords) as kw where search_query ilike '%' || kw || '%')
    or 1 - (r.embedding <=> query_embedding) > match_threshold
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;


-- -- 1. Create the new ENUM type
-- CREATE TYPE curation_status AS ENUM ('ACTIVE', 'STAGING', 'DISCARDED', 'APPROVED');

-- -- 2. Add columns to the restaurants table
-- ALTER TABLE public.restaurants_1
--   ADD COLUMN status curation_status DEFAULT 'STAGING',
--   ADD COLUMN is_reviewed boolean DEFAULT false;

-- -- 3. Add columns to the reviews table
-- ALTER TABLE public.restaurant_reviews_1
--   ADD COLUMN status curation_status DEFAULT 'STAGING',
--   ADD COLUMN is_reviewed boolean DEFAULT false;

-- -- 4. Add unique constraints to support the pipeline's upsert logic
-- ALTER TABLE public.restaurants_1 
--   ADD CONSTRAINT unique_google_maps_place_id UNIQUE (google_maps_place_id);

-- ALTER TABLE public.restaurant_reviews_1 
--   ADD CONSTRAINT unique_restaurant_post UNIQUE (restaurant_id, post_id);