-- CreateTable transport_hubs
CREATE TABLE IF NOT EXISTS public.transport_hubs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    hub_type TEXT NOT NULL,
    code TEXT,
    city TEXT,
    state TEXT,
    location geography(Point, 4326) NOT NULL,
    importance INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transport_hubs_pkey PRIMARY KEY (id)
);

-- CreateTable transit_corridors
CREATE TABLE IF NOT EXISTS public.transit_corridors (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    origin_hub_id UUID NOT NULL REFERENCES public.transport_hubs(id) ON DELETE CASCADE,
    dest_hub_id UUID NOT NULL REFERENCES public.transport_hubs(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    operator TEXT,
    service_name TEXT,
    duration_mins INTEGER NOT NULL,
    distance_km DECIMAL,
    estimated_cost_inr INTEGER NOT NULL DEFAULT 0,
    frequency TEXT DEFAULT 'daily',
    departure_times JSONB NOT NULL DEFAULT '[]'::jsonb,
    booking_url TEXT,
    data_status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transit_corridors_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS transport_hubs_type_idx ON public.transport_hubs(hub_type);
CREATE INDEX IF NOT EXISTS transport_hubs_code_idx ON public.transport_hubs(code);
CREATE INDEX IF NOT EXISTS transport_hubs_location_gix ON public.transport_hubs USING GIST (location);

CREATE INDEX IF NOT EXISTS transit_corridors_od_idx ON public.transit_corridors(origin_hub_id, dest_hub_id);
CREATE INDEX IF NOT EXISTS transit_corridors_mode_idx ON public.transit_corridors(mode);
