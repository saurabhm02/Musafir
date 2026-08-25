import { api } from "./api";

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

export type UserProfile = {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
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

export async function fetchUserProfile(): Promise<UserProfile> {
  return api<UserProfile>("/profile/me");
}

export async function updateUserProfile(data: {
  fullName?: string;
  bio?: string;
  homeCity?: string;
  avatarUrl?: string;
}): Promise<UserProfile["user"]> {
  return api<UserProfile["user"]>("/profile/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function fetchUserAchievements(): Promise<{
  featured: AchievementBadge | null;
  achievements: AchievementBadge[];
}> {
  return api<{
    featured: AchievementBadge | null;
    achievements: AchievementBadge[];
  }>("/profile/achievements");
}
