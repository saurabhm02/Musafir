-- Input: a newly searched route's line (as GeoJSON), plus its stats
-- Output: how many 500m pieces of it were already mapped by an earlier route
-- Cuts the route into 500m pieces. For each piece, checks 5 sample points
-- along it against every saved piece from earlier routes within 50m — if
-- 80%+ of those points are close to the same old piece, this piece counts
-- as "already mapped" and its saved place-links carry over to this route.
-- Anything not matched gets saved as a brand new piece, so the next
-- overlapping search has something to match against.
-- ponytail: loops once per 500m chunk (O(route length)), fine at MVP
-- traffic. Rewrite as a set-based query if long routes start feeling slow.
create function public.search_route(
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
    seg_id := null;

    select rs.id into seg_id
    from public.route_segments rs
    where st_dwithin(chunk_geog, rs.polyline, radius_m * 4) -- cheap prefilter
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
      where pr.segment_id = seg_id;
    else
      insert into public.route_segments (route_id, segment_index, polyline, start_coord, end_coord, distance_km)
      values (
        new_route_id, i, chunk_geog,
        st_startpoint(chunk_geom)::geography,
        st_endpoint(chunk_geom)::geography,
        st_length(chunk_geog) / 1000
      );
    end if;
  end loop;

  return query select matched_count;
end;
$$;
