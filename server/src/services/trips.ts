import { db } from "../lib/db";
import { uploadObject } from "./storage";

export type TripStopWithPoi = {
  id: string;
  day_number: number;
  time_label: string | null;
  note: string | null;
  sort_order: number;
  status: string;
  arrived_at: string | null;
  departed_at: string | null;
  poi_id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  photo_url: string | null;
};

export type TelemetryPoint = {
  lat: number;
  lon: number;
  alt?: number | null;
  speed?: number | null;
  acc?: number | null;
  t: number;
};

export type TelemetryBatchInput = {
  batchSequence?: number;
  points: TelemetryPoint[];
  currentStats?: {
    distanceKm?: number;
    movingMinutes?: number;
    elevationGainM?: number;
    maxSpeedKmh?: number;
    avgSpeedKmh?: number;
  };
};

export type CompleteTripInput = {
  actualDistanceKm?: number;
  actualDurationMin?: number;
  movingDurationMin?: number;
  elevationGainM?: number;
  maxSpeedKmh?: number;
  avgSpeedKmh?: number;
  points?: [number, number][]; // [lon, lat] coordinates of the journey
  rawTelemetry?: TelemetryPoint[];
};

export async function listTrips(userId: string) {
  const trips = await db.trips.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });
  if (trips.length === 0) return [];

  const stopCounts = await db.trip_stops.groupBy({
    by: ["trip_id"],
    where: { trip_id: { in: trips.map((t) => t.id) } },
    _count: { _all: true },
  });
  const countByTrip = new Map(stopCounts.map((s) => [s.trip_id, s._count._all]));

  const covers = await db.$queryRaw<{ trip_id: string; photo_url: string | null }[]>`
    select distinct on (ts.trip_id) ts.trip_id, m.photo_url
    from trip_stops ts
    left join memories m on m.poi_id = ts.poi_id and m.visibility = 'public'
    where ts.trip_id = any(${trips.map((t) => t.id)}::uuid[])
    order by ts.trip_id, ts.day_number asc, ts.sort_order asc, m.created_at asc
  `;
  const coverByTrip = new Map(covers.map((c) => [c.trip_id, c.photo_url]));

  return trips.map((t) => ({
    id: t.id,
    title: t.title,
    destination: t.destination,
    dayCount: t.day_count,
    status: t.status,
    startedAt: t.started_at ? t.started_at.toISOString() : null,
    completedAt: t.completed_at ? t.completed_at.toISOString() : null,
    actualDistanceKm: t.actual_distance_km ? Number(t.actual_distance_km) : null,
    actualDurationMin: t.actual_duration_min ? Number(t.actual_duration_min) : null,
    placeCount: countByTrip.get(t.id) ?? 0,
    coverPhotoUrl: coverByTrip.get(t.id) ?? null,
  }));
}

export async function createTrip(input: { title: string; destination?: string; dayCount?: number }, userId: string) {
  const trip = await db.trips.create({
    data: {
      user_id: userId,
      title: input.title.trim(),
      destination: input.destination?.trim() || null,
      day_count: input.dayCount ?? 1,
      status: "planned",
    },
  });
  return trip.id;
}

