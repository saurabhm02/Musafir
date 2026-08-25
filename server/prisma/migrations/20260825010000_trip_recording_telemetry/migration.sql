-- Add trip recording and telemetry fields to trips and trip_stops
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_distance_km numeric,
  ADD COLUMN IF NOT EXISTS actual_duration_min numeric,
  ADD COLUMN IF NOT EXISTS moving_duration_min numeric,
  ADD COLUMN IF NOT EXISTS elevation_gain_m numeric,
  ADD COLUMN IF NOT EXISTS max_speed_kmh numeric,
  ADD COLUMN IF NOT EXISTS avg_speed_kmh numeric,
  ADD COLUMN IF NOT EXISTS recorded_route geography(linestring, 4326),
  ADD COLUMN IF NOT EXISTS start_location geography(point, 4326),
  ADD COLUMN IF NOT EXISTS end_location geography(point, 4326),
  ADD COLUMN IF NOT EXISTS telemetry_s3_key text,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

ALTER TABLE trip_stops
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS departed_at timestamptz;

CREATE INDEX IF NOT EXISTS trips_user_status_idx ON trips (user_id, status);
CREATE INDEX IF NOT EXISTS trips_recorded_route_gix ON trips USING GIST (recorded_route);
