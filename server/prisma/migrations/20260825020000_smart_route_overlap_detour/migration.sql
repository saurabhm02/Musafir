-- AlterTable: add bearing_deg to route_segments if not exists
ALTER TABLE public.route_segments ADD COLUMN IF NOT EXISTS bearing_deg smallint;

-- AlterTable: add detour_duration_sec to poi_route if not exists
ALTER TABLE public.poi_route ADD COLUMN IF NOT EXISTS detour_duration_sec integer;

-- Create index on poi_route for fast lookup if not exists
CREATE INDEX IF NOT EXISTS poi_route_poi_id_idx ON public.poi_route(poi_id);

-- Create or replace enhanced smart route overlap function with bearing calculation
CREATE OR REPLACE FUNCTION public.search_route(
  route_geojson text,
  origin text,
  destination text,
  distance_km numeric,
  duration_minutes numeric,
  user_id uuid default null,
  chunk_m numeric default 500,
  radius_m numeric default 50,
  overlap_threshold numeric default 0.8
)
returns table (matched_segment_count int)
language plpgsql
as $$
declare
  route_geom geometry := st_setsrid(st_geomfromgeojson(route_geojson), 4326);
  route_geog geography := route_geom::geography;
  total_len numeric := st_length(route_geog);
  n_chunks int := greatest(1, ceil(total_len / chunk_m)::int);
  new_route_id uuid;
  i int;
  chunk_geom geometry;
  chunk_geog geography;
  seg_id uuid;
  matched_count int := 0;
  p_start geometry;
  p_end geometry;
  calc_bearing int;
begin
  insert into public.routes (origin, destination, origin_coord, destination_coord, polyline, distance_km, duration_minutes, created_by)
  values (
    origin, destination,
    st_startpoint(route_geom)::geography,
    st_endpoint(route_geom)::geography,
    route_geog,
    distance_km, duration_minutes,
    user_id
  )
  returning id into new_route_id;

  for i in 0..n_chunks - 1 loop
    chunk_geom := st_linesubstring(route_geom, i::numeric / n_chunks, (i + 1)::numeric / n_chunks);
    chunk_geog := chunk_geom::geography;
    p_start := st_startpoint(chunk_geom);
    p_end := st_endpoint(chunk_geom);
    calc_bearing := round(degrees(st_azimuth(p_start, p_end)))::int % 360;
    seg_id := null;

    select rs.id into seg_id
    from public.route_segments rs
    where st_dwithin(chunk_geog, rs.polyline, radius_m * 4) -- cheap prefilter
      and (
        rs.bearing_deg is null or
        abs(rs.bearing_deg - calc_bearing) <= 45 or
        abs(abs(rs.bearing_deg - calc_bearing) - 180) <= 45 or
        abs(rs.bearing_deg - calc_bearing) >= 315
      )
      and (
        select count(*) filter (
          where st_dwithin(st_lineinterpolatepoint(chunk_geom, p / 4.0)::geography, rs.polyline, radius_m)
        )
        from generate_series(0, 4) as p
      )::numeric / 5 >= overlap_threshold
    order by st_distance(chunk_geog, rs.polyline)
    limit 1;

    if seg_id is not null then
      matched_count := matched_count + 1;
      insert into public.poi_route (poi_id, route_id, segment_id, is_on_route)
      select pr.poi_id, new_route_id, pr.segment_id, true
      from public.poi_route pr
      where pr.segment_id = seg_id
      on conflict do nothing;
    else
      insert into public.route_segments (route_id, segment_index, polyline, start_coord, end_coord, distance_km, bearing_deg)
      values (
        new_route_id, i, chunk_geog,
        p_start::geography,
        p_end::geography,
        st_length(chunk_geog) / 1000,
        calc_bearing
      );
    end if;
  end loop;

  return query select matched_count;
end;
$$;
