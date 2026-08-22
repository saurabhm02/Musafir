-- General POI facts that aren't trek-specific and aren't on `pois` itself
-- (city/country/opening_hours/website/entry_fee/estimated_visit_duration).
-- Applies to every POI category. Kept separate from `poi_metadata` (which
-- stays trek/trail/viewpoint-specific: difficulty, distance, elevation, etc)
-- and from `poi_photos`/`poi_routes` -- one table per enrichment aspect,
-- matching this codebase's existing split.

create table public.poi_details (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null unique references public.pois(id) on delete cascade,
  city text,
  country text,
  opening_hours text,
  website text,
  entry_fee text,
  estimated_visit_duration_minutes int,
  source text not null,
  confidence text not null default 'unverified' check (confidence in ('high', 'medium', 'low', 'unverified')),
  updated_at timestamptz not null default now()
);
