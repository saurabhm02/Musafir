import { db } from "../../lib/db";
import type { TransportHub, TransportHubType } from "./types";

export interface HubDiscoveryOptions {
  maxAirports?: number;
  maxJunctions?: number;
  maxLocalStations?: number;
  maxBusTerminals?: number;
}

/**
 * Scans PostGIS spatial database to find the nearest transport hubs (airports,
 * major railway junctions, local train stations, bus stands) around the traveler's GPS origin.
 *
 * @example
 * // 1. Input:
 * const lat = 21.3653; // Amgaon GPS
 * const lon = 80.3802;
 *
 * // 2. Internal Call / Query:
 * const hubs = await discoverNearbyOriginHubs(21.3653, 80.3802);
 *
 * // 3. Output Array:
 * [
 *   {
 *     "id": "hub_agn_1",
 *     "name": "Amgaon Railway Station",
 *     "hubType": "railway_station",
 *     "code": "AGN",
 *     "city": "Amgaon",
 *     "distanceKm": 1.2
 *   },
 *   {
 *     "id": "hub_g_1",
 *     "name": "Gondia Junction",
 *     "hubType": "railway_junction",
 *     "code": "G",
 *     "city": "Gondia",
 *     "distanceKm": 24.5
 *   },
 *   {
 *     "id": "hub_nag_1",
 *     "name": "Dr. Babasaheb Ambedkar International Airport",
 *     "hubType": "airport",
 *     "code": "NAG",
 *     "city": "Nagpur",
 *     "distanceKm": 142.0
 *   }
 * ]
 */
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

/**
 * Finds nearby mountain transport hubs (bus stands, taxi unions, mountain transit junctions)
 * around the destination trailhead coordinates.
 *
 * @example
 * // 1. Input:
 * const lat = 31.5348; // Jalori Pass Trailhead
 * const lon = 77.3780;
 *
 * // 2. Internal Call:
 * const destHubs = await discoverNearbyDestinationHubs(31.5348, 77.3780);
 *
 * // 3. Output Array:
 * [
 *   {
 *     "id": "hub_aut_1",
 *     "name": "Aut Tunnel Mountain Transit Hub",
 *     "hubType": "mountain_hub",
 *     "city": "Aut",
 *     "distanceKm": 28.4
 *   },
 *   {
 *     "id": "hub_kuu_1",
 *     "name": "Kullu Bhuntar Airport",
 *     "hubType": "airport",
 *     "code": "KUU",
 *     "city": "Bhuntar",
 *     "distanceKm": 54.0
 *   }
 * ]
 */
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
