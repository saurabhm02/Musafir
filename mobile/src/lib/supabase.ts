import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

// supabase-js here only stores/refreshes the session locally (AsyncStorage) --
// it never calls Supabase directly. Every auth action goes through our backend
// first, and the resulting tokens get handed to this client with setSession().
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

async function adoptSession(body: any) {
  if (body.access_token) {
    await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
  } else {
    throw new Error(body.msg ?? body.error_description ?? "auth failed");
  }
}

// Input: nothing
// Output: a real logged-in session -- anonymous if the user chose "guest"
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const res = await fetch(`${SERVER_URL}/auth/anonymous`, { method: "POST" });
  await adoptSession(await res.json());
  return (await supabase.auth.getSession()).data.session;
}

// Input: email + password
// Output: nothing -- signs up as a new account, or upgrades the current
// guest session in place so any POIs/photos already created stay theirs
// (Supabase's documented anonymous->permanent conversion; same user id).
export async function signUp(email: string, password: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.is_anonymous) {
    const res = await fetch(`${SERVER_URL}/auth/link`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).msg ?? "sign up failed");
    return;
  }
  const res = await fetch(`${SERVER_URL}/auth/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  await adoptSession(await res.json());
}

// Input: email + password of an existing account
// Output: nothing -- signs in, replacing any guest session
export async function signIn(email: string, password: string) {
  const res = await fetch(`${SERVER_URL}/auth/signin`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  await adoptSession(await res.json());
}

// Signs out the current user and clears local session
export async function signOut() {
  await supabase.auth.signOut();
}

