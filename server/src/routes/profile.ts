import { protectedRoute } from "../middleware/auth";
import { getUserProfile, updateUserProfile } from "../services/profile";

export const profileRoutes = {
  "/profile/me": {
    GET: protectedRoute(async (_req, userId) => {
      const profile = await getUserProfile(userId);
      return Response.json(profile);
    }),
    PATCH: protectedRoute(async (req, userId) => {
      const body = (await req.json()) as {
        fullName?: string;
        bio?: string;
        homeCity?: string;
        avatarUrl?: string;
        bannerUrl?: string;
      };
      const updated = await updateUserProfile(userId, body);
      return Response.json(updated);
    }),
  },
  "/profile/achievements": {
    GET: protectedRoute(async (_req, userId) => {
      const profile = await getUserProfile(userId);
      return Response.json({
        featured: profile.featuredAchievement,
        achievements: profile.achievements,
      });
    }),
  },
};
