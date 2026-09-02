import { db } from "../../lib/db";
import type { TransportHub, TransportHubType } from "./types";

export interface HubDiscoveryOptions {
  maxAirports?: number;
  maxJunctions?: number;
  maxLocalStations?: number;
  maxBusTerminals?: number;
}

export async function discoverNearbyOriginHubs(
  lat: number,
  lon: number,
  options: HubDiscoveryOptions = {}
): Promise<TransportHub[]> {
  const maxAirports = options.maxAirports ?? 2;
  const maxJunctions = options.maxJunctions ?? 3;
  const maxLocalStations = options.maxLocalStations ?? 3;
  const maxBus = options.maxBusTerminals ?? 2;

  const sql = `
    WITH ranked_hubs AS (
      SELECT 
        th.id,
        th.name,
        th.hub_type as "hubType",
        th.code,
        th.city,
        th.state,
        th.importance,
        st_y(th.location::geometry) as lat,
        st_x(th.location::geometry) as lon,
        st_distance(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography) / 1000.0 as "distanceKm",
        ROW_NUMBER() OVER (PARTITION BY th.hub_type ORDER BY st_distance(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography) ASC) as rank_in_type
      FROM transport_hubs th
      WHERE (
        (th.hub_type = 'airport' AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 250000))
        OR (th.hub_type = 'railway_junction' AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 120000))
        OR (th.hub_type = 'railway_station' AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 40000))
        OR (th.hub_type = 'bus_terminal' AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 45000))
      )
    )
    SELECT *
    FROM ranked_hubs
    WHERE (
      ("hubType" = 'airport' AND rank_in_type <= $3)
      OR ("hubType" = 'railway_junction' AND rank_in_type <= $4)
      OR ("hubType" = 'railway_station' AND rank_in_type <= $5)
      OR ("hubType" = 'bus_terminal' AND rank_in_type <= $6)
    )
    ORDER BY "distanceKm" ASC
  `;

  const hubs = await db.$queryRawUnsafe<any[]>(
    sql,
    lon,
    lat,
    maxAirports,
    maxJunctions,
    maxLocalStations,
    maxBus
  );

  return hubs.map((h) => ({
    id: h.id,
    name: h.name,
    hubType: h.hubType as TransportHubType,
    code: h.code,
    city: h.city,
    state: h.state,
    lat: Number(h.lat),
    lon: Number(h.lon),
    distanceKm: Number(h.distanceKm.toFixed(1)),
    importance: h.importance,
  }));
}

export async function discoverNearbyDestinationHubs(
  lat: number,
  lon: number
): Promise<TransportHub[]> {
  const sql = `
    SELECT 
      th.id,
      th.name,
      th.hub_type as "hubType",
      th.code,
      th.city,
      th.state,
      th.importance,
      st_y(th.location::geometry) as lat,
      st_x(th.location::geometry) as lon,
      st_distance(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography) / 1000.0 as "distanceKm"
    FROM transport_hubs th
    WHERE (
      (th.hub_type IN ('mountain_hub', 'bus_terminal', 'road_junction') AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 80000))
      OR (th.hub_type = 'airport' AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 150000))
      OR (th.hub_type IN ('railway_junction', 'railway_station') AND st_dwithin(th.location, st_setsrid(st_makepoint($1, $2), 4326)::geography, 300000))
    )
    ORDER BY "distanceKm" ASC
    LIMIT 10
  `;

  const hubs = await db.$queryRawUnsafe<any[]>(sql, lon, lat);

  return hubs.map((h) => ({
    id: h.id,
    name: h.name,
    hubType: h.hubType as TransportHubType,
    code: h.code,
    city: h.city,
    state: h.state,
    lat: Number(h.lat),
    lon: Number(h.lon),
    distanceKm: Number(h.distanceKm.toFixed(1)),
    importance: h.importance,
  }));
}
