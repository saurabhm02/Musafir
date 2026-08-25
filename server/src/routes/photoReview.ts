import { db } from "../lib/db";
import { uploadAsset } from "../services/storage";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CANDIDATES_FILE = join(__dirname, "..", "..", "scripts", "data", "tripadvisor-candidates.json");
const EXTRACTION_STATUS_FILE = join(__dirname, "..", "..", "scripts", "data", "extraction-status.json");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const photoReviewRoutes: Record<string, (req: Request) => Promise<Response> | Response> = {
  // GET /photo-review -> Serves the interactive review dashboard HTML
  "/photo-review": () => {
    const html = getReviewAppHtml();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },

  // GET /api/photo-review/extraction-status -> Returns live extraction progress across DB
  "/api/photo-review/extraction-status": async () => {
    try {
      const totalDb = await db.pois.count();
      let candidatesMap: Record<string, any> = {};
      if (existsSync(CANDIDATES_FILE)) {
        try {
          candidatesMap = JSON.parse(readFileSync(CANDIDATES_FILE, "utf-8"));
        } catch {}
      }
      const withCandidates = Object.keys(candidatesMap).length;

      let statusInfo: any = { isRunning: false };
      if (existsSync(EXTRACTION_STATUS_FILE)) {
        try {
          statusInfo = JSON.parse(readFileSync(EXTRACTION_STATUS_FILE, "utf-8"));
        } catch {}
      }

      const percent = totalDb > 0 ? Math.round((withCandidates / totalDb) * 100) : 100;

      return Response.json({
        isRunning: Boolean(statusInfo.isRunning),
        totalInDb: totalDb,
        withCandidates,
        remaining: Math.max(0, totalDb - withCandidates),
        percent,
        currentPoi: statusInfo.currentPoi || null,
        currentCategory: statusInfo.currentCategory || null,
        updatedAt: statusInfo.updatedAt || new Date().toISOString(),
      });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // GET /api/photo-review/pois -> Returns all POIs merged with DB photos and candidate photos
  "/api/photo-review/pois": async (req: Request) => {
    try {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");
      const state = url.searchParams.get("state");
      const filter = url.searchParams.get("filter"); // 'needs_review', 'has_candidates', 'all'
      const search = url.searchParams.get("search")?.toLowerCase();

      // Read candidates cache
      let candidatesMap: Record<string, any> = {};
      if (existsSync(CANDIDATES_FILE)) {
        try {
          candidatesMap = JSON.parse(readFileSync(CANDIDATES_FILE, "utf-8"));
        } catch (e) {
          console.error("Error reading candidates JSON:", e);
        }
      }

      // Query POIs with their existing DB photos & metadata
      const pois = await db.pois.findMany({
        where: {
          ...(category && category !== "all" ? { category } : {}),
          ...(state && state !== "all"
            ? {
                OR: [
                  { poi_metadata: { state: { equals: state, mode: "insensitive" } } },
                  { address: { contains: state, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          poi_metadata: true,
          poi_photos: {
            select: {
              id: true,
              url: true,
              source: true,
              source_id: true,
              confidence: true,
              author: true,
            },
          },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });

      // Get all unique non-null states
      const allStatesRaw = await db.poi_metadata.findMany({
        where: { state: { not: null } },
        select: { state: true },
        distinct: ["state"],
      });
      const availableStates = allStatesRaw
        .map((s) => s.state)
        .filter((s): s is string => Boolean(s && !["Tibet", "China", "Pakistan"].includes(s)))
        .sort();

      let results = pois.map((p) => {
        const candidateData = candidatesMap[p.id];
        const rawCandidates = candidateData?.candidates || [];
        const candidates = rawCandidates.map((c: any) => ({
          ...c,
          photoUrl: c.originalTemplate
            ? c.originalTemplate.replace("{width}", "720").replace("{height}", "480")
            : (c.photoUrl || "").replace(/w=\d+/, "w=720").replace(/h=\d+/, "h=480"),
        }));

        const resolvedState = p.poi_metadata?.state || (p.address ? p.address.split(",").slice(-3, -1).join(", ").trim() : null);

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          address: p.address,
          state: resolvedState,
          district: p.poi_metadata?.district || null,
          totalPhotos: p.poi_photos.length,
          existingPhotos: p.poi_photos,
          candidates,
          searchedQueries: candidateData?.searchedQueries || [],
          hasCandidates: Boolean(candidates.length),
        };
      });

      if (search) {
        results = results.filter((p) => p.name.toLowerCase().includes(search));
      }

      if (filter === "needs_review") {
        results = results.filter((p) => p.existingPhotos.length === 0 && p.candidates.length > 0);
      } else if (filter === "has_candidates") {
        results = results.filter((p) => p.candidates.length > 0);
      } else if (filter === "no_photos") {
        results = results.filter((p) => p.existingPhotos.length === 0);
      }

      return Response.json({
        total: results.length,
        pois: results,
      });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/save -> Uploads chosen photo(s) to S3 and creates poi_photos row
  "/api/photo-review/save": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as {
        poiId: string;
        photos: {
          photoUrl: string;
          title?: string;
          hierarchy?: string;
          sourceId?: string;
          source?: string;
        }[];
      };

      const { poiId, photos } = body;
      if (!poiId || !Array.isArray(photos) || photos.length === 0) {
        return Response.json({ error: "poiId and photos array are required" }, { status: 400 });
      }

      const poi = await db.pois.findUnique({ where: { id: poiId } });
      if (!poi) {
        return Response.json({ error: "POI not found" }, { status: 404 });
      }

      const storedPhotos = [];

      for (let i = 0; i < photos.length; i++) {
        const item = photos[i]! as any;
        const source = item.source || (item.photoUrl.includes("pinimg.com") ? "pinterest" : "tripadvisor");
        const sourceId = item.sourceId || `${source}-${Date.now()}-${i}`;

        // 1. Download photo bytes
        const res = await fetch(item.photoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Referer: item.photoUrl.includes("pinimg.com") ? "https://www.pinterest.com/" : "https://www.tripadvisor.in/",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
        }

        const bytes = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const s3Path = `poi-photos/${poiId}/${source}-${slugify(sourceId)}-${i}.${ext}`;

        // 2. Upload to S3
        const s3Url = await uploadAsset(s3Path, bytes, contentType);

        // 3. Upsert into DB
        const record = await db.poi_photos.upsert({
          where: {
            poi_id_source_source_id: {
              poi_id: poiId,
              source,
              source_id: sourceId,
            },
          },
          create: {
            poi_id: poiId,
            source,
            source_id: sourceId,
            url: s3Url,
            original_url: item.photoUrl,
            source_page: item.pageUrl || item.hierarchy || null,
            author: source === "pinterest" ? "Pinterest Pin" : source === "tripadvisor" ? "TripAdvisor Community" : "Web",
            confidence: "high",
            metadata: {
              title: item.title,
              hierarchy: item.hierarchy,
              savedVia: "photo-review-ui",
            },
          },
          update: {
            url: s3Url,
            original_url: item.photoUrl,
            source_page: item.pageUrl || item.hierarchy || null,
            confidence: "high",
            updated_at: new Date(),
          },
        });

        storedPhotos.push(record);
      }

      // Update total photos count in POI
      const currentPhotosCount = await db.poi_photos.count({ where: { poi_id: poiId } });
      await db.pois.update({
        where: { id: poiId },
        data: { total_photos: currentPhotosCount },
      });

      return Response.json({
        success: true,
        count: storedPhotos.length,
        storedPhotos,
      });
    } catch (err: any) {
      console.error("Save photo error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/delete-photo -> Deletes a single saved photo from DB
  "/api/photo-review/delete-photo": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as { photoId: string; poiId: string };
      const { photoId, poiId } = body;
      if (!photoId || !poiId) {
        return Response.json({ error: "photoId and poiId are required" }, { status: 400 });
      }

      await db.poi_photos.delete({ where: { id: photoId } });

      const currentPhotosCount = await db.poi_photos.count({ where: { poi_id: poiId } });
      await db.pois.update({
        where: { id: poiId },
        data: { total_photos: currentPhotosCount },
      });

      return Response.json({ success: true, deletedId: photoId, remainingCount: currentPhotosCount });
    } catch (err: any) {
      console.error("Delete photo error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/delete-multiple-photos -> Deletes multiple selected saved photos for a POI
  "/api/photo-review/delete-multiple-photos": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as { photoIds: string[]; poiId: string };
      const { photoIds, poiId } = body;
      if (!Array.isArray(photoIds) || photoIds.length === 0 || !poiId) {
        return Response.json({ error: "photoIds array and poiId are required" }, { status: 400 });
      }

      const res = await db.poi_photos.deleteMany({
        where: {
          id: { in: photoIds },
          poi_id: poiId,
        },
      });

      const currentPhotosCount = await db.poi_photos.count({ where: { poi_id: poiId } });
      await db.pois.update({
        where: { id: poiId },
        data: { total_photos: currentPhotosCount },
      });

      return Response.json({
        success: true,
        deletedCount: res.count,
        remainingCount: currentPhotosCount,
      });
    } catch (err: any) {
      console.error("Delete multiple photos error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/delete-all-poi-photos -> Clears all saved photos for a POI
  "/api/photo-review/delete-all-poi-photos": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as { poiId: string };
      const { poiId } = body;
      if (!poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }

      const res = await db.poi_photos.deleteMany({ where: { poi_id: poiId } });
      await db.pois.update({
        where: { id: poiId },
        data: { total_photos: 0 },
      });

      return Response.json({ success: true, deletedCount: res.count });
    } catch (err: any) {
      console.error("Delete all photos error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/delete-poi -> Deletes a single POI from DB
  "/api/photo-review/delete-poi": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as { poiId: string };
      const { poiId } = body;
      if (!poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }

      await db.pois.delete({ where: { id: poiId } });
      return Response.json({ success: true, deletedId: poiId });
    } catch (err: any) {
      console.error("Delete POI error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/bulk-delete-pois -> Deletes multiple POIs in one batch
  "/api/photo-review/bulk-delete-pois": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as { poiIds: string[] };
      const { poiIds } = body;
      if (!Array.isArray(poiIds) || poiIds.length === 0) {
        return Response.json({ error: "poiIds array is required" }, { status: 400 });
      }

      const res = await db.pois.deleteMany({
        where: {
          id: { in: poiIds },
        },
      });

      return Response.json({ success: true, deletedCount: res.count });
    } catch (err: any) {
      console.error("Bulk Delete POIs error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },

  // POST /api/photo-review/bulk-save -> Saves photos across multiple POIs in batch
  "/api/photo-review/bulk-save": async (req: Request) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = (await req.json()) as {
        items: {
          poiId: string;
          photos: {
            photoUrl: string;
            title?: string;
            hierarchy?: string;
            sourceId?: string;
            source?: string;
          }[];
        }[];
      };

      const { items } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return Response.json({ error: "items array is required" }, { status: 400 });
      }

      let totalSavedPhotos = 0;
      let totalSavedPois = 0;

      for (const item of items) {
        const { poiId, photos } = item;
        if (!poiId || !Array.isArray(photos) || photos.length === 0) continue;

        try {
          for (let i = 0; i < photos.length; i++) {
            const p = photos[i]! as any;
            const source = p.source || (p.photoUrl.includes("pinimg.com") ? "pinterest" : "tripadvisor");
            const sourceId = p.sourceId || `${source}-${Date.now()}-${i}`;

            const res = await fetch(p.photoUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                Referer: p.photoUrl.includes("pinimg.com") ? "https://www.pinterest.com/" : "https://www.tripadvisor.in/",
              },
            });

            if (!res.ok) continue;

            const bytes = await res.arrayBuffer();
            const contentType = res.headers.get("content-type") || "image/jpeg";
            const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
            const s3Path = `poi-photos/${poiId}/${source}-${slugify(sourceId)}-${i}.${ext}`;

            const s3Url = await uploadAsset(s3Path, bytes, contentType);

            await db.poi_photos.upsert({
              where: {
                poi_id_source_source_id: {
                  poi_id: poiId,
                  source,
                  source_id: sourceId,
                },
              },
              create: {
                poi_id: poiId,
                source,
                source_id: sourceId,
                url: s3Url,
                original_url: p.photoUrl,
                source_page: p.pageUrl || p.hierarchy || null,
                author: source === "pinterest" ? "Pinterest Pin" : source === "tripadvisor" ? "TripAdvisor Community" : "Web",
                confidence: "high",
                metadata: {
                  title: p.title,
                  hierarchy: p.hierarchy,
                  savedVia: "bulk-photo-review-ui",
                },
              },
              update: {
                url: s3Url,
                original_url: p.photoUrl,
                source_page: p.pageUrl || p.hierarchy || null,
                confidence: "high",
                updated_at: new Date(),
              },
            });
            totalSavedPhotos++;
          }

          const count = await db.poi_photos.count({ where: { poi_id: poiId } });
          await db.pois.update({ where: { id: poiId }, data: { total_photos: count } });
          totalSavedPois++;
        } catch (e) {
          console.warn(`Error in bulk save for POI ${poiId}:`, e);
        }
      }

      return Response.json({
        success: true,
        savedPois: totalSavedPois,
        savedPhotos: totalSavedPhotos,
      });
    } catch (err: any) {
      console.error("Bulk Save error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
};

function getReviewAppHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Musafir POI Photo Studio & Curation Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0C0D11;
      --card-bg: #15171E;
      --card-border: #232733;
      --accent: #E24E1B;
      --accent-glow: rgba(226, 78, 27, 0.25);
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
      --green: #10B981;
      --red: #EF4444;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px 24px 120px; min-height: 100vh; }
    header { max-width: 1400px; margin: 0 auto 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--card-border); padding-bottom: 20px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .badge-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; font-size: 18px; box-shadow: 0 4px 14px var(--accent-glow); }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .stats-bar { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--text-muted); }
    .stat-pill { background: var(--card-bg); padding: 6px 14px; border-radius: 20px; border: 1px solid var(--card-border); display: flex; gap: 6px; align-items: center; }
    .stat-pill b { color: #fff; }

    .controls { max-width: 1400px; margin: 0 auto 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .search-box { flex: 1; min-width: 260px; }
    .search-box input { width: 100%; padding: 12px 16px; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--card-border); color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .search-box input:focus { border-color: var(--accent); }
    select { padding: 12px 16px; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--card-border); color: #fff; font-size: 14px; outline: none; cursor: pointer; }

    .bulk-toolbar-top { max-width: 1400px; margin: 0 auto 20px; background: #181A22; border: 1px solid var(--card-border); border-radius: 12px; padding: 12px 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; font-size: 13.5px; }
    .bulk-actions-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

    .poi-list { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .poi-card { background: var(--card-bg); border: 1.5px solid var(--card-border); border-radius: var(--radius); padding: 20px; display: flex; flex-direction: column; gap: 16px; transition: all 0.2s; position: relative; }
    .poi-card.bulk-selected { border-color: #EF4444; background: #1A1316; box-shadow: 0 0 0 1px #EF4444; }
    .poi-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .poi-title-wrap { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .poi-checkbox-row { display: flex; align-items: center; gap: 10px; }
    .poi-select-cb { width: 18px; height: 18px; cursor: pointer; accent-color: #EF4444; }
    .poi-title { font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    .category-chip { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; background: #232733; color: var(--accent); letter-spacing: 0.5px; }
    .state-chip { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: #1E293B; color: #38BDF8; letter-spacing: 0.3px; }
    .poi-address { font-size: 13px; color: var(--text-muted); }
    .poi-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    .btn { padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 4px 12px var(--accent-glow); }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-secondary { background: #232733; color: #E5E7EB; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }
    .btn-danger { background: #3E1616; color: #FCA5A5; border: 1px solid #7F1D1D; font-size: 12px; padding: 6px 12px; }
    .btn-danger:hover { background: #DC2626; color: #FFFFFF; border-color: #DC2626; }
    .btn-bulk-danger { background: #DC2626; color: #FFFFFF; font-weight: 700; }
    .btn-bulk-danger:hover { background: #B91C1C; }
    .btn-bulk-save { background: #10B981; color: #FFFFFF; font-weight: 700; }
    .btn-bulk-save:hover { background: #059669; }

    .sections-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
    @media(max-width: 900px) { .sections-grid { grid-template-columns: 1fr; } }
    .photo-section { background: rgba(0,0,0,0.25); border-radius: 12px; padding: 14px; border: 1px solid rgba(255,255,255,0.05); }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between; }
    .thumbnails-row { display: flex; gap: 12px; flex-wrap: wrap; }

    .thumb-card { position: relative; width: 140px; border-radius: 10px; overflow: hidden; border: 2px solid transparent; cursor: pointer; background: #000; transition: all 0.2s; }
    .thumb-card img { width: 100%; height: 100px; object-fit: cover; display: block; }
    .thumb-card.selected { border-color: var(--accent); transform: scale(1.03); box-shadow: 0 0 0 2px var(--accent); }
    .thumb-card.db-selected { border-color: #EF4444 !important; transform: scale(1.03); box-shadow: 0 0 0 2px #EF4444 !important; }
    .thumb-info { padding: 6px; font-size: 11px; color: #E5E7EB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #181A22; }
    .thumb-meta { font-size: 10px; color: var(--text-muted); padding: 0 6px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #181A22; }
    .check-badge { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 11px; background: rgba(0,0,0,0.6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; border: 1.5px solid #fff; }
    .thumb-card.selected .check-badge { background: var(--accent); border-color: var(--accent); }
    .check-badge.delete-badge { background: #EF4444; border-color: #fff; z-index: 8; }
    .delete-photo-btn { position: absolute; top: 6px; left: 6px; width: 22px; height: 22px; border-radius: 11px; background: rgba(220, 38, 38, 0.95); color: #fff; border: 1.5px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; z-index: 10; box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
    .delete-photo-btn:hover { background: #B91C1C; transform: scale(1.15); }
    .empty-state { font-size: 13px; color: var(--text-muted); padding: 20px 0; text-align: center; }

    /* Progress Banner */
    .progress-banner { max-width: 1400px; margin: 0 auto 20px; background: #1B1E29; border: 1.5px solid #374151; border-radius: 14px; padding: 14px 20px; display: flex; flex-direction: column; gap: 10px; }
    .progress-banner.running { border-color: var(--accent); background: #1F191D; box-shadow: 0 0 16px rgba(226, 78, 27, 0.15); }
    .progress-info { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; font-weight: 600; color: #E5E7EB; }
    .progress-track { width: 100%; height: 8px; background: #2D3344; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #E24E1B, #F59E0B); border-radius: 4px; transition: width 0.4s ease; }

    /* Sticky Bottom Floating Bulk Bar */
    .floating-bulk-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(21, 23, 30, 0.95); backdrop-filter: blur(12px); border: 1px solid #374151; border-radius: 18px; padding: 12px 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 999; }
    .floating-bulk-bar .count-tag { font-size: 13px; font-weight: 700; color: #F3F4F6; }

    .toast { position: fixed; bottom: 24px; right: 24px; background: #10B981; color: #fff; padding: 14px 24px; border-radius: 12px; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transform: translateY(100px); opacity: 0; transition: all 0.3s; z-index: 1000; }
    .toast.show { transform: translateY(0); opacity: 1; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="badge-logo">M</div>
      <div>
        <h1>Musafir Photo Studio & POI Manager</h1>
        <p style="font-size: 12px; color: var(--text-muted)">Batch select, bulk save photos to S3 & DB, and bulk delete unwanted POIs</p>
      </div>
    </div>
    <div class="stats-bar">
      <div class="stat-pill">Total Visible: <b id="stat-total">0</b></div>
      <div class="stat-pill">With Photos (DB): <b id="stat-with-photos">0</b></div>
      <div class="stat-pill">Has Candidates: <b id="stat-with-candidates">0</b></div>
    </div>
  </header>

  <div id="extraction-progress-banner" class="progress-banner" style="display:none">
    <div class="progress-info">
      <div style="display:flex;align-items:center;gap:8px">
        <span id="prog-icon">⚡</span>
        <span id="prog-text">Checking background candidate extraction status...</span>
      </div>
      <span id="prog-percent" style="font-weight:800;color:var(--accent)">0%</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" id="prog-fill" style="width: 0%"></div>
    </div>
  </div>

  <div class="controls">
    <div class="search-box">
      <input type="text" id="search-input" placeholder="Search POI name (e.g. Kedarkantha, Triund, Hampta)..." oninput="debounceFetch()">
    </div>
    <select id="category-filter" onchange="fetchPois()">
      <option value="all">All Categories</option>
      <option value="trek">Treks</option>
      <option value="temple">Temples</option>
      <option value="viewpoint">Viewpoints</option>
      <option value="waterfall">Waterfalls</option>
      <option value="heritage">Heritage</option>
      <option value="beach">Beaches</option>
    </select>
    <select id="state-filter" onchange="fetchPois()">
      <option value="all">All States (India)</option>
      <option value="Himachal Pradesh">Himachal Pradesh</option>
      <option value="Uttarakhand">Uttarakhand</option>
      <option value="Karnataka">Karnataka</option>
      <option value="Maharashtra">Maharashtra</option>
      <option value="Kerala">Kerala</option>
      <option value="Tamil Nadu">Tamil Nadu</option>
      <option value="Goa">Goa</option>
      <option value="Sikkim">Sikkim</option>
      <option value="Jammu and Kashmir">Jammu & Kashmir</option>
      <option value="Ladakh">Ladakh</option>
      <option value="Arunachal Pradesh">Arunachal Pradesh</option>
      <option value="Rajasthan">Rajasthan</option>
      <option value="Gujarat">Gujarat</option>
      <option value="Madhya Pradesh">Madhya Pradesh</option>
      <option value="Uttar Pradesh">Uttar Pradesh</option>
      <option value="West Bengal">West Bengal</option>
      <option value="Andhra Pradesh">Andhra Pradesh</option>
      <option value="Telangana">Telangana</option>
      <option value="Odisha">Odisha</option>
      <option value="Assam">Assam</option>
      <option value="Meghalaya">Meghalaya</option>
      <option value="Jharkhand">Jharkhand</option>
      <option value="Bihar">Bihar</option>
      <option value="Punjab">Punjab</option>
      <option value="Haryana">Haryana</option>
      <option value="Nagaland">Nagaland</option>
      <option value="Manipur">Manipur</option>
      <option value="Mizoram">Mizoram</option>
      <option value="Tripura">Tripura</option>
      <option value="Andaman and Nicobar Islands">Andaman & Nicobar</option>
    </select>
    <select id="status-filter" onchange="fetchPois()">
      <option value="all">All POIs</option>
      <option value="needs_review" selected>Needs Photos & Has Candidates</option>
      <option value="has_candidates">All With Candidates</option>
      <option value="no_photos">Zero Photos (DB)</option>
    </select>
  </div>

  <div class="bulk-toolbar-top">
    <div style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="master-poi-cb" class="poi-select-cb" onchange="toggleSelectAllPois(this.checked)">
      <label for="master-poi-cb" style="cursor:pointer;font-weight:600">Select All Visible POIs (<span id="visible-count">0</span>)</label>
    </div>
    <div class="bulk-actions-group">
      <button class="btn btn-secondary" onclick="autoSelectBestAllVisible()">✨ Auto-Pick Best for All Visible</button>
      <button class="btn btn-bulk-save" id="btn-bulk-save-top" onclick="saveAllSelected()" disabled>💾 Save All Selected Photos (0)</button>
      <button class="btn btn-bulk-danger" id="btn-bulk-delete-top" onclick="deleteSelectedPois()" disabled>🗑️ Delete Selected POIs (0)</button>
    </div>
  </div>

  <div class="poi-list" id="poi-list">
    <div class="empty-state">Loading POIs and candidate photos...</div>
  </div>

  <!-- Floating Sticky Action Bar -->
  <div class="floating-bulk-bar" id="floating-bar" style="display:none">
    <div class="count-tag"><span id="float-poi-count">0</span> POIs selected | <span id="float-photo-count">0</span> Photos chosen</div>
    <button class="btn btn-bulk-save" onclick="saveAllSelected()">💾 Save All Photos to S3 & DB</button>
    <button class="btn btn-bulk-danger" onclick="deleteSelectedPois()">🗑️ Delete Selected POIs</button>
    <button class="btn btn-secondary" onclick="clearAllSelections()">Clear All</button>
  </div>

  <div class="toast" id="toast">Action completed successfully!</div>

  <script>
    let currentPois = [];
    let selectedMap = {}; // poiId -> Set of candidate indices
    let selectedDbPhotosMap = {}; // poiId -> Set of photoIds to delete
    let checkedPois = new Set(); // Set of poiIds checked for bulk delete
    let debounceTimer = null;

    function debounceFetch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchPois, 300);
    }

    async function fetchPois() {
      const search = document.getElementById('search-input').value;
      const category = document.getElementById('category-filter').value;
      const state = document.getElementById('state-filter').value;
      const filter = document.getElementById('status-filter').value;

      document.getElementById('poi-list').innerHTML = '<div class="empty-state">Fetching POIs...</div>';
      checkedPois.clear();

      try {
        const res = await fetch(\`/api/photo-review/pois?category=\${category}&state=\${state}&filter=\${filter}&search=\${encodeURIComponent(search)}\`);
        const data = await res.json();
        currentPois = data.pois || [];
        renderPois();
      } catch (err) {
        document.getElementById('poi-list').innerHTML = \`<div class="empty-state" style="color:#EF4444">Error loading data: \${err.message}</div>\`;
      }
    }

    function renderPois() {
      const container = document.getElementById('poi-list');
      document.getElementById('visible-count').innerText = currentPois.length;
      document.getElementById('master-poi-cb').checked = false;

      if (currentPois.length === 0) {
        container.innerHTML = '<div class="empty-state">No matching POIs found for this filter.</div>';
        updateStats();
        updateBulkBar();
        return;
      }

      container.innerHTML = currentPois.map(poi => {
        const candidates = poi.candidates || [];
        const existing = poi.existingPhotos || [];
        const selected = selectedMap[poi.id] || new Set();
        const selectedDbPhotos = selectedDbPhotosMap[poi.id] || new Set();
        const isChecked = checkedPois.has(poi.id);

        return \`
          <div class="poi-card \${isChecked ? 'bulk-selected' : ''}" id="card-\${poi.id}">
            <div class="poi-header">
              <div class="poi-title-wrap">
                <div class="poi-checkbox-row">
                  <input type="checkbox" class="poi-select-cb" \${isChecked ? 'checked' : ''} onchange="toggleCheckPoi('\${poi.id}', this.checked)">
                  <div class="poi-title">
                    \${poi.name}
                    <span class="category-chip">\${poi.category}</span>
                    \${poi.state ? \`<span class="state-chip">\${poi.state}</span>\` : ''}
                  </div>
                </div>
                <div class="poi-address" style="margin-left:28px">\${poi.address || 'India'}</div>
              </div>
              <div class="poi-actions">
                <button class="btn btn-secondary" onclick="autoSelectBest('\${poi.id}')">Select First</button>
                <button class="btn btn-primary" id="save-btn-\${poi.id}" onclick="saveSelected('\${poi.id}')" \${selected.size === 0 ? 'disabled' : ''}>
                  Save Selected (\${selected.size})
                </button>
                <button class="btn btn-danger" onclick="deletePoi('\${poi.id}', '\${poi.name.replace(/'/g, "\\\\'")}')">
                  🗑️ Delete POI
                </button>
              </div>
            </div>

            <div class="sections-grid">
              <div class="photo-section">
                <div class="section-title">
                  <span>Saved DB Photos (\${existing.length})</span>
                  <div style="display:flex;gap:6px;align-items:center;">
                    \${selectedDbPhotos.size > 0 ? \`
                      <button class="btn btn-danger" style="padding:3px 10px;font-size:11px;font-weight:700" onclick="deleteSelectedDbPhotos('\${poi.id}', '\${poi.name.replace(/'/g, "\\\\'")}')">
                        🗑️ Delete (\${selectedDbPhotos.size})
                      </button>
                    \` : ''}
                    \${existing.length > 0 ? \`
                      <button class="btn btn-secondary" style="padding:3px 8px;font-size:10.5px;color:#9CA3AF" onclick="deleteAllDbPhotos('\${poi.id}', '\${poi.name.replace(/'/g, "\\\\'")}')">
                        Clear All
                      </button>
                    \` : ''}
                  </div>
                </div>
                <div class="thumbnails-row">
                  \${existing.length === 0 ? '<div class="empty-state" style="padding:10px">No DB photos yet</div>' : existing.map(p => {
                    const isDbSelected = selectedDbPhotos.has(p.id);
                    return \`
                      <div class="thumb-card existing-thumb-card \${isDbSelected ? 'db-selected' : ''}" id="db-photo-\${p.id}" onclick="toggleDbPhoto('\${poi.id}', '\${p.id}')">
                        <div class="check-badge delete-badge" style="\${isDbSelected ? 'display:flex' : 'display:none'}">✓</div>
                        <button class="delete-photo-btn" title="Delete this photo immediately" onclick="event.stopPropagation(); deleteDbPhoto('\${p.id}', '\${poi.id}')">✕</button>
                        <img src="\${p.url}" alt="\${poi.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=720&h=480&fit=crop'; this.style.filter='grayscale(100%) opacity(0.35)'; this.title='Image broken or not accessible';">
                        <div class="thumb-info" style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;">
                          <span style="font-size:10px;color:#9CA3AF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65px;">\${p.source}</span>
                          <span style="font-size:9.5px;color:\${isDbSelected ? '#EF4444' : '#9CA3AF'};font-weight:700;">\${isDbSelected ? 'Selected' : 'Select'}</span>
                        </div>
                      </div>
                    \`;
                  }).join('')}
                </div>
              </div>

              <div class="photo-section">
                <div class="section-title">
                  Candidate Photos (\${candidates.length})
                </div>
                <div class="thumbnails-row">
                  \${candidates.length === 0 ? '<div class="empty-state" style="padding:10px">No matching candidates found.</div>' : candidates.map((c, idx) => {
                    const isSelected = selected.has(idx);
                    let badgeBg = '#2563EB';
                    let badgeText = '🌐 Web';
                    if (c.source === 'pinterest') {
                      badgeBg = '#E60023';
                      badgeText = '📌 Pinterest';
                    } else if (c.source === 'tripadvisor') {
                      badgeBg = '#00AF87';
                      badgeText = '🦉 TripAdvisor';
                    }

                    return \`
                      <div class="thumb-card \${isSelected ? 'selected' : ''}" onclick="toggleCandidate('\${poi.id}', \${idx})">
                        <div class="check-badge">\${isSelected ? '✓' : '+'}</div>
                        <span style="position:absolute;top:6px;left:6px;background:\${badgeBg};font-size:9.5px;padding:3px 7px;border-radius:6px;color:#FFFFFF;font-weight:800;letter-spacing:0.3px;box-shadow:0 2px 6px rgba(0,0,0,0.5)">\${badgeText}</span>
                        <img src="\${c.photoUrl}" alt="\${c.title}" loading="lazy" onerror="this.style.opacity=0.3">
                        <div class="thumb-info" title="\${c.title}">\${c.title}</div>
                        <div class="thumb-meta" title="\${c.hierarchy || c.pageUrl || ''}">\${c.hierarchy || (c.pageUrl ? new URL(c.pageUrl).hostname : 'Photo Candidate')}</div>
                      </div>
                    \`;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        \`;
      }).join('');

      updateStats();
      updateBulkBar();
    }

    function toggleCandidate(poiId, candidateIdx) {
      if (!selectedMap[poiId]) selectedMap[poiId] = new Set();
      const set = selectedMap[poiId];

      if (set.has(candidateIdx)) {
        set.delete(candidateIdx);
      } else {
        set.add(candidateIdx);
      }

      renderCard(poiId);
      updateBulkBar();
    }

    function autoSelectBest(poiId) {
      const poi = currentPois.find(p => p.id === poiId);
      if (!poi || !poi.candidates || poi.candidates.length === 0) return;
      if (!selectedMap[poiId]) selectedMap[poiId] = new Set();
      selectedMap[poiId].clear();
      selectedMap[poiId].add(0);
      renderCard(poiId);
      updateBulkBar();
    }

    function autoSelectBestAllVisible() {
      for (const poi of currentPois) {
        if (poi.candidates && poi.candidates.length > 0) {
          if (!selectedMap[poi.id]) selectedMap[poi.id] = new Set();
          selectedMap[poi.id].clear();
          selectedMap[poi.id].add(0);
          renderCard(poi.id);
        }
      }
      showToast(\`Selected top photo for \${currentPois.length} POIs\`);
      updateBulkBar();
    }

    function renderCard(poiId) {
      const poi = currentPois.find(p => p.id === poiId);
      if (!poi) return;
      const card = document.getElementById(\`card-\${poiId}\`);
      if (!card) return;

      const selected = selectedMap[poiId] || new Set();
      const saveBtn = document.getElementById(\`save-btn-\${poiId}\`);
      if (saveBtn) {
        saveBtn.disabled = selected.size === 0;
        saveBtn.innerText = \`Save Selected (\${selected.size})\`;
      }

      const taThumbs = card.querySelectorAll('.sections-grid .photo-section:nth-child(2) .thumb-card');
      taThumbs.forEach((thumb, idx) => {
        const isSelected = selected.has(idx);
        thumb.className = \`thumb-card \${isSelected ? 'selected' : ''}\`;
        const badge = thumb.querySelector('.check-badge');
        if (badge) badge.innerText = isSelected ? '✓' : '+';
      });
    }

    function toggleCheckPoi(poiId, isChecked) {
      if (isChecked) {
        checkedPois.add(poiId);
      } else {
        checkedPois.delete(poiId);
      }
      const card = document.getElementById(\`card-\${poiId}\`);
      if (card) {
        if (isChecked) card.classList.add('bulk-selected');
        else card.classList.remove('bulk-selected');
      }
      updateBulkBar();
    }

    function toggleSelectAllPois(isChecked) {
      for (const poi of currentPois) {
        if (isChecked) checkedPois.add(poi.id);
        else checkedPois.delete(poi.id);

        const card = document.getElementById(\`card-\${poi.id}\`);
        if (card) {
          const cb = card.querySelector('.poi-select-cb');
          if (cb) cb.checked = isChecked;
          if (isChecked) card.classList.add('bulk-selected');
          else card.classList.remove('bulk-selected');
        }
      }
      updateBulkBar();
    }

    function clearAllSelections() {
      checkedPois.clear();
      selectedMap = {};
      document.getElementById('master-poi-cb').checked = false;
      renderPois();
      updateBulkBar();
    }

    function updateBulkBar() {
      let totalPhotosSelected = 0;
      let poisWithPhotos = 0;
      for (const pid of Object.keys(selectedMap)) {
        if (selectedMap[pid] && selectedMap[pid].size > 0) {
          totalPhotosSelected += selectedMap[pid].size;
          poisWithPhotos++;
        }
      }

      const checkedCount = checkedPois.size;
      const floatBar = document.getElementById('floating-bar');
      document.getElementById('float-poi-count').innerText = checkedCount;
      document.getElementById('float-photo-count').innerText = totalPhotosSelected;

      // Top Toolbar Buttons
      const btnBulkSaveTop = document.getElementById('btn-bulk-save-top');
      btnBulkSaveTop.disabled = totalPhotosSelected === 0;
      btnBulkSaveTop.innerText = \`💾 Save All Selected Photos (\${totalPhotosSelected})\`;

      const btnBulkDeleteTop = document.getElementById('btn-bulk-delete-top');
      btnBulkDeleteTop.disabled = checkedCount === 0;
      btnBulkDeleteTop.innerText = \`🗑️ Delete Selected POIs (\${checkedCount})\`;

      if (checkedCount > 0 || totalPhotosSelected > 0) {
        floatBar.style.display = 'flex';
      } else {
        floatBar.style.display = 'none';
      }
    }

    async function saveSelected(poiId) {
      const poi = currentPois.find(p => p.id === poiId);
      const selectedIndices = selectedMap[poiId];
      if (!poi || !selectedIndices || selectedIndices.size === 0) return;

      const saveBtn = document.getElementById(\`save-btn-\${poiId}\`);
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving to S3...';

      const chosenPhotos = Array.from(selectedIndices).map(idx => poi.candidates[idx]);

      try {
        const res = await fetch('/api/photo-review/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poiId, photos: chosenPhotos }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');

        showToast(\`Saved \${data.count} photo(s) to S3 & DB for \${poi.name}!\`);
        selectedMap[poiId].clear();
        await fetchPois();
      } catch (err) {
        alert('Error saving photos: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.innerText = \`Save Selected (\${selectedIndices.size})\`;
      }
    }

    async function saveAllSelected() {
      const itemsToSave = [];
      for (const pid of Object.keys(selectedMap)) {
        const indices = selectedMap[pid];
        const poi = currentPois.find(p => p.id === pid);
        if (poi && indices && indices.size > 0) {
          itemsToSave.push({
            poiId: pid,
            photos: Array.from(indices).map(idx => poi.candidates[idx]),
          });
        }
      }

      if (itemsToSave.length === 0) return;

      showToast(\`Saving photos across \${itemsToSave.length} POIs to S3 & DB...\`);

      try {
        const res = await fetch('/api/photo-review/bulk-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToSave }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk save failed');

        showToast(\`Bulk saved \${data.savedPhotos} photos across \${data.savedPois} POIs!\`);
        selectedMap = {};
        await fetchPois();
      } catch (err) {
        alert('Error during bulk save: ' + err.message);
      }
    }

    async function deletePoi(poiId, name) {
      if (!confirm(\`Are you sure you want to permanently delete "\${name}" from the database?\`)) return;

      try {
        const res = await fetch('/api/photo-review/delete-poi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poiId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');

        showToast(\`Deleted "\${name}" from database.\`);

        currentPois = currentPois.filter(p => p.id !== poiId);
        checkedPois.delete(poiId);
        const card = document.getElementById(\`card-\${poiId}\`);
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          card.style.transition = 'all 0.3s';
          setTimeout(() => card.remove(), 300);
        }
        updateStats();
        updateBulkBar();
      } catch (err) {
        alert('Error deleting POI: ' + err.message);
      }
    }

    async function deleteSelectedPois() {
      const poiIds = Array.from(checkedPois);
      if (poiIds.length === 0) return;

      if (!confirm(\`Are you sure you want to PERMANENTLY DELETE all \${poiIds.length} selected POIs from the database?\`)) return;

      showToast(\`Deleting \${poiIds.length} POIs...\`);

      try {
        const res = await fetch('/api/photo-review/bulk-delete-pois', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poiIds }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bulk delete failed');
        showToast(\`Permanently deleted \${data.deletedCount} POIs from database!\`);
        checkedPois.clear();
        await fetchPois();
      } catch (err) {
        alert('Error during bulk delete: ' + err.message);
      }
    }

    function toggleDbPhoto(poiId, photoId) {
      if (!selectedDbPhotosMap[poiId]) selectedDbPhotosMap[poiId] = new Set();
      const set = selectedDbPhotosMap[poiId];

      if (set.has(photoId)) {
        set.delete(photoId);
      } else {
        set.add(photoId);
      }

      renderPois();
    }

    async function deleteSelectedDbPhotos(poiId, name) {
      const set = selectedDbPhotosMap[poiId];
      if (!set || set.size === 0) return;
      const photoIds = Array.from(set);

      try {
        const res = await fetch('/api/photo-review/delete-multiple-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoIds, poiId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete photos');

        showToast(\`Deleted \${data.deletedCount} saved photo(s) from database.\`);
        selectedDbPhotosMap[poiId].clear();

        const poi = currentPois.find(p => p.id === poiId);
        if (poi) {
          poi.existingPhotos = (poi.existingPhotos || []).filter(p => !photoIds.includes(p.id));
          poi.totalPhotos = poi.existingPhotos.length;
        }

        renderPois();
        updateStats();
      } catch (err) {
        alert('Error deleting photos: ' + err.message);
      }
    }

    async function deleteDbPhoto(photoId, poiId) {
      try {
        const res = await fetch('/api/photo-review/delete-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId, poiId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete photo');

        showToast('Photo removed from database.');

        // Update local state and remove thumb from DOM
        const poi = currentPois.find(p => p.id === poiId);
        if (poi) {
          poi.existingPhotos = (poi.existingPhotos || []).filter(p => p.id !== photoId);
          poi.totalPhotos = poi.existingPhotos.length;
        }
        if (selectedDbPhotosMap[poiId]) {
          selectedDbPhotosMap[poiId].delete(photoId);
        }

        renderPois();
        updateStats();
      } catch (err) {
        alert('Error deleting photo: ' + err.message);
      }
    }

    async function deleteAllDbPhotos(poiId, name) {
      if (!confirm(\`Are you sure you want to delete ALL saved photos for "\${name}" from the database?\`)) return;

      try {
        const res = await fetch('/api/photo-review/delete-all-poi-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poiId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete photos');

        showToast(\`Cleared all saved photos for "\${name}".\`);

        const poi = currentPois.find(p => p.id === poiId);
        if (poi) {
          poi.existingPhotos = [];
          poi.totalPhotos = 0;
        }

        renderPois();
      } catch (err) {
        alert('Error deleting photos: ' + err.message);
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }

    function updateStats() {
      document.getElementById('stat-total').innerText = currentPois.length;
      document.getElementById('stat-with-photos').innerText = currentPois.filter(p => p.existingPhotos && p.existingPhotos.length > 0).length;
      document.getElementById('stat-with-candidates').innerText = currentPois.filter(p => p.candidates && p.candidates.length > 0).length;
    }

    async function pollExtractionStatus() {
      try {
        const res = await fetch('/api/photo-review/extraction-status');
        const data = await res.json();
        const banner = document.getElementById('extraction-progress-banner');
        const fill = document.getElementById('prog-fill');
        const text = document.getElementById('prog-text');
        const pct = document.getElementById('prog-percent');
        const icon = document.getElementById('prog-icon');

        if (data.isRunning) {
          banner.style.display = 'flex';
          banner.className = 'progress-banner running';
          icon.innerText = '⚡';
          text.innerText = \`Extracting photo candidates: \${data.withCandidates} / \${data.totalInDb} cached (\${data.remaining} remaining)... Currently on "\${data.currentPoi || ''}" (\${data.currentCategory || ''})\`;
          pct.innerText = \`\${data.percent}%\`;
          fill.style.width = \`\${data.percent}%\`;
        } else if (data.remaining > 0) {
          banner.style.display = 'flex';
          banner.className = 'progress-banner';
          icon.innerText = '⏸️';
          text.innerText = \`Candidate Extraction Paused / In Progress: \${data.withCandidates} / \${data.totalInDb} cached (\${data.remaining} remaining).\`;
          pct.innerText = \`\${data.percent}%\`;
          fill.style.width = \`\${data.percent}%\`;
        } else {
          banner.style.display = 'flex';
          banner.className = 'progress-banner';
          icon.innerText = '✅';
          text.innerText = \`All \${data.totalInDb} POIs have verified candidate photos ready!\`;
          pct.innerText = '100%';
          fill.style.width = '100%';
        }
      } catch {}
    }

    // Initial load & status polling
    fetchPois();
    pollExtractionStatus();
    setInterval(pollExtractionStatus, 3000);
  </script>
</body>
</html>`;
}
