import { db } from "../lib/db";
import { type SubmitTrekRouteInput, type UpdateTrekRouteInput, badRequest } from "../lib/validate";

export interface RouteListOptions {
  includeUnverified?: boolean;
  userId?: string;
  isAdmin?: boolean;
}

export interface RouteAccessOptions {
  userId?: string;
  isAdmin?: boolean;
}

function formatRouteOutput(r: any) {
  return {
    id: r.id,
    trekId: r.trekId,
    name: r.name,
    routeType: r.routeType,
    distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
    elevationGainM: r.elevationGainM ? Number(r.elevationGainM) : null,
    elevationLossM: r.elevationLossM ? Number(r.elevationLossM) : null,
    minElevationM: r.minElevationM ? Number(r.minElevationM) : null,
    maxElevationM: r.maxElevationM ? Number(r.maxElevationM) : null,
    startPointName: r.startPointName,
    endPointName: r.endPointName,
    geometry: r.geometryGeoJson ? JSON.parse(r.geometryGeoJson) : null,
    startLocation: r.startLocationGeoJson ? JSON.parse(r.startLocationGeoJson) : null,
    endLocation: r.endLocationGeoJson ? JSON.parse(r.endLocationGeoJson) : null,
    waypoints: r.waypoints || [],
    elevationProfile: r.elevationProfile || [],
    source: {
      type: r.sourceType,
      id: r.sourceId,
      url: r.sourceUrl,
      license: r.sourceLicense,
    },
    verificationStatus: r.verificationStatus,
    confidence: r.confidence,
    submittedBy: r.submittedBy,
    verifiedBy: r.verifiedBy,
    verifiedAt: r.verifiedAt,
    rejectionReason: r.rejectionReason,
    isPrimary: r.isPrimary,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * Lists all verified routes for a specific trek.
 * By default, only approved routes (musafir_verified, community_verified) are returned.
 * If the author or admin requests unverified routes, pending submissions are included.
 *
 * @example
 * // 1. Input:
 * const trekId = "7a35cb99-5282-4fa0-8f9f-cf92c20698ba";
 * const options = { includeUnverified: false };
 *
 * // 2. HTTP Request:
 * // GET /treks/7a35cb99-5282-4fa0-8f9f-cf92c20698ba/routes
 *
 * // 3. What the Server returns:
 * [
 *   {
 *     "id": "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
 *     "trekId": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *     "name": "Jalori Pass to Raghupur Fort Trail",
 *     "routeType": "out_and_back",
 *     "distanceKm": 3.5,
 *     "elevationGainM": 340,
 *     "elevationLossM": 20,
 *     "minElevationM": 3120,
 *     "maxElevationM": 3540,
 *     "startPointName": "Jalori Pass Trailhead",
 *     "endPointName": "Raghupur Fort Summit",
 *     "verificationStatus": "musafir_verified",
 *     "confidence": "high",
 *     "isPrimary": true,
 *     "waypoints": [
 *       { "name": "Jalori Pass", "type": "trailhead", "elevationM": 3120 },
 *       { "name": "Raghupur Fort", "type": "summit", "elevationM": 3540 }
 *     ]
 *   }
 * ]
 */
export async function listRoutesForTrek(trekId: string, options: RouteListOptions = {}) {
  // Validate trek exists
  const trekExists = await db.treks.findUnique({ where: { id: trekId }, select: { id: true } });
  if (!trekExists) {
    throw Object.assign(new Error("Trek not found"), { status: 404 });
  }

  let statusSql = "tr.verification_status IN ('musafir_verified', 'community_verified')";
  const params: any[] = [trekId];

  if (options.isAdmin && options.includeUnverified) {
    statusSql = "1=1";
  } else if (options.userId && options.includeUnverified) {
    params.push(options.userId);
    statusSql = `(tr.verification_status IN ('musafir_verified', 'community_verified') OR (tr.submitted_by = $2::uuid AND tr.verification_status = 'pending'))`;
  }

  const sql = `
    SELECT 
      tr.id,
      tr.trek_id as "trekId",
      tr.name,
      tr.route_type as "routeType",
      tr.distance_km as "distanceKm",
      tr.elevation_gain_m as "elevationGainM",
      tr.elevation_loss_m as "elevationLossM",
      tr.min_elevation_m as "minElevationM",
      tr.max_elevation_m as "maxElevationM",
      tr.start_point_name as "startPointName",
      tr.end_point_name as "endPointName",
      st_asgeojson(tr.geometry) as "geometryGeoJson",
      st_asgeojson(tr.start_location) as "startLocationGeoJson",
      st_asgeojson(tr.end_location) as "endLocationGeoJson",
      tr.waypoints,
      tr.elevation_profile as "elevationProfile",
      tr.source_type as "sourceType",
      tr.source_id as "sourceId",
      tr.source_url as "sourceUrl",
      tr.source_license as "sourceLicense",
      tr.verification_status as "verificationStatus",
      tr.confidence,
      tr.submitted_by as "submittedBy",
      tr.verified_by as "verifiedBy",
      tr.verified_at as "verifiedAt",
      tr.rejection_reason as "rejectionReason",
      tr.is_primary as "isPrimary",
      tr.created_at as "createdAt",
      tr.updated_at as "updatedAt"
    FROM trek_routes tr
    WHERE tr.trek_id = $1::uuid
      AND ${statusSql}
    ORDER BY tr.is_primary DESC, tr.created_at ASC
  `;

  const routes = await db.$queryRawUnsafe<any[]>(sql, ...params);
  return routes.map(formatRouteOutput);
}

/**
 * Retrieves full details and GeoJSON coordinate geometry for a single trek route by its ID.
 *
 * @example
 * // 1. Input:
 * const routeId = "c1f7a08b-2401-4ec9-8664-8830768e7ec8";
 *
 * // 2. HTTP Request:
 * // GET /trek-routes/c1f7a08b-2401-4ec9-8664-8830768e7ec8
 *
 * // 3. What the Server returns:
 * {
 *   "id": "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
 *   "name": "Jalori Pass to Raghupur Fort Trail",
 *   "routeType": "out_and_back",
 *   "distanceKm": 3.5,
 *   "elevationGainM": 340,
 *   "geometry": {
 *     "type": "LineString",
 *     "coordinates": [
 *       [77.3780, 31.5348],
 *       [77.3769, 31.5362],
 *       [77.3752, 31.5385]
 *     ]
 *   },
 *   "verificationStatus": "musafir_verified"
 * }
 */
export async function getTrekRouteById(routeId: string, options: RouteAccessOptions = {}) {
  const sql = `
    SELECT 
      tr.id,
      tr.trek_id as "trekId",
      tr.name,
      tr.route_type as "routeType",
      tr.distance_km as "distanceKm",
      tr.elevation_gain_m as "elevationGainM",
      tr.elevation_loss_m as "elevationLossM",
      tr.min_elevation_m as "minElevationM",
      tr.max_elevation_m as "maxElevationM",
      tr.start_point_name as "startPointName",
      tr.end_point_name as "endPointName",
      st_asgeojson(tr.geometry) as "geometryGeoJson",
      st_asgeojson(tr.start_location) as "startLocationGeoJson",
      st_asgeojson(tr.end_location) as "endLocationGeoJson",
      tr.waypoints,
      tr.elevation_profile as "elevationProfile",
      tr.source_type as "sourceType",
      tr.source_id as "sourceId",
      tr.source_url as "sourceUrl",
      tr.source_license as "sourceLicense",
      tr.verification_status as "verificationStatus",
      tr.confidence,
      tr.submitted_by as "submittedBy",
      tr.verified_by as "verifiedBy",
      tr.verified_at as "verifiedAt",
      tr.rejection_reason as "rejectionReason",
      tr.is_primary as "isPrimary",
      tr.created_at as "createdAt",
      tr.updated_at as "updatedAt"
    FROM trek_routes tr
    WHERE tr.id = $1::uuid
    LIMIT 1
  `;

  const routes = await db.$queryRawUnsafe<any[]>(sql, routeId);
  if (routes.length === 0) return null;
  const route = routes[0];

  const isVerified = ["musafir_verified", "community_verified"].includes(route.verificationStatus);
  const isAuthor = options.userId && route.submittedBy && String(options.userId) === String(route.submittedBy);

  // If route is unverified/rejected, only author or admin can view
  if (!isVerified && !isAuthor && !options.isAdmin) {
    throw Object.assign(new Error("Route not found or pending verification"), { status: 404 });
  }

  return formatRouteOutput(route);
}

/**
 * Submits a new community-contributed trail route for a trek in 'pending' moderation status.
 *
 * @example
 * // 1. Input:
 * const trekId = "7a35cb99-5282-4fa0-8f9f-cf92c20698ba";
 * const input: SubmitTrekRouteInput = {
 *   name: "Raghupur Ridge Trail",
 *   routeType: "out_and_back",
 *   coordinates: [
 *     [77.3780, 31.5348],
 *     [77.3765, 31.5370],
 *     [77.3750, 31.5390]
 *   ],
 *   distanceKm: 4.2,
 *   elevationGainM: 410,
 *   startPointName: "Jalori Pass South Gate",
 *   endPointName: "Raghupur Meadow Viewpoint"
 * };
 * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
 *
 * // 2. HTTP Request:
 * // POST /treks/7a35cb99-5282-4fa0-8f9f-cf92c20698ba/routes
 *
 * // 3. What the Server returns:
 * {
 *   "id": "e4f1a23b-55c1-4822-9214-9981bc5ef3d1",
 *   "status": "pending",
 *   "message": "Route submitted for verification"
 * }
 */
export async function createCommunityRoute(trekId: string, input: SubmitTrekRouteInput, userId: string) {
  // Validate trek exists
  const trek = await db.treks.findUnique({ where: { id: trekId } });
  if (!trek) badRequest("Trek not found");

  let geoJsonStr: string | null = null;
  let startPtGeoJson: string | null = null;
  let endPtGeoJson: string | null = null;

  if (input.coordinates && input.coordinates.length >= 2) {
    geoJsonStr = JSON.stringify({
      type: "LineString",
      coordinates: input.coordinates,
    });
    const firstCoord = input.coordinates[0];
    const lastCoord = input.coordinates[input.coordinates.length - 1];
    startPtGeoJson = JSON.stringify({ type: "Point", coordinates: firstCoord });
    endPtGeoJson = JSON.stringify({ type: "Point", coordinates: lastCoord });
  }

  const sql = `
    INSERT INTO trek_routes (
      trek_id,
      name,
      route_type,
      geometry,
      start_location,
      end_location,
      distance_km,
      elevation_gain_m,
      elevation_loss_m,
      min_elevation_m,
      max_elevation_m,
      start_point_name,
      end_point_name,
      waypoints,
      elevation_profile,
      source_type,
      source_id,
      source_url,
      source_license,
      verification_status,
      confidence,
      submitted_by,
      is_primary
    ) VALUES (
      $1::uuid,
      $2,
      $3,
      CASE WHEN $4::text IS NOT NULL THEN st_setsrid(st_geomfromgeojson($4), 4326)::geography ELSE NULL END,
      CASE WHEN $5::text IS NOT NULL THEN st_setsrid(st_geomfromgeojson($5), 4326)::geography ELSE NULL END,
      CASE WHEN $6::text IS NOT NULL THEN st_setsrid(st_geomfromgeojson($6), 4326)::geography ELSE NULL END,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14::jsonb,
      $15::jsonb,
      $16,
      $17,
      $18,
      $19,
      'pending',
      'unverified',
      $20::uuid,
      false
    )
    RETURNING id
  `;

  const inserted = await db.$queryRawUnsafe<any[]>(
    sql,
    trekId,
    input.name,
    input.routeType ?? "out_and_back",
    geoJsonStr,
    startPtGeoJson,
    endPtGeoJson,
    input.distanceKm ?? null,
    input.elevationGainM ?? null,
    input.elevationLossM ?? null,
    input.minElevationM ?? null,
    input.maxElevationM ?? null,
    input.startPointName ?? null,
    input.endPointName ?? null,
    JSON.stringify(input.waypoints || []),
    JSON.stringify(input.elevationProfile || []),
    input.sourceType ?? "community_submitted",
    input.sourceId ?? null,
    input.sourceUrl ?? null,
    input.sourceLicense ?? "CC-BY-SA 4.0",
    userId
  );

  return inserted[0].id;
}

export async function updateCommunityRoute(routeId: string, input: UpdateTrekRouteInput, userId: string, isAdmin = false) {
  const existing = await db.trek_routes.findUnique({ where: { id: routeId } });
  if (!existing) {
    throw Object.assign(new Error("Route not found"), { status: 404 });
  }

  // Security: Verified routes cannot be edited by regular users
  if (!isAdmin && ["musafir_verified", "community_verified"].includes(existing.verification_status)) {
    throw Object.assign(new Error("Verified routes cannot be edited. Submit a new route or request changes from admin."), { status: 403 });
  }

  // Security: Normal users can only edit their own pending submissions
  if (!isAdmin && existing.submitted_by !== userId) {
    throw Object.assign(new Error("You can only edit your own submissions"), { status: 403 });
  }

  if (input.coordinates && input.coordinates.length >= 2) {
    const geoJsonStr = JSON.stringify({
      type: "LineString",
      coordinates: input.coordinates,
    });
    const firstCoord = input.coordinates[0];
    const lastCoord = input.coordinates[input.coordinates.length - 1];
    const startPtGeoJson = JSON.stringify({ type: "Point", coordinates: firstCoord });
    const endPtGeoJson = JSON.stringify({ type: "Point", coordinates: lastCoord });

    await db.$executeRaw`
      UPDATE trek_routes SET
        name = COALESCE(${input.name ?? null}, name),
        route_type = COALESCE(${input.routeType ?? null}, route_type),
        geometry = st_setsrid(st_geomfromgeojson(${geoJsonStr}), 4326)::geography,
        start_location = st_setsrid(st_geomfromgeojson(${startPtGeoJson}), 4326)::geography,
        end_location = st_setsrid(st_geomfromgeojson(${endPtGeoJson}), 4326)::geography,
        distance_km = COALESCE(${input.distanceKm ?? null}, distance_km),
        elevation_gain_m = COALESCE(${input.elevationGainM ?? null}, elevation_gain_m),
        elevation_loss_m = COALESCE(${input.elevationLossM ?? null}, elevation_loss_m),
        min_elevation_m = COALESCE(${input.minElevationM ?? null}, min_elevation_m),
        max_elevation_m = COALESCE(${input.maxElevationM ?? null}, max_elevation_m),
        start_point_name = COALESCE(${input.startPointName ?? null}, start_point_name),
        end_point_name = COALESCE(${input.endPointName ?? null}, end_point_name),
        waypoints = CASE WHEN ${input.waypoints ? JSON.stringify(input.waypoints) : null} IS NOT NULL THEN ${JSON.stringify(input.waypoints || [])}::jsonb ELSE waypoints END,
        elevation_profile = CASE WHEN ${input.elevationProfile ? JSON.stringify(input.elevationProfile) : null} IS NOT NULL THEN ${JSON.stringify(input.elevationProfile || [])}::jsonb ELSE elevation_profile END,
        source_url = COALESCE(${input.sourceUrl ?? null}, source_url),
        updated_at = now()
      WHERE id = ${routeId}::uuid
    `;
  } else {
    const updateData: any = { updated_at: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.routeType !== undefined) updateData.route_type = input.routeType;
    if (input.distanceKm !== undefined) updateData.distance_km = input.distanceKm;
    if (input.elevationGainM !== undefined) updateData.elevation_gain_m = input.elevationGainM;
    if (input.elevationLossM !== undefined) updateData.elevation_loss_m = input.elevationLossM;
    if (input.minElevationM !== undefined) updateData.min_elevation_m = input.minElevationM;
    if (input.maxElevationM !== undefined) updateData.max_elevation_m = input.maxElevationM;
    if (input.startPointName !== undefined) updateData.start_point_name = input.startPointName;
    if (input.endPointName !== undefined) updateData.end_point_name = input.endPointName;
    if (input.waypoints !== undefined) updateData.waypoints = input.waypoints;
    if (input.elevationProfile !== undefined) updateData.elevation_profile = input.elevationProfile;
    if (input.sourceUrl !== undefined) updateData.source_url = input.sourceUrl;

    await db.trek_routes.update({
      where: { id: routeId },
      data: updateData,
    });
  }

  return { success: true };
}

export async function deleteTrekRoute(routeId: string, userId: string, isAdmin = false) {
  const existing = await db.trek_routes.findUnique({ where: { id: routeId } });
  if (!existing) {
    throw Object.assign(new Error("Route not found"), { status: 404 });
  }

  // Security: Normal users can only delete their own pending submissions
  if (!isAdmin) {
    if (existing.submitted_by !== userId) {
      throw Object.assign(new Error("You can only delete your own submissions"), { status: 403 });
    }
    if (["musafir_verified", "community_verified"].includes(existing.verification_status)) {
      throw Object.assign(new Error("Verified routes cannot be deleted by users"), { status: 403 });
    }
  }

  await db.trek_routes.delete({ where: { id: routeId } });
  return { success: true };
}

export async function listPendingTrekRoutes(limit = 50, offset = 0) {
  const sql = `
    SELECT 
      tr.id,
      tr.trek_id as "trekId",
      t.name as "trekName",
      tr.name,
      tr.route_type as "routeType",
      tr.distance_km as "distanceKm",
      tr.elevation_gain_m as "elevationGainM",
      tr.elevation_loss_m as "elevationLossM",
      tr.min_elevation_m as "minElevationM",
      tr.max_elevation_m as "maxElevationM",
      tr.start_point_name as "startPointName",
      tr.end_point_name as "endPointName",
      st_asgeojson(tr.geometry) as "geometryGeoJson",
      tr.waypoints,
      tr.elevation_profile as "elevationProfile",
      tr.source_type as "sourceType",
      tr.source_id as "sourceId",
      tr.source_url as "sourceUrl",
      tr.source_license as "sourceLicense",
      tr.verification_status as "verificationStatus",
      tr.confidence,
      tr.submitted_by as "submittedBy",
      u.email as "submitterEmail",
      u.full_name as "submitterName",
      tr.created_at as "createdAt"
    FROM trek_routes tr
    JOIN treks t ON t.id = tr.trek_id
    LEFT JOIN users u ON u.id = tr.submitted_by
    WHERE tr.verification_status = 'pending'
    ORDER BY tr.created_at ASC
    LIMIT $1 OFFSET $2
  `;

  const routes = await db.$queryRawUnsafe<any[]>(sql, limit, offset);

  return routes.map(r => ({
    id: r.id,
    trekId: r.trekId,
    trekName: r.trekName,
    name: r.name,
    routeType: r.routeType,
    distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
    elevationGainM: r.elevationGainM ? Number(r.elevationGainM) : null,
    elevationLossM: r.elevationLossM ? Number(r.elevationLossM) : null,
    minElevationM: r.minElevationM ? Number(r.minElevationM) : null,
    maxElevationM: r.maxElevationM ? Number(r.maxElevationM) : null,
    startPointName: r.startPointName,
    endPointName: r.endPointName,
    geometry: r.geometryGeoJson ? JSON.parse(r.geometryGeoJson) : null,
    waypoints: r.waypoints || [],
    elevationProfile: r.elevationProfile || [],
    source: {
      type: r.sourceType,
      id: r.sourceId,
      url: r.sourceUrl,
      license: r.sourceLicense,
    },
    verificationStatus: r.verificationStatus,
    confidence: r.confidence,
    submitter: r.submittedBy ? {
      id: r.submittedBy,
      email: r.submitterEmail,
      name: r.submitterName,
    } : null,
    createdAt: r.createdAt,
  }));
}

/**
 * Approves a pending community route and marks it verified (musafir_verified or community_verified).
 *
 * @example
 * // 1. Input:
 * const routeId = "e4f1a23b-55c1-4822-9214-9981bc5ef3d1";
 * const adminUserId = "00000000-0000-0000-0000-000000000001";
 * const options = {
 *   verificationStatus: "musafir_verified",
 *   confidence: "high",
 *   isPrimary: true
 * };
 *
 * // 2. HTTP Request:
 * // POST /admin/trek-routes/e4f1a23b-55c1-4822-9214-9981bc5ef3d1/verify
 *
 * // 3. What the Server returns:
 * {
 *   "id": "e4f1a23b-55c1-4822-9214-9981bc5ef3d1",
 *   "trekId": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *   "verificationStatus": "musafir_verified",
 *   "confidence": "high",
 *   "isPrimary": true,
 *   "verifiedAt": "2026-09-02T10:00:00.000Z"
 * }
 */
export async function verifyTrekRoute(
  routeId: string,
  adminUserId: string,
  options: {
    verificationStatus?: "musafir_verified" | "community_verified";
    confidence?: string;
    isPrimary?: boolean;
  } = {}
) {
  const existing = await db.trek_routes.findUnique({ where: { id: routeId } });
  if (!existing) {
    throw Object.assign(new Error("Route not found"), { status: 404 });
  }

  const verificationStatus = options.verificationStatus || "musafir_verified";
  const confidence = options.confidence || "high";
  const isPrimary = options.isPrimary ?? false;

  // If this route is marked as primary, unmark other routes of this trek
  if (isPrimary) {
    await db.trek_routes.updateMany({
      where: { trek_id: existing.trek_id },
      data: { is_primary: false },
    });
  }

  const updated = await db.trek_routes.update({
    where: { id: routeId },
    data: {
      verification_status: verificationStatus,
      confidence,
      is_primary: isPrimary,
      verified_by: adminUserId,
      verified_at: new Date(),
      rejection_reason: null,
    },
  });

  return {
    id: updated.id,
    trekId: updated.trek_id,
    verificationStatus: updated.verification_status,
    confidence: updated.confidence,
    isPrimary: updated.is_primary,
    verifiedAt: updated.verified_at,
  };
}

/**
 * Rejects a submitted trek route with a clear explanation reason for the contributor.
 *
 * @example
 * // 1. Input:
 * const routeId = "e4f1a23b-55c1-4822-9214-9981bc5ef3d1";
 * const adminUserId = "00000000-0000-0000-0000-000000000001";
 * const rejectionReason = "Coordinates go through private restricted forest sanctuary.";
 *
 * // 2. HTTP Request:
 * // POST /admin/trek-routes/e4f1a23b-55c1-4822-9214-9981bc5ef3d1/reject
 *
 * // 3. What the Server returns:
 * {
 *   "id": "e4f1a23b-55c1-4822-9214-9981bc5ef3d1",
 *   "trekId": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *   "verificationStatus": "rejected",
 *   "rejectionReason": "Coordinates go through private restricted forest sanctuary.",
 *   "verifiedAt": "2026-09-02T10:00:00.000Z"
 * }
 */
export async function rejectTrekRoute(routeId: string, adminUserId: string, rejectionReason: string) {
  const existing = await db.trek_routes.findUnique({ where: { id: routeId } });
  if (!existing) {
    throw Object.assign(new Error("Route not found"), { status: 404 });
  }

  const updated = await db.trek_routes.update({
    where: { id: routeId },
    data: {
      verification_status: "rejected",
      rejection_reason: rejectionReason,
      is_primary: false,
      verified_by: adminUserId,
      verified_at: new Date(),
    },
  });

  return {
    id: updated.id,
    trekId: updated.trek_id,
    verificationStatus: updated.verification_status,
    rejectionReason: updated.rejection_reason,
    verifiedAt: updated.verified_at,
  };
}
