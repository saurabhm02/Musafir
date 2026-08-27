import { db } from "../lib/db";
import { dispatchNotification } from "./notifications";

export type TravelStats = {
  totalDistanceKm: number;
  totalTrips: number;
  placesVisited: number;
  statesExplored: number;
  citiesVisited: number;
  photosAndMemories: number;
  longestTripKm: number;
  totalTravelDurationHours: number;
};

export type AchievementBadge = {
  badgeKey: string;
  category: "distance" | "trips" | "regional" | "theme" | "social";
  title: string;
  description: string;
  badgeIcon: string;
  isUnlocked: boolean;
  progress: number;
  targetValue: number;
  level?: number;
  unlockedAt: string | null;
};

export type RecentTripSummary = {
  id: string;
  title: string;
  destination: string | null;
  coverPhotoUrl: string | null;
  startDate: string;
  completedDate: string | null;
  actualDistanceKm: number;
  actualDurationMin: number;
  stopCount: number;
  dayCount: number;
};

export type RecentMemorySummary = {
  id: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
};

export type UserProfileResponse = {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    homeCity: string | null;
    subscriptionTier: string;
    createdAt: string;
  };
  stats: TravelStats;
  featuredAchievement: AchievementBadge | null;
  achievements: AchievementBadge[];
  recentTrips: RecentTripSummary[];
  recentMemories: RecentMemorySummary[];
  savedCounts: {
    savedPlaces: number;
    wantToGo: number;
    collections: number;
  };
};

const HIMALAYAN_STATES = [
  "himachal pradesh",
  "uttarakhand",
  "ladakh",
  "jammu and kashmir",
  "jammu & kashmir",
  "sikkim",
  "arunachal pradesh",
];

