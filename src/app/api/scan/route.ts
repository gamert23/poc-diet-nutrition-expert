import { NextResponse } from "next/server";
import { analyzeFoodImage } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { HttpError, handleRoute } from "@/lib/http";
import { readImageUpload, storeImage } from "@/lib/meals";
import { foodScannerPrompt } from "@/lib/prompts";
import { evaluateMealWarnings } from "@/lib/safety";

export const maxDuration = 60;

// FR-2.1 / FR-2.2 / FR-2.3: analyze a food photo. The result is not saved until
// the user confirms it via POST /api/meals.
export const POST = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const image = await readImageUpload(await request.formData());
  const { storagePath, dataUrl } = await storeImage(profile.id, "food", image);

  const analysis = await analyzeFoodImage(foodScannerPrompt(profile.medical_conditions), dataUrl);
  if (analysis.food_name === "NOT_FOOD") {
    throw new HttpError(422, "ไม่พบอาหารในภาพ กรุณาถ่ายใหม่อีกครั้ง");
  }

  return NextResponse.json({
    analysis,
    warning_flags: evaluateMealWarnings(analysis, profile.medical_conditions),
    image_path: storagePath,
  });
});
