import { ensureSession } from "./supabase";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

// Input: a server path and optional fetch options
// Output: the parsed JSON response
// Every data call goes through the server now, never straight to Supabase --
// this is what attaches the session token the server verifies.
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await ensureSession();
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session!.access_token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}
