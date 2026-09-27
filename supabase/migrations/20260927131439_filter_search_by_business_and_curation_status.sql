-- Migration: filter_search_by_business_and_curation_status
-- Description: Update search_restaurants and hybrid_search_restaurants to not surface closed business statuses or discarded/staging curation status

set search_path to public, extensions;

drop function if exists public.search_restaurants(extensions.vector(768), float, int);
drop function if exists public.search_restaurants(extensions.vector, float, int);
drop function if exists public.search_restaurants(vector(768), float, int);
drop function if exists public.search_restaurants(vector, float, int);

create or replace function public.search_restaurants(
  query_embedding extensions.vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  name text,
  location text,
  address text,
  additional_addresses text[],
  description text,
  keywords text[],
  best_of_2026 boolean,
  best_of_2025 boolean,
  best_of_2024 boolean,
  best_of_2023 boolean,
  best_of_2022 boolean,
  best_of_2021 boolean,
  status curation_status,
  is_reviewed boolean,
  similarity float,
  reviews json,
  google_maps_place_id text,
  business_status text
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
    r.additional_addresses,
    r.description,
    r.keywords,
    r.best_of_2026,
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
          and (rev.status is null or rev.status in ('ACTIVE', 'APPROVED'))
      ),
      '[]'::json
    ) as reviews,
    r.google_maps_place_id,
    r.business_status
  from public.restaurants_1 r
  where 1 - (r.embedding <=> query_embedding) > match_threshold
    and coalesce(r.business_status, 'OPEN') = 'OPEN'
    and r.status in ('ACTIVE', 'APPROVED')
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;

drop function if exists public.hybrid_search_restaurants(text, extensions.vector(768), float, int);
drop function if exists public.hybrid_search_restaurants(text, extensions.vector, float, int);
drop function if exists public.hybrid_search_restaurants(text, extensions.vector(768), int);
drop function if exists public.hybrid_search_restaurants(text, extensions.vector, int);
drop function if exists public.hybrid_search_restaurants(text, vector(768), float, int);
drop function if exists public.hybrid_search_restaurants(text, vector, float, int);
drop function if exists public.hybrid_search_restaurants(text, vector(768), int);
drop function if exists public.hybrid_search_restaurants(text, vector, int);

create or replace function public.hybrid_search_restaurants(
  search_query text,
  query_embedding extensions.vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  name text,
  location text,
  address text,
  additional_addresses text[],
  description text,
  keywords text[],
  best_of_2026 boolean,
  best_of_2025 boolean,
  best_of_2024 boolean,
  best_of_2023 boolean,
  best_of_2022 boolean,
  best_of_2021 boolean,
  status curation_status,
  is_reviewed boolean,
  similarity float,
  reviews json,
  google_maps_place_id text,
  business_status text
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
    r.additional_addresses,
    r.description,
    r.keywords,
    r.best_of_2026,
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
          and (rev.status is null or rev.status in ('ACTIVE', 'APPROVED'))
      ),
      '[]'::json
    ) as reviews,
    r.google_maps_place_id,
    r.business_status
  from public.restaurants_1 r
  where
    (
      r.name ilike '%' || search_query || '%'
      or r.location ilike '%' || search_query || '%'
      or r.address ilike '%' || search_query || '%'
      or array_to_string(r.additional_addresses, ' ') ilike '%' || search_query || '%'
      or exists (select 1 from unnest(r.additional_addresses) as addr where search_query ilike '%' || addr || '%')
      or array_to_string(r.keywords, ' ') ilike '%' || search_query || '%'
      or exists (select 1 from unnest(r.keywords) as kw where search_query ilike '%' || kw || '%')
      or 1 - (r.embedding <=> query_embedding) > match_threshold
    )
    and coalesce(r.business_status, 'OPEN') = 'OPEN'
    and r.status in ('ACTIVE', 'APPROVED')
  order by r.embedding <=> query_embedding
  limit match_count;
end;
$$;
