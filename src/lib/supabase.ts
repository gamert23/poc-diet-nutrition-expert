import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export const PHOTO_BUCKET = "food-photos";

let client: SupabaseClient | null = null;

// Service-role client: only ever used server-side after the caller is authenticated.
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
