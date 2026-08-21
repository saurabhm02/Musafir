import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

export async function verifyUser(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), jwks);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// input: a handler that needs a logged-in user
// output: a route handler that 401s instead of calling it when there isn't one
export function protectedRoute(handler: (req: Request, userId: string) => Promise<Response>) {
  return async (req: Request) => {
    const userId = await verifyUser(req);
    if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
    try {
      return await handler(req, userId);
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 500;
      if (status !== 400) console.error(err);
      return Response.json({ error: (err as Error).message ?? "request failed" }, { status });
    }
  };
}
