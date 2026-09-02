import { db } from "../../lib/db";
import type { TransitCorridor, TransportMode, DataStatus } from "./types";

export interface ITransportProvider {
  name: string;
  mode: TransportMode;
  getCorridors(originHubId: string, destHubId: string): Promise<TransitCorridor[]>;
}

export class RailwayProvider implements ITransportProvider {
  name = "Indian Railways";
  mode: TransportMode = "train";

  async getCorridors(originHubId: string, destHubId: string): Promise<TransitCorridor[]> {
    const raw = await db.$queryRawUnsafe<any[]>(
      `
      SELECT 
        tc.id,
        tc.origin_hub_id as "originHubId",
        tc.dest_hub_id as "destHubId",
        tc.mode,
        tc.operator,
        tc.service_name as "serviceName",
        tc.duration_mins as "durationMins",
        tc.distance_km as "distanceKm",
        tc.estimated_cost_inr as "estimatedCostInr",
        tc.frequency,
        tc.departure_times as "departureTimes",
        tc.booking_url as "bookingUrl",
        tc.data_status as "dataStatus",
        oh.name as "originHubName",
        dh.name as "destHubName"
      FROM transit_corridors tc
      JOIN transport_hubs oh ON oh.id = tc.origin_hub_id
      JOIN transport_hubs dh ON dh.id = tc.dest_hub_id
      WHERE tc.origin_hub_id = $1::uuid
        AND tc.dest_hub_id = $2::uuid
        AND tc.mode = 'train'
    `,
      originHubId,
      destHubId
    );

    return raw.map((r) => ({
      id: r.id,
      originHubId: r.originHubId,
      destHubId: r.destHubId,
      originHubName: r.originHubName,
      destHubName: r.destHubName,
      mode: "train",
      operator: r.operator || "Indian Railways",
      serviceName: r.serviceName,
      durationMins: r.durationMins,
      distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
      estimatedCostInr: r.estimatedCostInr,
      frequency: r.frequency,
      departureTimes: Array.isArray(r.departureTimes) ? r.departureTimes : [],
      bookingUrl: r.bookingUrl || "https://www.irctc.co.in",
      dataStatus: (r.dataStatus as DataStatus) || "scheduled",
    }));
  }
}

export class BusProvider implements ITransportProvider {
  name = "Interstate & State Transport";
  mode: TransportMode = "bus";

  async getCorridors(originHubId: string, destHubId: string): Promise<TransitCorridor[]> {
    const raw = await db.$queryRawUnsafe<any[]>(
      `
      SELECT 
        tc.id,
        tc.origin_hub_id as "originHubId",
        tc.dest_hub_id as "destHubId",
        tc.mode,
        tc.operator,
        tc.service_name as "serviceName",
        tc.duration_mins as "durationMins",
        tc.distance_km as "distanceKm",
        tc.estimated_cost_inr as "estimatedCostInr",
        tc.frequency,
        tc.departure_times as "departureTimes",
        tc.booking_url as "bookingUrl",
        tc.data_status as "dataStatus",
        oh.name as "originHubName",
        dh.name as "destHubName"
      FROM transit_corridors tc
      JOIN transport_hubs oh ON oh.id = tc.origin_hub_id
      JOIN transport_hubs dh ON dh.id = tc.dest_hub_id
      WHERE tc.origin_hub_id = $1::uuid
        AND tc.dest_hub_id = $2::uuid
        AND tc.mode IN ('bus', 'local_transit')
    `,
      originHubId,
      destHubId
    );

    return raw.map((r) => ({
      id: r.id,
      originHubId: r.originHubId,
      destHubId: r.destHubId,
      originHubName: r.originHubName,
      destHubName: r.destHubName,
      mode: (r.mode as TransportMode) || "bus",
      operator: r.operator || "State RTC / Private Volvo",
      serviceName: r.serviceName,
      durationMins: r.durationMins,
      distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
      estimatedCostInr: r.estimatedCostInr,
      frequency: r.frequency,
      departureTimes: Array.isArray(r.departureTimes) ? r.departureTimes : [],
      bookingUrl: r.bookingUrl || "https://www.redbus.in",
      dataStatus: (r.dataStatus as DataStatus) || "scheduled",
    }));
  }
}

export class FlightProvider implements ITransportProvider {
  name = "Domestic Aviation";
  mode: TransportMode = "flight";

  async getCorridors(originHubId: string, destHubId: string): Promise<TransitCorridor[]> {
    const raw = await db.$queryRawUnsafe<any[]>(
      `
      SELECT 
        tc.id,
        tc.origin_hub_id as "originHubId",
        tc.dest_hub_id as "destHubId",
        tc.mode,
        tc.operator,
        tc.service_name as "serviceName",
        tc.duration_mins as "durationMins",
        tc.distance_km as "distanceKm",
        tc.estimated_cost_inr as "estimatedCostInr",
        tc.frequency,
        tc.departure_times as "departureTimes",
        tc.booking_url as "bookingUrl",
        tc.data_status as "dataStatus",
        oh.name as "originHubName",
        dh.name as "destHubName"
      FROM transit_corridors tc
      JOIN transport_hubs oh ON oh.id = tc.origin_hub_id
      JOIN transport_hubs dh ON dh.id = tc.dest_hub_id
      WHERE tc.origin_hub_id = $1::uuid
        AND tc.dest_hub_id = $2::uuid
        AND tc.mode = 'flight'
    `,
      originHubId,
      destHubId
    );

    return raw.map((r) => ({
      id: r.id,
      originHubId: r.originHubId,
      destHubId: r.destHubId,
      originHubName: r.originHubName,
      destHubName: r.destHubName,
      mode: "flight",
      operator: r.operator || "Domestic Airline",
      serviceName: r.serviceName,
      durationMins: r.durationMins,
      distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
      estimatedCostInr: r.estimatedCostInr,
      frequency: r.frequency,
      departureTimes: Array.isArray(r.departureTimes) ? r.departureTimes : [],
      bookingUrl: r.bookingUrl || "https://www.google.com/travel/flights",
      dataStatus: (r.dataStatus as DataStatus) || "scheduled",
    }));
  }
}

export class RoadProvider {
  name = "Road & Local Mountain Transport";

  // Calculates road distance and estimated driving/taxi time
  calculateRoadLeg(
    from: { name: string; lat: number; lon: number },
    to: { name: string; lat: number; lon: number },
    isMountain = false
  ) {
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lon - from.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    const directKm = R * 2 * Math.asin(Math.sqrt(a));

    // Road winding factor (1.3x on plains, 1.55x in mountains)
    const roadKm = Math.round(directKm * (isMountain ? 1.55 : 1.3) * 10) / 10;

    // Average speed (30 km/h in hills, 50 km/h plains)
    const avgSpeed = isMountain ? 28 : 50;
    const durationMins = Math.max(10, Math.round((roadKm / avgSpeed) * 60));

    // Estimated taxi cost (₹18/km plains, ₹25/km hills, minimum ₹150)
    const ratePerKm = isMountain ? 25 : 18;
    const estimatedCostInr = Math.max(150, Math.round(roadKm * ratePerKm));

    return {
      distanceKm: roadKm,
      durationMins,
      estimatedCostInr,
      dataStatus: "estimated" as DataStatus,
    };
  }
}
