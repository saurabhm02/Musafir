import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { poisRoutes } from "./routes/pois";
import { memoriesRoutes } from "./routes/memories";
import { routeSearchRoutes } from "./routes/routeSearch";
import { uploadRoutes } from "./routes/upload";

Bun.serve({
  port: 3001,
  routes: {
    ...healthRoutes,
    ...authRoutes,
    ...meRoutes,
    ...poisRoutes,
    ...memoriesRoutes,
    ...routeSearchRoutes,
    ...uploadRoutes,
  },
});

console.log("server listening on http://localhost:3001");
