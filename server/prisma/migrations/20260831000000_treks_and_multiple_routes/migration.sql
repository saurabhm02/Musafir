-- Create treks table (1:1 with pois table for trek category)
CREATE TABLE public.treks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id uuid NOT NULL UNIQUE REFERENCES public.pois(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  region text,
  difficulty text,
  summary text,
  best_months integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX treks_poi_id_idx ON public.treks(poi_id);
CREATE INDEX treks_difficulty_idx ON public.treks(difficulty);

-- Create trek_routes table (1:N with treks, supporting multiple coexisting routes)
CREATE TABLE public.trek_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id uuid NOT NULL REFERENCES public.treks(id) ON DELETE CASCADE,
  name text NOT NULL,
  route_type text NOT NULL DEFAULT 'out_and_back',
  geometry geography(linestring, 4326),
  distance_km numeric,
  elevation_gain_m numeric,
  elevation_loss_m numeric,
  min_elevation_m numeric,
  max_elevation_m numeric,
  start_point_name text,
  end_point_name text,
  start_location geography(point, 4326),
  end_location geography(point, 4326),
  waypoints jsonb NOT NULL DEFAULT '[]',
  elevation_profile jsonb NOT NULL DEFAULT '[]',
  source_type text NOT NULL DEFAULT 'openstreetmap',
  source_id text,
  source_url text,
  source_license text NOT NULL DEFAULT 'ODbL 1.0',
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('musafir_verified', 'community_verified', 'pending', 'rejected')),
  confidence text NOT NULL DEFAULT 'unverified' CHECK (confidence IN ('high', 'medium', 'low', 'unverified')),
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trek_routes_geometry_gix ON public.trek_routes USING gist (geometry);
CREATE INDEX trek_routes_trek_status_idx ON public.trek_routes (trek_id, verification_status);
CREATE INDEX trek_routes_submitted_by_idx ON public.trek_routes (submitted_by);

-- Link memories to treks and specific trek_routes (optional)
ALTER TABLE public.memories ADD COLUMN trek_id uuid REFERENCES public.treks(id) ON DELETE SET NULL;
ALTER TABLE public.memories ADD COLUMN trek_route_id uuid REFERENCES public.trek_routes(id) ON DELETE SET NULL;

CREATE INDEX memories_trek_id_idx ON public.memories (trek_id);
CREATE INDEX memories_trek_route_id_idx ON public.memories (trek_route_id);
