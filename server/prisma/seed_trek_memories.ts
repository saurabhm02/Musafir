import { db } from "../src/lib/db";

async function main() {
  const trekId = "167d7ada-b521-450e-ae33-bd0d2c157d6c";
  const routeId = "42ced505-c5a6-488d-81d2-5e758806854e";
  const poiId = "824bfa8c-9e58-491a-b16e-05b4a7783c45";

  // Find or create test authors
  const users = await db.users.findMany({ take: 5 });
  const u1 = users[0]?.id || "00000000-0000-0000-0000-000000000001";
  const u2 = users[1]?.id || u1;
  const u3 = users[2]?.id || u1;

  const memoriesData = [
    {
      caption: "The views from Raghupur Top are absolutely breathtaking! Perfect spot to take a break and enjoy the Himalayas.",
      photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      lat: 31.5396,
      lon: 77.3898,
      tags: ["#raghupurtop", "#himachal", "#trekking", "#views", "#himalayas"],
      user_id: u1,
      visibility: "public",
    },
    {
      caption: "Crossing Buri Nali trail section under golden hour sunlight.",
      photo_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
      lat: 31.5375,
      lon: 77.4295,
      tags: ["#burinali", "#goldenhour", "#trail", "#himalayas"],
      user_id: u2,
      visibility: "public",
    },
    {
      caption: "Chehni Kothi historic tower visible in the valley below during the ascent.",
      photo_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80",
      lat: 31.5355,
      lon: 77.3792,
      tags: ["#chehnikothi", "#architecture", "#heritage", "#tirthan"],
      user_id: u3,
      visibility: "public",
    },
    {
      caption: "Jalori Pass starting point - fresh mountain breeze and vibrant prayer flags.",
      photo_url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=400&q=80",
      lat: 31.5372,
      lon: 77.3717,
      tags: ["#jaloripass", "#trailhead", "#prayerflags", "#trekstart"],
      user_id: u1,
      visibility: "public",
    },
    {
      caption: "Oak and rhododendron forest stretch before entering the high alpine ridge.",
      photo_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80",
      lat: 31.5384,
      lon: 77.431,
      tags: ["#oakforest", "#rhododendron", "#lushgreen", "#serene"],
      user_id: u2,
      visibility: "public",
    },
    {
      caption: "Shepherd camp near the ridge. Friendly local dogs and endless meadows.",
      photo_url: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80",
      lat: 31.5401,
      lon: 77.426,
      tags: ["#shepherdcamp", "#highmeadows", "#himachal", "#peaceful"],
      user_id: u3,
      visibility: "public",
    },
    {
      caption: "Ancient fort walls at the summit plateau offering 360 degree panoramic vista.",
      photo_url: "https://images.unsplash.com/photo-1434394354979-a235cd36269d?auto=format&fit=crop&w=1200&q=85",
      thumbnail_url: "https://images.unsplash.com/photo-1434394354979-a235cd36269d?auto=format&fit=crop&w=400&q=80",
      lat: 31.5461,
      lon: 77.433,
      tags: ["#raghupurfort", "#summit", "#panoramaview", "#360degrees"],
      user_id: u1,
      visibility: "public",
    },
  ];

  for (const m of memoriesData) {
    await db.$executeRaw`
      INSERT INTO memories (
        id,
        user_id,
        poi_id,
        trek_id,
        trek_route_id,
        photo_url,
        thumbnail_url,
        caption,
        visibility,
        status,
        moderation_status,
        ai_tags,
        location,
        created_at
      ) VALUES (
        gen_random_uuid(),
        ${m.user_id}::uuid,
        ${poiId}::uuid,
        ${trekId}::uuid,
        ${routeId}::uuid,
        ${m.photo_url},
        ${m.thumbnail_url},
        ${m.caption},
        ${m.visibility},
        'ready',
        'approved',
        ${m.tags}::text[],
        ST_SetSRID(ST_MakePoint(${m.lon}, ${m.lat}), 4326)::geography,
        NOW() - INTERVAL '2 days'
      );
    `;
  }

  console.log("Successfully seeded", memoriesData.length, "memories for Raghupur Fort Trek!");
}

main().catch(console.error).finally(() => process.exit(0));
