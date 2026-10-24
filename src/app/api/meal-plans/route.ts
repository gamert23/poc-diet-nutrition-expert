import { NextResponse } from "next/server";
import { generateMealPlan } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { addDays, bangkokDate, isValidDateString } from "@/lib/date";
import { HttpError, handleRoute } from "@/lib/http";
import { mealPlanPrompt } from "@/lib/prompts";
import { mealPlanRequestSchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import { MEAL_TYPES } from "@/lib/types";

export const maxDuration = 120;

export const GET = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? bangkokDate();
  const to = params.get("to") ?? addDays(from, 6);
  if (!isValidDateString(from) || !isValidDateString(to)) throw new HttpError(400, "from/to must be YYYY-MM-DD");

  const { data, error } = await getSupabase()
    .from("meal_plans")
    .select("*")
    .eq("user_id", profile.id)
    .gte("plan_date", from)
    .lte("plan_date", to)
    .order("plan_date", { ascending: true });
  if (error) throw new Error(`Failed to load meal plans: ${error.message}`);
  const plans = (data ?? []).sort(
    (a, b) => a.plan_date.localeCompare(b.plan_date) || MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type),
  );
  return NextResponse.json({ from, to, plans });
});

// FR-4.1 / FR-4.2: generate a daily or weekly plan (3 meals + snack per day),
// replacing any existing plan for those dates.
export const POST = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const input = mealPlanRequestSchema.parse(await request.json());
  const startDate = input.start_date ?? bangkokDate();
  const dates = Array.from({ length: input.days }, (_, index) => addDays(startDate, index));

  const generated = await generateMealPlan(
    mealPlanPrompt({
      dates,
      targetCalories: Number(profile.target_calories),
      proteinTargetG: Number(profile.protein_target_g),
      carbsTargetG: Number(profile.carbs_target_g),
      fatTargetG: Number(profile.fat_target_g),
      conditions: profile.medical_conditions,
      allergies: profile.allergies,
      dailyBudgetThb: profile.daily_budget_thb === null ? null : Number(profile.daily_budget_thb),
      availableIngredients: input.ingredients,
    }),
    input.days,
  );

  const seen = new Set<string>();
  const rows = generated.meals
    .filter((meal) => {
      const key = `${meal.plan_date}:${meal.meal_type}`;
      if (!dates.includes(meal.plan_date) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((meal) => ({
      user_id: profile.id,
      plan_date: meal.plan_date,
      meal_type: meal.meal_type,
      recipe_name: meal.recipe_name,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
      estimated_calories: meal.calories,
      estimated_protein_g: meal.protein_g,
      estimated_carbs_g: meal.carbs_g,
      estimated_fat_g: meal.fat_g,
      estimated_cost_thb: meal.cost_thb,
    }));
  if (rows.length === 0) throw new HttpError(502, "AI did not return a usable meal plan. Please try again.");

  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from("meal_plans")
    .delete()
    .eq("user_id", profile.id)
    .in("plan_date", dates);
  if (deleteError) throw new Error(`Failed to clear old meal plans: ${deleteError.message}`);

  const { data, error } = await supabase.from("meal_plans").insert(rows).select("*");
  if (error) throw new Error(`Failed to save meal plans: ${error.message}`);
  return NextResponse.json({ plans: data }, { status: 201 });
});