export async function getTrip(tripId: string, userId: string) {
  const trip = await db.trips.findFirst({ where: { id: tripId, user_id: userId } });
  if (!trip) return null;

  // 1. Fetch trip stops with POI details & cover photos
  const stops = await db.$queryRaw<any[]>`
    select
      ts.id, ts.day_number, ts.time_label, ts.note, ts.sort_order, ts.status,
      ts.arrived_at, ts.departed_at, ts.poi_id,
      p.name, p.category, st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
      (select m.photo_url from memories m where m.poi_id = p.id and m.visibility = 'public' order by m.created_at asc limit 1) as photo_url
    from trip_stops ts
    join pois p on p.id = ts.poi_id
    where ts.trip_id = ${tripId}::uuid
    order by ts.day_number asc, ts.sort_order asc
  `;

  // 2. Fetch recorded route geometry as GeoJSON if present
  let recordedRouteGeoJson: any = null;
  const [routeRow] = await db.$queryRaw<{ geojson: string | null }[]>`
    select st_asgeojson(recorded_route::geometry) as geojson
    from trips
    where id = ${tripId}::uuid
  `;
  if (routeRow?.geojson) {
    try {
      recordedRouteGeoJson = JSON.parse(routeRow.geojson);
    } catch {}
  }

  // 3. Fetch user memories tagged to this trip
  const tripMemories = await db.memories.findMany({
    where: { trip_id: tripId, deleted_at: null },
    select: {
      id: true,
      photo_url: true,
      thumbnail_url: true,
      caption: true,
      visibility: true,
      created_at: true,
    },
    orderBy: { created_at: "asc" },
  });

  const days: Record<number, TripStopWithPoi[]> = {};
  for (let d = 1; d <= trip.day_count; d++) days[d] = [];
  for (const stop of stops) {
    (days[stop.day_number] ??= []).push({
      ...stop,
      status: stop.status || "pending",
      arrived_at: stop.arrived_at ? new Date(stop.arrived_at).toISOString() : null,
      departed_at: stop.departed_at ? new Date(stop.departed_at).toISOString() : null,
    });
  }

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    dayCount: trip.day_count,
    status: trip.status,
    startedAt: trip.started_at ? trip.started_at.toISOString() : null,
    completedAt: trip.completed_at ? trip.completed_at.toISOString() : null,
    actualDistanceKm: trip.actual_distance_km ? Number(trip.actual_distance_km) : null,
    actualDurationMin: trip.actual_duration_min ? Number(trip.actual_duration_min) : null,
    movingDurationMin: trip.moving_duration_min ? Number(trip.moving_duration_min) : null,
    elevationGainM: trip.elevation_gain_m ? Number(trip.elevation_gain_m) : null,
    maxSpeedKmh: trip.max_speed_kmh ? Number(trip.max_speed_kmh) : null,
    avgSpeedKmh: trip.avg_speed_kmh ? Number(trip.avg_speed_kmh) : null,
    recordedRoute: recordedRouteGeoJson,
    telemetryS3Key: trip.telemetry_s3_key,
    memories: tripMemories,
    days,
  };
}

export async function updateTrip(tripId: string, input: { title?: string; status?: string }, userId: string) {
  const { count } = await db.trips.updateMany({
    where: { id: tripId, user_id: userId },
    data: { ...input, updated_at: new Date() },
  });
  if (count === 0) throw Object.assign(new Error("trip not found"), { status: 404 });
}

export async function deleteTrip(tripId: string, userId: string) {
  const { count } = await db.trips.deleteMany({ where: { id: tripId, user_id: userId } });
  if (count === 0) throw Object.assign(new Error("trip not found"), { status: 404 });
}

async function assertOwnsTrip(tripId: string, userId: string) {
  const trip = await db.trips.findFirst({ where: { id: tripId, user_id: userId }, select: { id: true } });
  if (!trip) throw Object.assign(new Error("trip not found"), { status: 404 });
}

// Trip State Machine Methods
export async function startTrip(tripId: string, userId: string): Promise<{ id: string; status: string; startedAt: string }> {
  await assertOwnsTrip(tripId, userId);
  const now = new Date();
  await db.trips.update({
    where: { id: tripId },
    data: {
      status: "active",
      started_at: now,
      updated_at: now,
    },
  });
  return { id: tripId, status: "active", startedAt: now.toISOString() };
}

export async function pauseTrip(tripId: string, userId: string): Promise<{ id: string; status: string }> {
  await assertOwnsTrip(tripId, userId);
  await db.trips.update({
    where: { id: tripId },
    data: { status: "paused", updated_at: new Date() },
  });
  return { id: tripId, status: "paused" };
}

export async function resumeTrip(tripId: string, userId: string): Promise<{ id: string; status: string }> {
  await assertOwnsTrip(tripId, userId);
  await db.trips.update({
    where: { id: tripId },
    data: { status: "active", updated_at: new Date() },
  });
  return { id: tripId, status: "active" };
}

