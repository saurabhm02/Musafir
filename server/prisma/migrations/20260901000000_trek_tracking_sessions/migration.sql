-- CreateTable trek_sessions
CREATE TABLE IF NOT EXISTS public.trek_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trek_id UUID NOT NULL REFERENCES public.treks(id) ON DELETE CASCADE,
    trek_route_id UUID REFERENCES public.trek_routes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paused_at TIMESTAMPTZ(6),
    resumed_at TIMESTAMPTZ(6),
    completed_at TIMESTAMPTZ(6),
    actual_distance_km DECIMAL DEFAULT 0,
    actual_duration_sec INTEGER DEFAULT 0,
    elevation_gain_m DECIMAL DEFAULT 0,
    elevation_loss_m DECIMAL DEFAULT 0,
    highest_altitude_m DECIMAL,
    lowest_altitude_m DECIMAL,
    points_count INTEGER NOT NULL DEFAULT 0,
    geometry geography(LineString, 4326),
    start_location geography(Point, 4326),
    end_location geography(Point, 4326),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT trek_sessions_pkey PRIMARY KEY (id)
);

-- CreateTable trek_track_points
CREATE TABLE IF NOT EXISTS public.trek_track_points (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.trek_sessions(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    location geography(Point, 4326) NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    timestamp TIMESTAMPTZ(6) NOT NULL,
    sequence INTEGER NOT NULL,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT trek_track_points_pkey PRIMARY KEY (id),
    CONSTRAINT trek_track_points_session_seq_uniq UNIQUE (session_id, sequence)
);

-- AlterTable memories
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS trek_session_id UUID REFERENCES public.trek_sessions(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS trek_sessions_user_status_idx ON public.trek_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS trek_sessions_trek_id_idx ON public.trek_sessions(trek_id);
CREATE INDEX IF NOT EXISTS trek_sessions_geometry_gix ON public.trek_sessions USING GIST (geometry);

CREATE INDEX IF NOT EXISTS trek_track_points_session_ts_idx ON public.trek_track_points(session_id, timestamp);
CREATE INDEX IF NOT EXISTS trek_track_points_location_gix ON public.trek_track_points USING GIST (location);

CREATE INDEX IF NOT EXISTS memories_trek_session_id_idx ON public.memories(trek_session_id);
