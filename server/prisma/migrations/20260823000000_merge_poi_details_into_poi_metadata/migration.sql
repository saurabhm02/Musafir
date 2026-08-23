-- Merge poi_details into poi_metadata (architecture audit, docs/poi-architecture-audit.md
-- section D). One enrichment table per POI instead of two -- there was never a real
-- reason city/country/website/opening_hours/entry_fee/estimated_visit_duration lived
-- separately from state/district/difficulty/distance/etc.
--
-- Schema-only: adds the columns as nullable. Backfill from poi_details happens in a
-- separate, verifiable step (scripts/merge-poi-details.ts) so row counts and NULL
-- differences can be checked before poi_details is dropped.

alter table public.poi_metadata
  add column city text,
  add column country text,
  add column website text,
  add column opening_hours text,
  add column entry_fee text,
  add column estimated_visit_duration_minutes int;