export async function ingestTripTelemetry(
  tripId: string,
  userId: string,
  batch: TelemetryBatchInput,
): Promise<{ ok: boolean; visitedStops: string[] }> {
  await assertOwnsTrip(tripId, userId);

  // 1. Update live summary statistics if provided
  if (batch.currentStats) {
    const s = batch.currentStats;
    await db.trips.update({
      where: { id: tripId },
      data: {
        ...(s.distanceKm != null ? { actual_distance_km: s.distanceKm } : {}),
        ...(s.movingMinutes != null ? { moving_duration_min: s.movingMinutes } : {}),
        ...(s.elevationGainM != null ? { elevation_gain_m: s.elevationGainM } : {}),
        ...(s.maxSpeedKmh != null ? { max_speed_kmh: s.maxSpeedKmh } : {}),
        ...(s.avgSpeedKmh != null ? { avg_speed_kmh: s.avgSpeedKmh } : {}),
        updated_at: new Date(),
      },
    });
  }

  // 2. Check for POI proximity arrivals if points provided
  const visitedStops: string[] = [];
  if (batch.points.length > 0) {
    const latestPoint = batch.points[batch.points.length - 1]!;
    const lat = latestPoint.lat;
    const lon = latestPoint.lon;

    // Find pending trip stops within 50 meters
    const nearbyPendingStops = await db.$queryRaw<{ id: string; poi_id: string; name: string }[]>`
      select ts.id, ts.poi_id, p.name
      from trip_stops ts
      join pois p on p.id = ts.poi_id
      where ts.trip_id = ${tripId}::uuid
        and (ts.status is null or ts.status = 'pending')
        and st_dwithin(p.location, st_setsrid(st_makepoint(${lon}, ${lat}), 4326)::geography, 60)
    `;

    for (const stop of nearbyPendingStops) {
      const now = new Date();
      await db.trip_stops.update({
        where: { id: stop.id },
        data: { status: "reached", arrived_at: now },
      });

      // Also mark poi_status visited for the user
      await db.poi_status.upsert({
        where: { user_id_poi_id: { user_id: userId, poi_id: stop.poi_id } },
        create: { user_id: userId, poi_id: stop.poi_id, status: "visited" },
        update: { status: "visited" },
      });

      visitedStops.push(stop.id);
    }
  }

  return { ok: true, visitedStops };
}

export async function updateTripStopStatus(
  tripId: string,
  stopId: string,
  userId: string,
  input: { status: "pending" | "reached" | "skipped" },
): Promise<void> {
  await assertOwnsTrip(tripId, userId);
  const now = new Date();
  await db.trip_stops.update({
    where: { id: stopId },
    data: {
      status: input.status,
      ...(input.status === "reached" ? { arrived_at: now } : {}),
    },
  });
}

