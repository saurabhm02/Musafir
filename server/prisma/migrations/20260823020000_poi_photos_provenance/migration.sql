-- Real photo enrichment pipeline (Wikimedia Commons/Wikipedia/Mapillary) needs
-- full provenance per photo, not just a URL + attribution string. `url` keeps
-- meaning "the image URL the app should display" (now our S3/CDN copy once a
-- photo is downloaded+verified+re-hosted); the new columns preserve exactly
-- where it came from and under what license, so attribution is always
-- reconstructable and nothing here is ever presented as ours.
alter table public.poi_photos
  add column original_url text,
  add column source_page text,
  add column author text,
  add column license text,
  add column width int,
  add column height int,
  add column confidence text not null default 'unverified' check (confidence in ('high', 'medium', 'low', 'unverified')),
  add column updated_at timestamptz not null default now();
