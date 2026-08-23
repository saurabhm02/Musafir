-- poi_details merged into poi_metadata (see 20260823000000_merge_poi_details_into_poi_metadata).
-- Verified before this migration: 1,803 = 1,803 = 1,803 rows across pois/poi_metadata/poi_details,
-- 0 mismatches on all 6 backfilled columns, 0 orphans either direction, no code references
-- poi_details anymore (enrich-pois.ts and services/pois.ts both updated to use poi_metadata only).
drop table public.poi_details;
