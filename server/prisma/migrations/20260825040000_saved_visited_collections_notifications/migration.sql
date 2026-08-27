-- CreateTable user_saved_pois
CREATE TABLE IF NOT EXISTS public.user_saved_pois (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poi_id UUID NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_saved_pois_pkey PRIMARY KEY (id)
);

-- CreateTable user_want_to_go
CREATE TABLE IF NOT EXISTS public.user_want_to_go (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poi_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_want_to_go_pkey PRIMARY KEY (id)
);

-- CreateTable user_visited_pois
CREATE TABLE IF NOT EXISTS public.user_visited_pois (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    poi_id UUID NOT NULL,
    trip_id UUID,
    source TEXT NOT NULL DEFAULT 'manual',
    visited_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_visited_pois_pkey PRIMARY KEY (id)
);

-- CreateTable collections
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT collections_pkey PRIMARY KEY (id)
);

-- CreateTable collection_pois
CREATE TABLE IF NOT EXISTS public.collection_pois (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    poi_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT collection_pois_pkey PRIMARY KEY (id)
);

-- CreateTable notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ(6),
    idempotency_key TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Unique & Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS user_saved_pois_user_poi_unique ON public.user_saved_pois(user_id, poi_id);
CREATE INDEX IF NOT EXISTS user_saved_pois_user_created_idx ON public.user_saved_pois(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_want_to_go_user_poi_unique ON public.user_want_to_go(user_id, poi_id);
CREATE INDEX IF NOT EXISTS user_want_to_go_user_created_idx ON public.user_want_to_go(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_visited_pois_user_poi_idx ON public.user_visited_pois(user_id, poi_id);
CREATE INDEX IF NOT EXISTS user_visited_pois_user_visited_idx ON public.user_visited_pois(user_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS collections_user_updated_idx ON public.collections(user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS collection_pois_coll_poi_unique ON public.collection_pois(collection_id, poi_id);
CREATE INDEX IF NOT EXISTS collection_pois_order_idx ON public.collection_pois(collection_id, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_idempotency_unique ON public.notifications(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id, is_read, created_at DESC);

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_saved_pois_user_id_fkey') THEN
        ALTER TABLE public.user_saved_pois ADD CONSTRAINT user_saved_pois_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE public.user_saved_pois ADD CONSTRAINT user_saved_pois_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_want_to_go_user_id_fkey') THEN
        ALTER TABLE public.user_want_to_go ADD CONSTRAINT user_want_to_go_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE public.user_want_to_go ADD CONSTRAINT user_want_to_go_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_visited_pois_user_id_fkey') THEN
        ALTER TABLE public.user_visited_pois ADD CONSTRAINT user_visited_pois_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE public.user_visited_pois ADD CONSTRAINT user_visited_pois_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id) ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE public.user_visited_pois ADD CONSTRAINT user_visited_pois_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collections_user_id_fkey') THEN
        ALTER TABLE public.collections ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_pois_collection_id_fkey') THEN
        ALTER TABLE public.collection_pois ADD CONSTRAINT collection_pois_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE public.collection_pois ADD CONSTRAINT collection_pois_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migrate existing poi_status records to new tables to guarantee zero data loss
INSERT INTO public.user_saved_pois (user_id, poi_id, created_at)
SELECT user_id, poi_id, COALESCE(created_at, NOW())
FROM public.poi_status
WHERE status = 'saved'
ON CONFLICT (user_id, poi_id) DO NOTHING;

INSERT INTO public.user_want_to_go (user_id, poi_id, created_at)
SELECT user_id, poi_id, COALESCE(created_at, NOW())
FROM public.poi_status
WHERE status = 'want_to_go'
ON CONFLICT (user_id, poi_id) DO NOTHING;

INSERT INTO public.user_visited_pois (user_id, poi_id, source, visited_at, created_at)
SELECT user_id, poi_id, 'manual', COALESCE(created_at, NOW()), COALESCE(created_at, NOW())
FROM public.poi_status
WHERE status = 'visited'
ON CONFLICT DO NOTHING;
