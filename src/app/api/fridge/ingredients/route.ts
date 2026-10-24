import { NextResponse } from "next/server";
import { detectIngredients } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { handleRoute } from "@/lib/http";
import { readImageUpload, storeImage } from "@/lib/meals";
import { fridgeIngredientsPrompt } from "@/lib/prompts";

export const maxDuration = 60;

// FR-3.1 (1): detect ingredients from a fridge photo.
export const POST = handleRoute(async (request: Request) => {
  const profile = await requireProfile(request);
  const image = await readImageUpload(await request.formData());
  const { dataUrl } = await storeImage(profile.id, "fridge", image);
  const { ingredients } = await detectIngredients(fridgeIngredientsPrompt(), dataUrl);
  return NextResponse.json({ ingredients: [...new Set(ingredients.map((name) => name.trim()))] });
});
