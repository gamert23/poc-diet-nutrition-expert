import "server-only";
import { z } from "zod";
import { requireEnv } from "./env";
import { HttpError } from "./http";
import { MEAL_TYPES } from "./types";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;

const nonNegative = z.coerce.number().min(0).catch(0);

export const foodAnalysisSchema = z.object({
  food_name: z.string().min(1),
  portion_estimate: z.string().catch(""),
  calories: nonNegative,
  protein_g: nonNegative,
  carbs_g: nonNegative,
  fat_g: nonNegative,
  sodium_mg: nonNegative,
  sugar_g: nonNegative,
  health_advice: z.string().catch(""),
});
export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;

export const ingredientListSchema = z.object({
  ingredients: z.array(z.string().min(1)).max(30),
});

export const recipeSchema = z.object({
  recipe_name: z.string().min(1),
  used_ingredients: z.array(z.string()).catch([]),
  missing_optional_ingredients: z.array(z.string()).catch([]),
  calories: nonNegative,
  protein_g: nonNegative,
  carbs_g: nonNegative,
  fat_g: nonNegative,
  sodium_mg: nonNegative,
  sugar_g: nonNegative,
  cooking_time_mins: nonNegative,
  instructions: z.array(z.string()).min(1),
  medical_safety_note: z.string().catch(""),
});
export type Recipe = z.infer<typeof recipeSchema>;

export const mealPlanSchema = z.object({
  meals: z
    .array(
      z.object({
        plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        meal_type: z.enum(MEAL_TYPES),
        recipe_name: z.string().min(1),
        ingredients: z.array(z.object({ name: z.string(), amount: z.string().catch("") })).catch([]),
        instructions: z.array(z.string()).catch([]),
        calories: nonNegative,
        protein_g: nonNegative,
        carbs_g: nonNegative,
        fat_g: nonNegative,
        cost_thb: nonNegative,
      }),
    )
    .min(1),
});
export type GeneratedMealPlan = z.infer<typeof mealPlanSchema>;

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } };

interface CompletionOptions {
  system: string;
  user: string | ContentPart[];
  json: boolean;
  maxTokens?: number;
}

async function complete({ system, user, json, maxTokens = 1500 }: CompletionOptions): Promise<string> {
  let response: Response;
  try {
    response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        temperature: 0.4,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("OpenAI request failed", error);
    throw new HttpError(502, "AI service is unreachable. Please try again.");
  }

  if (!response.ok) {
    console.error("OpenAI error", response.status, await response.text());
    throw new HttpError(response.status === 429 ? 429 : 502, "AI service returned an error. Please try again.");
  }

  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, "AI service returned an empty response.");
  return content;
}

async function completeJson<T>(schema: z.ZodType<T>, options: Omit<CompletionOptions, "json">): Promise<T> {
  const content = await complete({ ...options, json: true });
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, "AI response was not valid JSON.");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error("AI response failed validation", result.error.issues);
    throw new HttpError(502, "AI response had an unexpected format.");
  }
  return result.data;
}

function imagePart(dataUrl: string): ContentPart {
  return { type: "image_url", image_url: { url: dataUrl, detail: "auto" } };
}

export function analyzeFoodImage(system: string, imageDataUrl: string) {
  return completeJson(foodAnalysisSchema, {
    system,
    user: [{ type: "text", text: "Analyze this meal." }, imagePart(imageDataUrl)],
  });
}

export function detectIngredients(system: string, imageDataUrl: string) {
  return completeJson(ingredientListSchema, {
    system,
    user: [{ type: "text", text: "List the ingredients in this photo." }, imagePart(imageDataUrl)],
  });
}

export function generateRecipe(system: string) {
  return completeJson(recipeSchema, { system, user: "Create the recipe now." });
}

export function generateMealPlan(system: string, days: number) {
  return completeJson(mealPlanSchema, { system, user: "Create the meal plan now.", maxTokens: 1200 * days });
}

export function chatReply(system: string, message: string) {
  return complete({ system, user: message, json: false, maxTokens: 500 });
}
