-- PostgREST can't turn a geography column into plain lat/lon on its own,
-- so this function does the ST_X/ST_Y extraction once, in the database.
create function public.pois_with_coords()
returns table (id uuid, name text, description text, category text, lat double precision, lon double precision)
language sql
stable
as $$
  select id, name, description, category, st_y(location::geometry) as lat, st_x(location::geometry) as lon
  from public.pois;
$$;
