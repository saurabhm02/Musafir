import { protectedRoute } from "../middleware/auth";
import { uploadAsset } from "../services/storage";

export const uploadRoutes = {
  "/upload": {
    POST: protectedRoute(async (req) => {
      const path = new URL(req.url).searchParams.get("path");
      if (!path) return Response.json({ error: "missing ?path=" }, { status: 400 });
      const contentType = req.headers.get("content-type") ?? "application/octet-stream";
      const bytes = await req.arrayBuffer();
      try {
        const url = await uploadAsset(path, bytes, contentType);
        return Response.json({ url });
      } catch (err) {
        console.error("upload failed:", err);
        return Response.json({ error: "upload failed" }, { status: 502 });
      }
    }),
  },
};