export async function completeTrip(
  tripId: string,
  userId: string,
  input: CompleteTripInput,
): Promise<{ id: string; status: string; actualDistanceKm: number; actualDurationMin: number }> {
  await assertOwnsTrip(tripId, userId);

  const trip = await db.trips.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");

  const completedAt = new Date();
  const startedAt = trip.started_at || trip.created_at || new Date(Date.now() - 3600000);
  const calculatedDurationMin = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000));
  const finalDurationMin = input.actualDurationMin ?? calculatedDurationMin;
  const finalDistanceKm = input.actualDistanceKm ?? (trip.actual_distance_km ? Number(trip.actual_distance_km) : 0);

  let telemetryKey: string | null = null;

  // 1. Archive raw telemetry to S3 if provided
  if (input.rawTelemetry && input.rawTelemetry.length > 0) {
    try {
      const telemetryJson = JSON.stringify({
        tripId,
        userId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        stats: {
          distanceKm: finalDistanceKm,
          durationMin: finalDurationMin,
          elevationGainM: input.elevationGainM,
          maxSpeedKmh: input.maxSpeedKmh,
          avgSpeedKmh: input.avgSpeedKmh,
        },
        points: input.rawTelemetry,
      });

      telemetryKey = `trips/${userId}/${tripId}/telemetry.json`;
      await uploadObject(telemetryKey, Buffer.from(telemetryJson, "utf-8"), "application/json");
    } catch (err) {
      console.warn("Failed to archive trip telemetry to S3:", err);
    }
  }

  // 2. Save recorded PostGIS LineString route geometry
  if (input.points && input.points.length >= 2) {
    const geoJsonStr = JSON.stringify({
      type: "LineString",
      coordinates: input.points, // [ [lon, lat], ... ]
    });

    const startPt = input.points[0]!;
    const endPt = input.points[input.points.length - 1]!;

    await db.$executeRaw`
      UPDATE trips
      SET
        status = 'completed',
        completed_at = ${completedAt},
        actual_distance_km = ${finalDistanceKm},
        actual_duration_min = ${finalDurationMin},
        moving_duration_min = ${input.movingDurationMin || finalDurationMin},
        elevation_gain_m = ${input.elevationGainM || 0},
        max_speed_kmh = ${input.maxSpeedKmh || null},
        avg_speed_kmh = ${input.avgSpeedKmh || null},
        telemetry_s3_key = ${telemetryKey},
        recorded_route = st_setsrid(st_geomfromgeojson(${geoJsonStr}), 4326)::geography,
        start_location = st_setsrid(st_makepoint(${startPt[0]}, ${startPt[1]}), 4326)::geography,
        end_location = st_setsrid(st_makepoint(${endPt[0]}, ${endPt[1]}), 4326)::geography,
        updated_at = NOW()
      WHERE id = ${tripId}::uuid
    `;
  } else {
    await db.trips.update({
      where: { id: tripId },
      data: {
        status: "completed",
        completed_at: completedAt,
        actual_distance_km: finalDistanceKm,
        actual_duration_min: finalDurationMin,
        moving_duration_min: input.movingDurationMin || finalDurationMin,
        elevation_gain_m: input.elevationGainM || 0,
        max_speed_kmh: input.maxSpeedKmh || null,
        avg_speed_kmh: input.avgSpeedKmh || null,
        telemetry_s3_key: telemetryKey,
        updated_at: completedAt,
      },
    });
  }

  // 3. Increment aggregate user travel metrics
  await db.$executeRaw`
    UPDATE users
    SET
      total_distance_km = COALESCE(total_distance_km, 0) + ${finalDistanceKm},
      total_trips = COALESCE(total_trips, 0) + 1,
      updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  return {
    id: tripId,
    status: "completed",
    actualDistanceKm: finalDistanceKm,
    actualDurationMin: finalDurationMin,
  };
}

export async function addTripStop(
  tripId: string,
  input: { poiId: string; dayNumber: number; timeLabel?: string; note?: string },
  userId: string,
): Promise<string> {
  await assertOwnsTrip(tripId, userId);
  const maxOrder = await db.trip_stops.aggregate({
    where: { trip_id: tripId, day_number: input.dayNumber },
    _max: { sort_order: true },
  });
  const stop = await db.trip_stops.create({
    data: {
      trip_id: tripId,
      poi_id: input.poiId,
      day_number: input.dayNumber,
      time_label: input.timeLabel,
      note: input.note,
      sort_order: (maxOrder._max.sort_order ?? -1) + 1,
      status: "pending",
    },
  });
  return stop.id;
}

export async function updateTripStop(
  tripId: string,
  stopId: string,
  input: { dayNumber?: number; timeLabel?: string; note?: string; sortOrder?: number; status?: string },
  userId: string,
): Promise<void> {
  await assertOwnsTrip(tripId, userId);
  const { count } = await db.trip_stops.updateMany({
    where: { id: stopId, trip_id: tripId },
    data: {
      day_number: input.dayNumber,
      time_label: input.timeLabel,
      note: input.note,
      sort_order: input.sortOrder,
      status: input.status,
    },
  });
  if (count === 0) throw Object.assign(new Error("stop not found"), { status: 404 });
}

export async function deleteTripStop(tripId: string, stopId: string, userId: string): Promise<void> {
  await assertOwnsTrip(tripId, userId);
  const { count } = await db.trip_stops.deleteMany({ where: { id: stopId, trip_id: tripId } });
  if (count === 0) throw Object.assign(new Error("stop not found"), { status: 404 });
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

export async function optimizeTripDay(tripId: string, dayNumber: number, userId: string): Promise<string[]> {
  await assertOwnsTrip(tripId, userId);
  const stops = await db.$queryRaw<{ id: string; lat: number; lon: number }[]>`
    select ts.id, st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon
    from trip_stops ts
    join pois p on p.id = ts.poi_id
    where ts.trip_id = ${tripId}::uuid and ts.day_number = ${dayNumber}
    order by ts.sort_order asc
  `;
  if (stops.length <= 2) return stops.map((s) => s.id);

  const remaining = [...stops];
  const ordered = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]!;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(last, remaining[i]!);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    ordered.push(remaining.splice(nearestIdx, 1)[0]!);
  }

  await Promise.all(ordered.map((s, i) => db.trip_stops.update({ where: { id: s.id }, data: { sort_order: i } })));
  return ordered.map((s) => s.id);
}
