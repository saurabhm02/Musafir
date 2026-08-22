import { db } from "../lib/db";

type TripStopWithPoi = {
  id: string;
  day_number: number;
  time_label: string | null;
  note: string | null;
  sort_order: number;
  poi_id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  photo_url: string | null;
};

// Input: nothing (uses the logged-in user)
// Output: every trip the user owns, with a place count and a cover photo
// pulled from its first stop -- used by Home's "Your Trips"/"Continue planning"
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
    placeCount: countByTrip.get(t.id) ?? 0,
    coverPhotoUrl: coverByTrip.get(t.id) ?? null,
  }));
}

export async function createTrip(input: { title: string; destination?: string; dayCount?: number }, userId: string) {
  const trip = await db.trips.create({
    data: { user_id: userId, title: input.title, destination: input.destination, day_count: input.dayCount ?? 1 },
  });
  return trip.id;
}

// Input: a trip id (must belong to the user)
// Output: the trip plus its stops grouped by day, each stop carrying its POI's name/coords/photo
export async function getTrip(tripId: string, userId: string) {
  const trip = await db.trips.findFirst({ where: { id: tripId, user_id: userId } });
  if (!trip) return null;

  const stops = await db.$queryRaw<TripStopWithPoi[]>`
    select
      ts.id, ts.day_number, ts.time_label, ts.note, ts.sort_order, ts.poi_id,
      p.name, p.category, st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
      (select m.photo_url from memories m where m.poi_id = p.id and m.visibility = 'public' order by m.created_at asc limit 1) as photo_url
    from trip_stops ts
    join pois p on p.id = ts.poi_id
    where ts.trip_id = ${tripId}::uuid
    order by ts.day_number asc, ts.sort_order asc
  `;

  const days: Record<number, TripStopWithPoi[]> = {};
  for (let d = 1; d <= trip.day_count; d++) days[d] = [];
  for (const stop of stops) (days[stop.day_number] ??= []).push(stop);

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    dayCount: trip.day_count,
    status: trip.status,
    days,
  };
}

export async function updateTrip(tripId: string, input: { title?: string; status?: string }, userId: string) {
  const { count } = await db.trips.updateMany({
    where: { id: tripId, user_id: userId },
    data: { ...input, updated_at: undefined },
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
    },
  });
  return stop.id;
}

export async function updateTripStop(
  tripId: string,
  stopId: string,
  input: { dayNumber?: number; timeLabel?: string; note?: string; sortOrder?: number },
  userId: string,
): Promise<void> {
  await assertOwnsTrip(tripId, userId);
  const { count } = await db.trip_stops.updateMany({
    where: { id: stopId, trip_id: tripId },
    data: { day_number: input.dayNumber, time_label: input.timeLabel, note: input.note, sort_order: input.sortOrder },
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

// Input: a trip + day (must belong to the user)
// Output: that day's stop ids, reordered greedily by nearest-neighbor distance
// ponytail: greedy nearest-neighbor, not a true TSP solve. Good enough for a
// handful of stops in one day; revisit with a real solver if days grow large.
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
