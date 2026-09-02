import { db } from "../lib/db";
const prisma = db;

export interface TrackPointInput {
  lat: number;
  lon: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string | Date;
  sequence: number;
  isPaused?: boolean;
}

export interface TrekSessionStats {
  actualDistanceKm: number;
  actualDurationSec: number;
  elevationGainM: number;
  elevationLossM: number;
  highestAltitudeM: number | null;
  lowestAltitudeM: number | null;
  pointsCount: number;
}

/**
 * Validates coordinate limits
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

/**
 * Haversine formula for fast distance calculations in meters
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Filter and sanitize incoming GPS track points
 */
export function filterGPSPoints(
  points: TrackPointInput[],
  lastKnownPoint?: { lat: number; lon: number; timestamp: Date; altitude?: number | null } | null
): TrackPointInput[] {
  const sanitized: TrackPointInput[] = [];
  let prev = lastKnownPoint;

  for (const pt of points) {
    // 1. Basic coordinate sanity
    if (!isValidCoordinate(pt.lat, pt.lon)) {
      continue;
    }

    // 2. Accuracy check (reject poor accuracy > 65 meters if accuracy is provided)
    if (typeof pt.accuracy === "number" && (pt.accuracy > 65 || pt.accuracy < 0)) {
      continue;
    }

    // 3. Jump & Speed check
    const ptDate = new Date(pt.timestamp);
    if (isNaN(ptDate.getTime())) {
      continue;
    }

    if (prev) {
      const dtSec = Math.max(0.1, (ptDate.getTime() - new Date(prev.timestamp).getTime()) / 1000);
      const distM = haversineMeters(prev.lat, prev.lon, pt.lat, pt.lon);

      // Trekking / transit speed threshold: jump > 250m in < 3s (speed > 125 km/h / 35 m/s)
      if (distM / dtSec > 35.0 && distM > 250) {
        continue;
      }
    }

    sanitized.push(pt);
    prev = {
      lat: pt.lat,
      lon: pt.lon,
      timestamp: ptDate,
      altitude: pt.altitude,
    };
  }

  return sanitized;
}

/**
 * Calculate authoritative trek stats from an ordered list of track points
 */
export function computeSessionStatsFromPoints(
  points: Array<{
    lat: number;
    lon: number;
    altitude: number | null;
    timestamp: Date;
    is_paused: boolean;
  }>
): TrekSessionStats {
  if (!points || points.length === 0) {
    return {
      actualDistanceKm: 0,
      actualDurationSec: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      highestAltitudeM: null,
      lowestAltitudeM: null,
      pointsCount: 0,
    };
  }

  let totalDistanceM = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let highestAltitude: number | null = null;
  let lowestAltitude: number | null = null;
  let activeDurationSec = 0;

  for (let i = 0; i < points.length; i++) {
    const curr = points[i]!;

    // Altitude bounds
    if (curr.altitude != null && !isNaN(curr.altitude)) {
      if (highestAltitude === null || curr.altitude > highestAltitude) {
        highestAltitude = curr.altitude;
      }
      if (lowestAltitude === null || curr.altitude < lowestAltitude) {
        lowestAltitude = curr.altitude;
      }
    }

    if (i > 0) {
      const prev = points[i - 1]!;

      // Time difference if neither point is paused
      const dt = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      if (!curr.is_paused && !prev.is_paused && dt > 0 && dt < 1800) {
        activeDurationSec += dt;
      }

      // Distance if not paused
      if (!curr.is_paused) {
        const stepDistM = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
        totalDistanceM += stepDistM;
      }

      // Elevation delta with noise threshold >= 2.0m
      if (curr.altitude != null && prev.altitude != null && !curr.is_paused) {
        const dAlt = curr.altitude - prev.altitude;
        if (dAlt >= 2.0) {
          elevationGainM += dAlt;
        } else if (dAlt <= -2.0) {
          elevationLossM += Math.abs(dAlt);
        }
      }
    }
  }

  return {
    actualDistanceKm: Math.round((totalDistanceM / 1000) * 100) / 100,
    actualDurationSec: Math.round(activeDurationSec),
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM),
    highestAltitudeM: highestAltitude ? Math.round(highestAltitude) : null,
    lowestAltitudeM: lowestAltitude ? Math.round(lowestAltitude) : null,
    pointsCount: points.length,
  };
}

