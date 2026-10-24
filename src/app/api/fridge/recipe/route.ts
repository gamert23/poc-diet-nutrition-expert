import { NextResponse } from "next/server";
import { generateRecipe } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { bangkokDate } from "@/lib/date";
import { handleRoute } from "@/lib/http";
import { getDailyMeals } from "@/lib/meals";
import { fridgeRecipePrompt } from "@/lib/prompts";
import { evaluateMealWarnings } from "@/lib/safety";
import { recipeRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

// FR-3.2: recipe from available ingredients, bounded by today's remaining calories,
// medical conditions, and cooking equipment.
export const POST = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const input = recipeRequestSchema.parse(await request.json());
  const { totals } = await getDailyMeals(profile.id, bangkokDate());
  const remainingCalories = Number(profile.target_calories) - totals.calories;

  const recipe = await generateRecipe(
    fridgeRecipePrompt({
      ingredients: input.ingredients,
      remainingCalories,
      conditions: profile.medical_conditions,
      equipment: input.cooking_equipment ?? profile.cooking_equipment,
      allergies: profile.allergies,
    }),
  );

  return NextResponse.json({
    recipe,
    remaining_calories: Math.round(remainingCalories),
    warning_flags: evaluateMealWarnings(recipe, profile.medical_conditions),
  });
});