// Declarative Rule Catalog for Extensible Achievements
function evaluateAchievements(
  stats: TravelStats,
  context: {
    himalayanVisits: number;
    heritageVisits: number;
    sunsetVisits: number;
    trekVisits: number;
    multiDayTrips: number;
  },
  existingUnlocks: Map<string, Date>,
): AchievementBadge[] {
  const badges: AchievementBadge[] = [];

  // 1. 500 KM CLUB
  const km500Unlocked = stats.totalDistanceKm >= 500;
  badges.push({
    badgeKey: "500_km_club",
    category: "distance",
    title: "500 KM Club",
    description: "Travelled over 500 kilometers on recorded journeys",
    badgeIcon: "distance_500",
    isUnlocked: km500Unlocked,
    progress: Math.min(500, Math.round(stats.totalDistanceKm)),
    targetValue: 500,
    unlockedAt: km500Unlocked ? (existingUnlocks.get("500_km_club")?.toISOString() ?? new Date().toISOString()) : null,
  });

  // 2. 2,500 KM VOYAGER
  const km2500Unlocked = stats.totalDistanceKm >= 2500;
  badges.push({
    badgeKey: "2500_km_voyager",
    category: "distance",
    title: "2,500 KM Voyager",
    description: "Crossed 2,500 kilometers of exploration",
    badgeIcon: "distance_2500",
    isUnlocked: km2500Unlocked,
    progress: Math.min(2500, Math.round(stats.totalDistanceKm)),
    targetValue: 2500,
    unlockedAt: km2500Unlocked ? (existingUnlocks.get("2500_km_voyager")?.toISOString() ?? new Date().toISOString()) : null,
  });

  // 3. 10 TRIPS MILESTONE
  const trips10Unlocked = stats.totalTrips >= 10;
  badges.push({
    badgeKey: "10_trips",
    category: "trips",
    title: "10 Trips",
    description: "Successfully completed 10 separate journeys",
    badgeIcon: "trips_10",
    isUnlocked: trips10Unlocked,
    progress: Math.min(10, stats.totalTrips),
    targetValue: 10,
    unlockedAt: trips10Unlocked ? (existingUnlocks.get("10_trips")?.toISOString() ?? new Date().toISOString()) : null,
  });

  // 4. HIMALAYAN EXPLORER
  const himalayanUnlocked = context.himalayanVisits >= 5;
  badges.push({
    badgeKey: "himalayan_explorer",
    category: "regional",
    title: "Himalayan Explorer",
    description: "Visited 5+ Himalayan destinations in northern mountains",
    badgeIcon: "mountain_explorer",
    isUnlocked: himalayanUnlocked,
    progress: Math.min(5, context.himalayanVisits),
    targetValue: 5,
    unlockedAt: himalayanUnlocked ? (existingUnlocks.get("himalayan_explorer")?.toISOString() ?? new Date().toISOString()) : null,
  });

  // 5. HERITAGE SEEKER
  const heritageUnlocked = context.heritageVisits >= 5;
  badges.push({
    badgeKey: "heritage_seeker",
    category: "theme",
    title: "Heritage Seeker",
    description: "Explored 5+ historical landmarks, forts, and heritage sites",
    badgeIcon: "heritage_seeker",
    isUnlocked: heritageUnlocked,
    progress: Math.min(5, context.heritageVisits),
    targetValue: 5,
    unlockedAt: heritageUnlocked ? (existingUnlocks.get("heritage_seeker")?.toISOString() ?? new Date().toISOString()) : null,
  });

  // 6. SUNSET CHASER
  const sunsetUnlocked = context.sunsetVisits >= 5;
  badges.push({
    badgeKey: "sunset_chaser",
    category: "theme",
    title: "Sunset Chaser",
    description: "Reached 5+ scenic viewpoints and sunset destinations",
    badgeIcon: "sunset_chaser",
    isUnlocked: sunsetUnlocked,
    progress: Math.min(5, context.sunsetVisits),
    targetValue: 5,
    unlockedAt: sunsetUnlocked ? (existingUnlocks.get("sunset_chaser")?.toISOString() ?? new Date().toISOString()) : null,
  });

  // 7. MEMORY COLLECTOR
  const memCount = stats.photosAndMemories;
  const memUnlocked = memCount >= 5;
  const memLevel = memCount >= 50 ? 3 : memCount >= 20 ? 2 : memCount >= 5 ? 1 : 0;
  badges.push({
    badgeKey: "memory_collector",
    category: "social",
    title: "Memory Collector",
    description: "Preserved travel memories with verified photos",
    badgeIcon: "memory_collector",
    isUnlocked: memUnlocked,
    level: memLevel,
    progress: Math.min(50, memCount),
    targetValue: memLevel >= 2 ? 50 : 20,
    unlockedAt: memUnlocked ? (existingUnlocks.get("memory_collector")?.toISOString() ?? new Date().toISOString()) : null,
  });

  return badges;
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  // 1. Run Core Independent Queries in Parallel
  const [user, statsRows, existingAchRows, rawTrips, rawMemories, collectionsCount] = await Promise.all([
    db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        full_name: true,
        avatar_url: true,
        bio: true,
        home_city: true,
        subscription_tier: true,
        preferences: true,
        created_at: true,
      },
    }),
    db.$queryRaw<
      {
        total_distance_km: number | null;
        total_trips: number | null;
        places_visited: bigint | number;
        states_explored: bigint | number;
        cities_visited: bigint | number;
        photos_and_memories: bigint | number;
        longest_trip_km: number | null;
        total_duration_min: number | null;
        saved_places_count: bigint | number;
        want_to_go_count: bigint | number;
      }[]
    >`
      SELECT
        COALESCE(u.total_distance_km, (SELECT COALESCE(SUM(actual_distance_km), 0) FROM trips WHERE user_id = ${userId}::uuid AND status = 'completed')) as total_distance_km,
        COALESCE(u.total_trips, (SELECT COUNT(*) FROM trips WHERE user_id = ${userId}::uuid AND status = 'completed'))::int as total_trips,
        (SELECT COUNT(DISTINCT poi_id) FROM poi_status WHERE user_id = ${userId}::uuid AND status = 'visited')::int as places_visited,
        (
          SELECT COUNT(DISTINCT pm.state)
          FROM poi_status ps
          JOIN pois p ON p.id = ps.poi_id
          JOIN poi_metadata pm ON pm.poi_id = p.id
          WHERE ps.user_id = ${userId}::uuid AND ps.status = 'visited' AND pm.state IS NOT NULL AND TRIM(pm.state) != ''
        )::int as states_explored,
        (
          SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(pm.city), ''), NULLIF(TRIM(pm.district), '')))
          FROM poi_status ps
          JOIN pois p ON p.id = ps.poi_id
          JOIN poi_metadata pm ON pm.poi_id = p.id
          WHERE ps.user_id = ${userId}::uuid AND ps.status = 'visited' AND (pm.city IS NOT NULL OR pm.district IS NOT NULL)
        )::int as cities_visited,
        (SELECT COUNT(*) FROM memories WHERE user_id = ${userId}::uuid AND deleted_at IS NULL)::int as photos_and_memories,
        (SELECT COALESCE(MAX(actual_distance_km), 0) FROM trips WHERE user_id = ${userId}::uuid AND status = 'completed') as longest_trip_km,
        (SELECT COALESCE(SUM(actual_duration_min), 0) FROM trips WHERE user_id = ${userId}::uuid AND status = 'completed') as total_duration_min,
        (SELECT COUNT(*) FROM poi_status WHERE user_id = ${userId}::uuid AND status = 'saved')::int as saved_places_count,
        (SELECT COUNT(*) FROM poi_status WHERE user_id = ${userId}::uuid AND status = 'want_to_go')::int as want_to_go_count
      FROM users u
      WHERE u.id = ${userId}::uuid
    `,
    db.user_achievements.findMany({
      where: { user_id: userId },
      select: { badge_key: true, unlocked_at: true },
    }),
    db.trips.findMany({
      where: { user_id: userId },
      orderBy: { completed_at: "desc" },
      take: 3,
    }),
    db.memories.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: "desc" },
      take: 6,
      select: {
        id: true,
        photo_url: true,
        thumbnail_url: true,
        caption: true,
        created_at: true,
      },
    }),
    db.collections.count({
      where: { user_id: userId },
    }),
  ]);

  if (!user) {
    throw Object.assign(new Error("User profile not found"), { status: 404 });
  }

  const statsRow = statsRows[0];
  const totalDistanceKm = statsRow?.total_distance_km ? Number(statsRow.total_distance_km) : 0;
  const totalTrips = statsRow?.total_trips ? Number(statsRow.total_trips) : 0;
  const placesVisited = Number(statsRow?.places_visited ?? 0);
  const statesExplored = Number(statsRow?.states_explored ?? 0);
  const citiesVisited = Number(statsRow?.cities_visited ?? 0);
  const photosAndMemories = Number(statsRow?.photos_and_memories ?? 0);
  const longestTripKm = statsRow?.longest_trip_km ? Number(statsRow.longest_trip_km) : 0;
  const totalDurationMin = statsRow?.total_duration_min ? Number(statsRow.total_duration_min) : 0;
  const totalTravelDurationHours = Math.round((totalDurationMin / 60) * 10) / 10;

  const stats: TravelStats = {
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTrips,
    placesVisited,
    statesExplored,
    citiesVisited,
    photosAndMemories,
    longestTripKm: Math.round(longestTripKm * 10) / 10,
    totalTravelDurationHours,
  };

  // 2. Only run breakdown query if user has visited places or completed trips
  let visitedBreakdown: {
    himalayan_visits: number;
    heritage_visits: number;
    sunset_visits: number;
    trek_visits: number;
    multi_day_trips: number;
  } = {
    himalayan_visits: 0,
    heritage_visits: 0,
    sunset_visits: 0,
    trek_visits: 0,
    multi_day_trips: 0,
  };

  if (placesVisited > 0 || totalTrips > 0) {
    const [breakdownRow] = await db.$queryRaw<
      {
        himalayan_visits: bigint | number;
        heritage_visits: bigint | number;
        sunset_visits: bigint | number;
        trek_visits: bigint | number;
        multi_day_trips: bigint | number;
      }[]
    >`
      SELECT
        (
          SELECT COUNT(DISTINCT ps.poi_id)
          FROM poi_status ps
          JOIN pois p ON p.id = ps.poi_id
          JOIN poi_metadata pm ON pm.poi_id = p.id
          WHERE ps.user_id = ${userId}::uuid
            AND ps.status = 'visited'
            AND LOWER(pm.state) = ANY(${HIMALAYAN_STATES})
        )::int as himalayan_visits,
        (
          SELECT COUNT(DISTINCT ps.poi_id)
          FROM poi_status ps
          JOIN pois p ON p.id = ps.poi_id
          WHERE ps.user_id = ${userId}::uuid
            AND ps.status = 'visited'
            AND (LOWER(p.category) IN ('heritage', 'monument', 'fort', 'temple') OR 'heritage' = ANY(p.tags))
        )::int as heritage_visits,
        (
          SELECT COUNT(DISTINCT ps.poi_id)
          FROM poi_status ps
          JOIN pois p ON p.id = ps.poi_id
          WHERE ps.user_id = ${userId}::uuid
            AND ps.status = 'visited'
            AND (LOWER(p.category) IN ('viewpoint', 'scenic', 'sunset', 'hill') OR 'sunset' = ANY(p.tags))
        )::int as sunset_visits,
        (
          SELECT COUNT(DISTINCT ps.poi_id)
          FROM poi_status ps
          JOIN pois p ON p.id = ps.poi_id
          WHERE ps.user_id = ${userId}::uuid
            AND ps.status = 'visited'
            AND LOWER(p.category) IN ('trek', 'trail', 'waterfall')
        )::int as trek_visits,
        (
          SELECT COUNT(*)
          FROM trips
          WHERE user_id = ${userId}::uuid AND status = 'completed' AND day_count >= 2
        )::int as multi_day_trips
    `;
    if (breakdownRow) {
      visitedBreakdown = {
        himalayan_visits: Number(breakdownRow.himalayan_visits ?? 0),
        heritage_visits: Number(breakdownRow.heritage_visits ?? 0),
        sunset_visits: Number(breakdownRow.sunset_visits ?? 0),
        trek_visits: Number(breakdownRow.trek_visits ?? 0),
        multi_day_trips: Number(breakdownRow.multi_day_trips ?? 0),
      };
    }
  }

  // 3. Evaluate Achievements
  const existingUnlocks = new Map(existingAchRows.map((a) => [a.badge_key, a.unlocked_at]));
  const achievements = evaluateAchievements(
    stats,
    {
      himalayanVisits: visitedBreakdown.himalayan_visits,
      heritageVisits: visitedBreakdown.heritage_visits,
      sunsetVisits: visitedBreakdown.sunset_visits,
      trekVisits: visitedBreakdown.trek_visits,
      multiDayTrips: visitedBreakdown.multi_day_trips,
    },
    existingUnlocks,
  );

  // Sync newly unlocked badges into database asynchronously
  for (const ach of achievements) {
    if (ach.isUnlocked && !existingUnlocks.has(ach.badgeKey)) {
      db.user_achievements
        .upsert({
          where: { user_id_badge_key: { user_id: userId, badge_key: ach.badgeKey } },
          create: {
            user_id: userId,
            badge_key: ach.badgeKey,
            progress: ach.progress,
            target_value: ach.targetValue,
            unlocked_at: new Date(),
          },
          update: { progress: ach.progress },
        })
        .catch(() => {});

      dispatchNotification({
        userId,
        type: "achievement_unlocked",
        title: "New Badge Unlocked! 🏆",
        subtitle: `You earned the "${ach.title}" travel milestone badge.`,
        data: {
          entityType: "achievement",
          entityId: ach.badgeKey,
        },
        idempotencyKey: `badge_${userId}_${ach.badgeKey}`,
      }).catch(() => {});
    }
  }

  // Pick Featured Badge
  const featuredAchievement =
    achievements.find((a) => a.badgeKey === "himalayan_explorer" && a.isUnlocked) ||
    achievements.find((a) => a.badgeKey === "500_km_club" && a.isUnlocked) ||
    achievements.find((a) => a.isUnlocked) ||
    achievements[0] ||
    null;

  // 4. Populate Trip Details
  const tripIds = rawTrips.map((t) => t.id);
  const stopCounts = tripIds.length > 0
    ? await db.trip_stops.groupBy({
        by: ["trip_id"],
        where: { trip_id: { in: tripIds } },
        _count: { _all: true },
      })
    : [];
  const countByTrip = new Map(stopCounts.map((s) => [s.trip_id, s._count._all]));

  const recentTrips: RecentTripSummary[] = rawTrips.map((t) => ({
    id: t.id,
    title: t.title,
    destination: t.destination,
    coverPhotoUrl: null,
    startDate: t.started_at ? t.started_at.toISOString() : (t.created_at?.toISOString() ?? new Date().toISOString()),
    completedDate: t.completed_at ? t.completed_at.toISOString() : null,
    actualDistanceKm: t.actual_distance_km ? Number(t.actual_distance_km) : 0,
    actualDurationMin: t.actual_duration_min ? Number(t.actual_duration_min) : 0,
    stopCount: countByTrip.get(t.id) ?? 0,
    dayCount: t.day_count ?? 1,
  }));

  // Fetch covers for recent trips
  if (tripIds.length > 0) {
    const covers = await db.$queryRaw<{ trip_id: string; photo_url: string | null }[]>`
      select distinct on (ts.trip_id) ts.trip_id, m.photo_url
      from trip_stops ts
      left join memories m on m.poi_id = ts.poi_id and m.visibility = 'public'
      where ts.trip_id = any(${tripIds}::uuid[])
      order by ts.trip_id, ts.day_number asc, ts.sort_order asc, m.created_at asc
    `;
    const coverMap = new Map(covers.map((c) => [c.trip_id, c.photo_url]));
    for (const rt of recentTrips) {
      rt.coverPhotoUrl = coverMap.get(rt.id) ?? null;
    }
  }

  // 5. Recent Memories
  const recentMemories: RecentMemorySummary[] = rawMemories.map((m) => ({
    id: m.id,
    photoUrl: m.photo_url,
    thumbnailUrl: m.thumbnail_url || m.photo_url,
    caption: m.caption,
    createdAt: m.created_at ? m.created_at.toISOString() : new Date().toISOString(),
  }));

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      bannerUrl: (user.preferences as any)?.bannerUrl || null,
      bio: user.bio,
      homeCity: user.home_city,
      subscriptionTier: user.subscription_tier || "free",
      createdAt: user.created_at ? user.created_at.toISOString() : new Date().toISOString(),
    },
    stats,
    featuredAchievement,
    achievements,
    recentTrips,
    recentMemories,
    savedCounts: {
      savedPlaces: Number(statsRow?.saved_places_count ?? 0),
      wantToGo: Number(statsRow?.want_to_go_count ?? 0),
      collections: collectionsCount,
    },
  };
}

export async function updateUserProfile(
  userId: string,
  input: {
    fullName?: string;
    bio?: string;
    homeCity?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  },
) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const currentPrefs = (user?.preferences as any) || {};

  const data: Record<string, any> = { updated_at: new Date() };
  if (input.fullName !== undefined) data.full_name = input.fullName.trim() || null;
  if (input.bio !== undefined) data.bio = input.bio.trim() || null;
  if (input.homeCity !== undefined) data.home_city = input.homeCity.trim() || null;
  if (input.avatarUrl !== undefined) data.avatar_url = input.avatarUrl.trim() || null;
  if (input.bannerUrl !== undefined) {
    data.preferences = {
      ...currentPrefs,
      bannerUrl: input.bannerUrl.trim() || null,
    };
  }

  const updated = await db.users.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      full_name: true,
      avatar_url: true,
      bio: true,
      home_city: true,
      preferences: true,
      subscription_tier: true,
      created_at: true,
    },
  });

  return {
    ...updated,
    banner_url: (updated.preferences as any)?.bannerUrl || null,
  };
}
