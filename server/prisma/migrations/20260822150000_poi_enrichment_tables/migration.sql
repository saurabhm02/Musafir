-- POI enrichment: metadata, photos, and real trail geometry, kept separate
-- from `pois` (the canonical place-identity table) so enrichment can be
-- re-run/expanded per source without touching the identity row.
--
-- Naming note: `poi_routes` (this migration, trek/trail LineString geometry)
-- is a different concept from the existing singular `poi_route` table (which
-- links a POI to a point-to-point search `routes` row for the unrelated
-- "Smart Route Overlap" feature). Kept separate on purpose -- not a typo.

create table public.poi_metadata (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null unique references public.pois(id) on delete cascade,
  difficulty text,
  distance_km numeric,
  duration_hours numeric,
  elevation_gain_m numeric,
  max_elevation_m numeric,
  best_time text,
  starting_point text,
  ending_point text,
  state text,
  district text,
  -- row-level provenance for this metadata bundle (point 8: source tracking)
  source text not null,
  confidence text not null default 'unverified' check (confidence in ('high', 'medium', 'low', 'unverified')),
  updated_at timestamptz not null default now()
);

create table public.poi_photos (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null references public.pois(id) on delete cascade,
  source text not null,
  source_id text,
  url text not null,
  attribution text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (poi_id, source, source_id)
);

create table public.poi_routes (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null references public.pois(id) on delete cascade,
  route_type text not null default 'hiking',
  geometry geography(linestring, 4326) not null,
  distance_km numeric,
  elevation_gain_m numeric,
  source text not null,
  source_id text,
  confidence text not null default 'unverified' check (confidence in ('high', 'medium', 'low', 'unverified')),
  created_at timestamptz not null default now(),
  unique (poi_id, source, source_id)
);

create index poi_routes_geometry_gix on public.poi_routes using gist (geometry);
create index poi_photos_poi_idx on public.poi_photos (poi_id);
