import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { bangkokDate, isValidDateString } from "@/lib/date";
import { HttpError, handleRoute } from "@/lib/http";
import { getDailyMeals, withSignedImageUrls } from "@/lib/meals";
import { evaluateMealWarnings } from "@/lib/safety";
import { mealLogInputSchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";

export const GET = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const date = new URL(request.url).searchParams.get("date") ?? bangkokDate();
  if (!isValidDateString(date)) throw new HttpError(400, "date must be YYYY-MM-DD");

  const { logs, totals } = await getDailyMeals(profile.id, date);
  return NextResponse.json({
    date,
    logs: await withSignedImageUrls(logs),
    totals,
    targets: {
      calories: Number(profile.target_calories),
      protein_g: Number(profile.protein_target_g),
      carbs_g: Number(profile.carbs_target_g),
      fat_g: Number(profile.fat_target_g),
    },
  });
});

export const POST = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const { image_path, ...meal } = mealLogInputSchema.parse(await request.json());
  if (image_path && !image_path.startsWith(`${profile.id}/food/`)) {
    throw new HttpError(403, "Image does not belong to this user");
  }

  const { data, error } = await getSupabase()
    .from("meal_logs")
    .insert({
      ...meal,
      user_id: profile.id,
      image_url: image_path,
      warning_flags: evaluateMealWarnings(meal, profile.medical_conditions),
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save meal: ${error.message}`);
  return NextResponse.json({ meal: data }, { status: 201 });
});

export const DELETE = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new HttpError(400, "id is required");

  const { data, error } = await getSupabase()
    .from("meal_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id)
    .select("id");
  if (error) throw new Error(`Failed to delete meal: ${error.message}`);
  if (!data || data.length === 0) throw new HttpError(404, "Meal not found");
  return new NextResponse(null, { status: 204 });
});
