-- CreateTable
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER NOT NULL DEFAULT 0,
    target_value INTEGER NOT NULL DEFAULT 1,
    is_notified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_achievements_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_user_badge_unique ON public.user_achievements(user_id, badge_key);
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON public.user_achievements(user_id);

-- Performance Indexes for Profile Aggregations
CREATE INDEX IF NOT EXISTS trips_user_completed_idx ON public.trips(user_id, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS poi_status_user_status_idx ON public.poi_status(user_id, status);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_achievements_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