/**
 * Service methods for Trek Tracking
 */
export const TrekTrackingService = {
  /**
   * Initializes a live trek tracking session for an authenticated traveler,
   * setting status to 'active' and recording the initial Point 0.
   *
   * @example
   * // 1. Input:
   * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
   * const data = {
   *   trekId: "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
   *   trekRouteId: "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
   *   startLat: 31.5348,
   *   startLon: 77.3780
   * };
   *
   * // 2. HTTP Request:
   * // POST /trek-sessions
   * // Body: { "trekId": "7a35cb99...", "trekRouteId": "c1f7a08b...", "startLat": 31.5348, "startLon": 77.3780 }
   *
   * // 3. What the Server returns:
   * {
   *   "id": " sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
   *   "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
   *   "trekId": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
   *   "status": "active",
   *   "startedAt": "2026-09-02T10:00:00.000Z",
   *   "actualDistanceKm": 0,
   *   "actualDurationSec": 0,
   *   "elevationGainM": 0,
   *   "pointsCount": 1
   * }
   */
  async startSession(
    userId: string,
    data: {
      trekId: string;
      trekRouteId?: string | null;
      startLat?: number | null;
      startLon?: number | null;
      metadata?: Record<string, any>;
    }
  ) {
    // 1. Verify trek exists
    const trek = await prisma.treks.findUnique({
      where: { id: data.trekId },
      include: { pois: true },
    });

    if (!trek) {
      throw new Error(`Trek not found with ID: ${data.trekId}`);
    }

    // 2. Pause any existing active sessions for this user to avoid conflicts
    await prisma.$executeRaw`
      UPDATE trek_sessions
      SET status = 'paused', paused_at = NOW()
      WHERE user_id = ${userId}::uuid AND status = 'active'
    `;

    // 3. Create new trek session
    const insertedRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO trek_sessions (
        user_id,
        trek_id,
        trek_route_id,
        status,
        started_at,
        metadata
      ) VALUES (
        ${userId}::uuid,
        ${data.trekId}::uuid,
        ${data.trekRouteId || null}::uuid,
        'active',
        NOW(),
        ${JSON.stringify(data.metadata || {})}::jsonb
      )
      RETURNING id;
    `;

    const sessionId = insertedRows[0]?.id;
    if (!sessionId) {
      throw new Error("Failed to create trek session");
    }

    // 4. If initial start location is provided, record it as point 0
    if (
      typeof data.startLat === "number" &&
      typeof data.startLon === "number" &&
      isValidCoordinate(data.startLat, data.startLon)
    ) {
      await prisma.$executeRaw`
        INSERT INTO trek_track_points (
          session_id,
          lat,
          lon,
          location,
          timestamp,
          sequence,
          is_paused
        ) VALUES (
          ${sessionId}::uuid,
          ${data.startLat},
          ${data.startLon},
          ST_SetSRID(ST_MakePoint(${data.startLon}, ${data.startLat}), 4326)::geography,
          NOW(),
          0,
          false
        )
        ON CONFLICT (session_id, sequence) DO NOTHING;
      `;
      await this.refreshSessionStats(sessionId);
    }

    return this.getSession(userId, sessionId);
  },

  /**
   * Ingests a batch of raw GPS fixes from the phone, filters satellite noise,
   * stores points with sequence numbers, and calculates live distance & ascent.
   *
   * @example
   * // 1. Input:
   * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
   * const sessionId = "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10";
   * const points: TrackPointInput[] = [
   *   { lat: 31.5348, lon: 77.3780, altitude: 3120, sequence: 1, timestamp: "2026-09-02T10:00:10Z" },
   *   { lat: 31.5362, lon: 77.3769, altitude: 3150, sequence: 2, timestamp: "2026-09-02T10:00:20Z" }
   * ];
   *
   * // 2. HTTP Request:
   * // POST /trek-sessions/sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10/points
   * // Body: { "points": [ ... ] }
   *
   * // 3. What the Server returns:
   * {
   *   "id": "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
   *   "status": "active",
   *   "actualDistanceKm": 0.45,
   *   "actualDurationSec": 120,
   *   "elevationGainM": 30,
   *   "highestAltitudeM": 3150,
   *   "pointsCount": 3
   * }
   */
  async recordPoints(userId: string, sessionId: string, points: TrackPointInput[]) {
    // 1. Verify session exists and belongs to user
    const session = await prisma.trek_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Trek session not found");
    }

    if (session.user_id !== userId) {
      throw new Error("Unauthorized access to trek session");
    }

    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error(`Cannot record points to ${session.status} session`);
    }

    if (!points || points.length === 0) {
      return this.getSession(userId, sessionId);
    }

    // 2. Fetch last known point for jump filtering
    const lastPoint = await prisma.trek_track_points.findFirst({
      where: { session_id: sessionId },
      orderBy: { sequence: "desc" },
    });

    const filtered = filterGPSPoints(
      points,
      lastPoint
        ? {
            lat: lastPoint.lat,
            lon: lastPoint.lon,
            timestamp: lastPoint.timestamp,
            altitude: lastPoint.altitude,
          }
        : null
    );

    // 3. Optimized chunked multi-row batch insert
    const CHUNK_SIZE = 50;
    for (let i = 0; i < filtered.length; i += CHUNK_SIZE) {
      const chunk = filtered.slice(i, i + CHUNK_SIZE);
      const valuesSql = chunk
        .map((pt) => {
          const ts = new Date(pt.timestamp).toISOString();
          const isPaused = Boolean(pt.isPaused || session.status === "paused");
          const alt = pt.altitude != null && !isNaN(pt.altitude) ? pt.altitude : "NULL";
          const acc = pt.accuracy != null && !isNaN(pt.accuracy) ? pt.accuracy : "NULL";
          const spd = pt.speed != null && !isNaN(pt.speed) ? pt.speed : "NULL";
          const hdg = pt.heading != null && !isNaN(pt.heading) ? pt.heading : "NULL";
          return `('${sessionId}'::uuid, ${pt.lat}, ${pt.lon}, ST_SetSRID(ST_MakePoint(${pt.lon}, ${pt.lat}), 4326)::geography, ${alt}, ${acc}, ${spd}, ${hdg}, '${ts}'::timestamptz, ${pt.sequence}, ${isPaused})`;
        })
        .join(",\n");

      if (valuesSql) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO trek_track_points (
            session_id,
            lat,
            lon,
            location,
            altitude,
            accuracy,
            speed,
            heading,
            timestamp,
            sequence,
            is_paused
          ) VALUES ${valuesSql}
          ON CONFLICT (session_id, sequence) DO NOTHING;
        `);
      }
    }

    // 4. Update session statistics
    await this.refreshSessionStats(sessionId);

    return this.getSession(userId, sessionId);
  },

  /**
   * Recalculates and updates session stats in database
   */
  async refreshSessionStats(sessionId: string) {
    const points = await prisma.trek_track_points.findMany({
      where: { session_id: sessionId },
      orderBy: { sequence: "asc" },
      select: {
        lat: true,
        lon: true,
        altitude: true,
        timestamp: true,
        is_paused: true,
      },
    });

    const stats = computeSessionStatsFromPoints(points);

    await prisma.trek_sessions.update({
      where: { id: sessionId },
      data: {
        actual_distance_km: stats.actualDistanceKm,
        actual_duration_sec: stats.actualDurationSec,
        elevation_gain_m: stats.elevationGainM,
        elevation_loss_m: stats.elevationLossM,
        highest_altitude_m: stats.highestAltitudeM,
        lowest_altitude_m: stats.lowestAltitudeM,
        points_count: stats.pointsCount,
      },
    });

    return stats;
  },

  /**
   * Pauses the active tracking session (e.g. resting at a tea shop or viewpoint).
   *
   * @example
   * // 1. Input:
   * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
   * const sessionId = "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10";
   *
   * // 2. HTTP Request:
   * // POST /trek-sessions/sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10/pause
   *
   * // 3. What the Server returns:
   * {
   *   "id": "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
   *   "status": "paused",
   *   "pausedAt": "2026-09-02T10:45:00.000Z"
   * }
   */
  async pauseSession(userId: string, sessionId: string) {
    const session = await prisma.trek_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.user_id !== userId) {
      throw new Error("Unauthorized or session not found");
    }

    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error(`Cannot pause ${session.status} session`);
    }

    await prisma.trek_sessions.update({
      where: { id: sessionId },
      data: {
        status: "paused",
        paused_at: new Date(),
      },
    });

    return this.getSession(userId, sessionId);
  },

  /**
   * Resumes a paused tracking session when the traveler starts walking again.
   *
   * @example
   * // 1. Input:
   * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
   * const sessionId = "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10";
   *
   * // 2. HTTP Request:
   * // POST /trek-sessions/sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10/resume
   *
   * // 3. What the Server returns:
   * {
   *   "id": "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
   *   "status": "active",
   *   "resumedAt": "2026-09-02T11:00:00.000Z"
   * }
   */
  async resumeSession(userId: string, sessionId: string) {
    const session = await prisma.trek_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.user_id !== userId) {
      throw new Error("Unauthorized or session not found");
    }

    if (session.status === "completed" || session.status === "cancelled") {
      throw new Error(`Cannot resume ${session.status} session`);
    }

    await prisma.trek_sessions.update({
      where: { id: sessionId },
      data: {
        status: "active",
        resumed_at: new Date(),
      },
    });

    return this.getSession(userId, sessionId);
  },

  /**
   * Completes and finalizes the hike session: creates the final PostGIS LineString geometry,
   * calculates final distance & elevation metrics, and sets status to 'completed'.
   *
   * @example
   * // 1. Input:
   * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
   * const sessionId = "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10";
   *
   * // 2. HTTP Request:
   * // POST /trek-sessions/sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10/complete
   *
   * // 3. What the Server returns:
   * {
   *   "id": "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
   *   "status": "completed",
   *   "completedAt": "2026-09-02T12:30:00.000Z",
   *   "actualDistanceKm": 3.85,
   *   "actualDurationSec": 5400, // 1h 30m
   *   "elevationGainM": 340,
   *   "highestAltitudeM": 3540,
   *   "geometry": { "type": "LineString", "coordinates": [ ... ] }
   * }
   */
  async completeSession(userId: string, sessionId: string) {
    const session = await prisma.trek_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.user_id !== userId) {
      throw new Error("Unauthorized or session not found");
    }

    if (session.status === "completed") {
      return this.getSession(userId, sessionId);
    }

    // Refresh final stats
    await this.refreshSessionStats(sessionId);

    // Build PostGIS LineString geometry from track points
    await prisma.$executeRaw`
      UPDATE trek_sessions
      SET
        status = 'completed',
        completed_at = NOW(),
        geometry = (
          SELECT ST_MakeLine(location::geometry ORDER BY sequence)::geography
          FROM trek_track_points
          WHERE session_id = ${sessionId}::uuid
          HAVING count(*) >= 2
        ),
        start_location = (
          SELECT location
          FROM trek_track_points
          WHERE session_id = ${sessionId}::uuid
          ORDER BY sequence ASC
          LIMIT 1
        ),
        end_location = (
          SELECT location
          FROM trek_track_points
          WHERE session_id = ${sessionId}::uuid
          ORDER BY sequence DESC
          LIMIT 1
        )
      WHERE id = ${sessionId}::uuid;
    `;

    return this.getSession(userId, sessionId);
  },

  /**
   * Recovers in-progress hike session for the user when the app restarts or phone reboots.
   *
   * @example
   * // 1. Input:
   * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
   *
   * // 2. HTTP Request:
   * // GET /trek-sessions/active
   *
   * // 3. What the Server returns:
   * {
   *   "id": "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
   *   "trekName": "Raghupur Fort Trek",
   *   "status": "active",
   *   "actualDistanceKm": 1.8,
   *   "actualDurationSec": 2400,
   *   "points": [ ... ]
   * }
   */
  async getActiveSession(userId: string) {
    const session = await prisma.trek_sessions.findFirst({
      where: {
        user_id: userId,
        status: { in: ["active", "paused"] },
      },
      orderBy: { started_at: "desc" },
    });

    if (!session) return null;
    return this.getSession(userId, session.id);
  },

  /**
   * Get full session details, points & memories
   */
  async getSession(userId: string, sessionId: string) {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT 
        ts.id,
        ts.user_id,
        ts.trek_id,
        ts.trek_route_id,
        ts.status,
        ts.started_at,
        ts.paused_at,
        ts.resumed_at,
        ts.completed_at,
        ts.actual_distance_km,
        ts.actual_duration_sec,
        ts.elevation_gain_m,
        ts.elevation_loss_m,
        ts.highest_altitude_m,
        ts.lowest_altitude_m,
        ts.points_count,
        ST_AsGeoJSON(ts.geometry)::json as geometry,
        ST_AsGeoJSON(ts.start_location)::json as start_location,
        ST_AsGeoJSON(ts.end_location)::json as end_location,
        ST_AsGeoJSON(tr.geometry)::json as route_geometry,
        tr.waypoints as route_waypoints,
        ts.metadata,
        t.slug as trek_slug,
        p.name as trek_name,
        p.category as trek_category,
        tr.name as route_name,
        tr.verification_status as route_verification_status
      FROM trek_sessions ts
      JOIN treks t ON t.id = ts.trek_id
      JOIN pois p ON p.id = t.poi_id
      LEFT JOIN trek_routes tr ON tr.id = ts.trek_route_id
      WHERE ts.id = ${sessionId}::uuid;
    `;

    if (!rows || rows.length === 0) return null;
    const row = rows[0];

    // Authorization check
    if (row.user_id !== userId) {
      throw new Error("Unauthorized access to trek session");
    }

    // Fetch points
    const points = await prisma.$queryRaw<Array<any>>`
      SELECT 
        id,
        lat,
        lon,
        altitude,
        accuracy,
        speed,
        heading,
        timestamp,
        sequence,
        is_paused
      FROM trek_track_points
      WHERE session_id = ${sessionId}::uuid
      ORDER BY sequence ASC;
    `;

    // Fetch attached memories with coordinates
    const rawMemories = await prisma.$queryRaw<Array<any>>`
      SELECT 
        id,
        photo_url,
        thumbnail_url,
        caption,
        visibility,
        taken_at,
        created_at,
        st_y(location::geometry) as lat,
        st_x(location::geometry) as lon
      FROM memories
      WHERE trek_session_id = ${sessionId}::uuid
        AND deleted_at IS NULL
      ORDER BY created_at ASC;
    `;

    const memories = rawMemories.map((m) => ({
      id: m.id,
      photo_url: m.photo_url,
      thumbnail_url: m.thumbnail_url,
      caption: m.caption,
      visibility: m.visibility,
      taken_at: m.taken_at ? new Date(m.taken_at).toISOString() : null,
      created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
      lat: m.lat != null ? Number(m.lat) : null,
      lon: m.lon != null ? Number(m.lon) : null,
    }));

    return {
      id: row.id,
      userId: row.user_id,
      trekId: row.trek_id,
      trekName: row.trek_name,
      trekSlug: row.trek_slug,
      trekRouteId: row.trek_route_id,
      routeName: row.route_name,
      routeVerificationStatus: row.route_verification_status,
      routeGeometry: row.route_geometry,
      routeWaypoints: row.route_waypoints || [],
      status: row.status,
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      resumedAt: row.resumed_at,
      completedAt: row.completed_at,
      actualDistanceKm: Number(row.actual_distance_km || 0),
      actualDurationSec: Number(row.actual_duration_sec || 0),
      elevationGainM: Number(row.elevation_gain_m || 0),
      elevationLossM: Number(row.elevation_loss_m || 0),
      highestAltitudeM: row.highest_altitude_m ? Number(row.highest_altitude_m) : null,
      lowestAltitudeM: row.lowest_altitude_m ? Number(row.lowest_altitude_m) : null,
      pointsCount: Number(row.points_count || 0),
      geometry: row.geometry,
      startLocation: row.start_location,
      endLocation: row.end_location,
      metadata: row.metadata || {},
      points,
      memories,
    };
  },
};
