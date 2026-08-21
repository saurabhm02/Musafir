import { signUp, signIn, signInAnonymously, linkAccount } from "../services/auth";

function json(req: Request) {
  return req.json() as Promise<{ email?: string; password?: string }>;
}

export const authRoutes = {
  "/auth/signup": {
    POST: async (req: Request) => {
      const { email, password } = await json(req);
      const { status, body } = await signUp(email!, password!);
      return Response.json(body, { status });
    },
  },
  "/auth/signin": {
    POST: async (req: Request) => {
      const { email, password } = await json(req);
      const { status, body } = await signIn(email!, password!);
      return Response.json(body, { status });
    },
  },
  "/auth/anonymous": {
    POST: async () => {
      const { status, body } = await signInAnonymously();
      return Response.json(body, { status });
    },
  },
  "/auth/link": {
    PUT: async (req: Request) => {
      const token = req.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
      const { email, password } = await json(req);
      const { status, body } = await linkAccount(token, email!, password!);
      return Response.json(body, { status });
    },
  },
};
