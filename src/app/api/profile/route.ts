import { NextResponse } from "next/server";
import { authenticate, findProfile } from "@/lib/auth";
import { handleRoute } from "@/lib/http";
import { calculateCalorieGoal } from "@/lib/nutrition";
import { profileInputSchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";

export const GET = handleRoute(async (request: Request) => {
  const identity = await authenticate(request);
  const profile = await findProfile(identity.lineUserId);
  return NextResponse.json({ profile, displayName: identity.displayName });
});

export const PUT = handleRoute(async (request: Request) => {
  const identity = await authenticate(request);
  const input = profileInputSchema.parse(await request.json());
  const goal = calculateCalorieGoal({
    gender: input.gender,
    age: input.age,
    heightCm: input.height_cm,
    weightKg: input.current_weight_kg,
    activityLevel: input.activity_level,
  });

  const { data, error } = await getSupabase()
    .from("profiles")
    .upsert(
      {
        line_user_id: identity.lineUserId,
        display_name: identity.displayName,
        ...input,
        bmr: goal.bmr,
        tdee: goal.tdee,
        target_calories: goal.targetCalories,
        protein_target_g: goal.proteinTargetG,
        carbs_target_g: goal.carbsTargetG,
        fat_target_g: goal.fatTargetG,
      },
      { onConflict: "line_user_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save profile: ${error.message}`);
  return NextResponse.json({ profile: data });
});
