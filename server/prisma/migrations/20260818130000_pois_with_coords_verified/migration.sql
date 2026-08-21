-- Adds is_verified to the POI list function (real column, wasn't surfaced yet).
-- Return shape changed, so the old function must be dropped first.
drop function if exists public.pois_with_coords();

create function public.pois_with_coords()
returns table (id uuid, name text, description text, category text, is_verified boolean, lat double precision, lon double precision)
language sql
stable
as $$
  select id, name, description, category, is_verified, st_y(location::geometry) as lat, st_x(location::geometry) as lon
  from public.pois;
$$;
