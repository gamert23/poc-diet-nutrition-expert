import "server-only";
import { randomUUID } from "node:crypto";
import { bangkokDayRange } from "./date";
import { HttpError } from "./http";
import { sumNutrients } from "./nutrition";
import { getSupabase, PHOTO_BUCKET } from "./supabase";
import type { MealLog, NutrientValues } from "./types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface DailyMeals {
  logs: MealLog[];
  totals: NutrientValues;
}

export async function getDailyMeals(profileId: string, date: string): Promise<DailyMeals> {
  const { start, end } = bangkokDayRange(date);
  const { data, error } = await getSupabase()
    .from("meal_logs")
    .select("*")
    .eq("user_id", profileId)
    .gte("logged_at", start)
    .lt("logged_at", end)
    .order("logged_at", { ascending: true });
  if (error) throw new Error(`Failed to load meal logs: ${error.message}`);
  const logs = (data ?? []) as MealLog[];
  return { logs, totals: sumNutrients(logs) };
}

export async function withSignedImageUrls(logs: MealLog[]): Promise<MealLog[]> {
  const paths = logs.map((log) => log.image_url).filter((path): path is string => Boolean(path));
  if (paths.length === 0) return logs;
  const { data, error } = await getSupabase().storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("Failed to sign image URLs", error);
    return logs.map((log) => ({ ...log, image_url: null }));
  }
  const signedByPath = new Map(data.map((item) => [item.path, item.signedUrl]));
  return logs.map((log) => ({ ...log, image_url: log.image_url ? (signedByPath.get(log.image_url) ?? null) : null }));
}

export interface UploadedImage {
  storagePath: string;
  dataUrl: string;
}

export async function readImageUpload(formData: FormData, field = "image"): Promise<{ bytes: Buffer; mimeType: string }> {
  const file = formData.get(field);
  if (!(file instanceof File)) throw new HttpError(400, "Image file is required");
  if (!ALLOWED_IMAGE_TYPES[file.type]) throw new HttpError(415, "Only JPEG, PNG, or WebP images are supported");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Image must be 5 MB or smaller");
  return { bytes: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}

// Stores the photo (SRD: Supabase Storage keeps food and fridge photos) and returns
// a data URL for the vision model so the model never needs storage access.
export async function storeImage(
  profileId: string,
  folder: "food" | "fridge",
  image: { bytes: Buffer; mimeType: string },
): Promise<UploadedImage> {
  const storagePath = `${profileId}/${folder}/${randomUUID()}.${ALLOWED_IMAGE_TYPES[image.mimeType]}`;
  const { error } = await getSupabase()
    .storage.from(PHOTO_BUCKET)
    .upload(storagePath, image.bytes, { contentType: image.mimeType, upsert: false });
  if (error) throw new Error(`Failed to upload image: ${error.message}`);
  return { storagePath, dataUrl: `data:${image.mimeType};base64,${image.bytes.toString("base64")}` };
}
