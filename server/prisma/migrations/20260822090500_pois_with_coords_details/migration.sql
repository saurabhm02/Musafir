-- Adds rating/best_time to the POI list function -- Place Details needs
-- these real columns instead of hardcoded mock values.
drop function if exists public.pois_with_coords();

create function public.pois_with_coords()
returns table (
  id uuid, name text, description text, category text, is_verified boolean,
  lat double precision, lon double precision,
  avg_rating numeric, total_ratings int, best_time text
)
language sql
stable
as $$
  select id, name, description, category, is_verified,
    st_y(location::geometry) as lat, st_x(location::geometry) as lon,
    avg_rating, total_ratings, best_time
  from public.pois;
$$;
