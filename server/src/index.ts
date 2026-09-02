import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { poisRoutes } from "./routes/pois";
import { memoriesRoutes } from "./routes/memories";
import { routeSearchRoutes } from "./routes/routeSearch";
import { uploadRoutes } from "./routes/upload";
import { tripsRoutes } from "./routes/trips";
import { poiStatusRoutes } from "./routes/poiStatus";
import { photoReviewRoutes } from "./routes/photoReview";
import { navigationRoutes } from "./routes/navigation";
import { collectionsRoutes } from "./routes/collections";
import { notificationsRoutes } from "./routes/notifications";
import { adminMemoriesRoutes } from "./routes/adminMemories";
import { corridorSearchRoutes } from "./routes/corridorSearch";
import { profileRoutes } from "./routes/profile";
import { savedPlacesRoutes } from "./routes/savedPlaces";
import { wantToGoRoutes } from "./routes/wantToGo";
import { visitedPoisRoutes } from "./routes/visitedPois";
import { treksRoutes } from "./routes/treks";
import { adminTrekRoutes } from "./routes/adminTrekRoutes";
import { journeysRoutes } from "./routes/journeys";
import { trekTrackingRoutes } from "./routes/trekTracking";

Bun.serve({
  port: 3001,
  idleTimeout: 120,
  routes: {
    ...healthRoutes,
    ...authRoutes,
    ...meRoutes,
    ...profileRoutes,
    ...savedPlacesRoutes,
    ...wantToGoRoutes,
    ...visitedPoisRoutes,
    ...poisRoutes,
    ...treksRoutes,
    ...adminTrekRoutes,
    ...journeysRoutes,
    ...trekTrackingRoutes,
    ...memoriesRoutes,
    ...routeSearchRoutes,
    ...corridorSearchRoutes,
    ...uploadRoutes,
    ...tripsRoutes,
    ...poiStatusRoutes,
    ...photoReviewRoutes,
    ...navigationRoutes,
    ...collectionsRoutes,
    ...notificationsRoutes,
    ...adminMemoriesRoutes,
  },
});

console.log("server listening on http://localhost:3001");
