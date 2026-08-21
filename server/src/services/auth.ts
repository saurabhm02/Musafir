const AUTH_URL = `${process.env.SUPABASE_URL}/auth/v1`;
const headers = { apikey: process.env.SUPABASE_ANON_KEY!, "Content-Type": "application/json" };

// All four just forward to Supabase Auth and hand back its response body
// as-is -- the mobile client never talks to Supabase directly, only to us.
export async function signUp(email: string, password: string) {
  const res = await fetch(`${AUTH_URL}/signup`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  return { status: res.status, body: await res.json() };
}

export async function signIn(email: string, password: string) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  return { status: res.status, body: await res.json() };
}

export async function signInAnonymously() {
  const res = await fetch(`${AUTH_URL}/signup`, { method: "POST", headers, body: "{}" });
  return { status: res.status, body: await res.json() };
}

// input: the caller's own current access token (from an anonymous session) + new email/password
// output: Supabase's response -- upgrades that same account in place, same user id
export async function linkAccount(accessToken: string, email: string, password: string) {
  const res = await fetch(`${AUTH_URL}/user`, {
    method: "PUT",
    headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json() };
}
