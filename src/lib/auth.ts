import "server-only";
import { HttpError } from "./http";
import { requireEnv } from "./env";
import { getSupabase } from "./supabase";
import type { Profile } from "./types";

export interface LineIdentity {
  lineUserId: string;
  displayName: string | null;
}

const VERIFY_ENDPOINT = "https://api.line.me/oauth2/v2.1/verify";

function devIdentity(request: Request): LineIdentity | null {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEV_AUTH !== "true") return null;
  const devUserId = request.headers.get("x-dev-line-user-id");
  return devUserId ? { lineUserId: devUserId, displayName: "Dev User" } : null;
}

// Verifies the LIFF ID token with LINE so the user id cannot be spoofed by the client.
export async function authenticate(request: Request): Promise<LineIdentity> {
  const dev = devIdentity(request);
  if (dev) return dev;

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) throw new HttpError(401, "Missing LIFF ID token");

  const response = await fetch(VERIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: requireEnv("LINE_LOGIN_CHANNEL_ID") }),
  });
  if (!response.ok) throw new HttpError(401, "Invalid or expired LIFF ID token");

  const payload = (await response.json()) as { sub?: string; name?: string };
  if (!payload.sub) throw new HttpError(401, "LIFF ID token has no subject");
  return { lineUserId: payload.sub, displayName: payload.name ?? null };
}

export async function findProfile(lineUserId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data as Profile | null;
}

export async function requireProfile(request: Request): Promise<Profile> {
  const identity = await authenticate(request);
  const profile = await findProfile(identity.lineUserId);
  if (!profile) throw new HttpError(409, "Profile not found. Please complete onboarding first.");
  return profile;
}
