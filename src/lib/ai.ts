import "server-only";
import { z } from "zod";
import { requireEnv } from "./env";
import { HttpError } from "./http";
import { MEAL_TYPES } from "./types";

// Any OpenAI-compatible chat completions API works, e.g. Gemini's free tier at
// https://generativelanguage.googleapis.com/v1beta/openai
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_500;
// Overloaded or rate-limited providers (Gemini's free tier often answers 503)
// usually recover within seconds, so these are retried.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const MESSAGES = {
  unreachable: "เชื่อมต่อระบบ AI ไม่ได้ กรุณาลองใหม่อีกครั้ง",
  busy: "ระบบ AI มีผู้ใช้งานมากในขณะนี้ กรุณาลองใหม่ในอีกสักครู่",
  timeout: "ระบบ AI ตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง",
  failed: "ระบบ AI ทำงานผิดพลาด กรุณาลองใหม่อีกครั้ง",
};

function chatCompletionsEndpoint(): string {
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${baseUrl}/chat/completions`;
}

// Some providers wrap JSON in a markdown code fence despite instructions.
export function stripCodeFence(content: string): string {
  const match = content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : content;
}

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
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requestBody({ system, user, json, maxTokens = 1500 }: CompletionOptions, model: string): string {
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT;
  return JSON.stringify({
    model,
    temperature: 0.4,
    max_tokens: maxTokens,
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
}

// Retries transient provider errors within one overall time budget; the last
// attempt switches to OPENAI_FALLBACK_MODEL when one is configured.
async function complete(options: CompletionOptions): Promise<string> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const primaryModel = process.env.OPENAI_MODEL || "gpt-4o";
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const model = attempt === MAX_ATTEMPTS && fallbackModel ? fallbackModel : primaryModel;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;

    let response: Response;
    try {
      response = await fetch(chatCompletionsEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: requestBody(options, model),
        signal: AbortSignal.timeout(remainingMs),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        console.error(`AI request timed out (model ${model}, attempt ${attempt})`);
        throw new HttpError(504, MESSAGES.timeout);
      }
      console.error(`AI request failed (model ${model}, attempt ${attempt})`, error);
      if (attempt === MAX_ATTEMPTS) throw new HttpError(502, MESSAGES.unreachable);
      await sleep(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    if (response.ok) {
      const body = (await response.json()) as { choices?: { finish_reason?: string; message?: { content?: string } }[] };
      const choice = body.choices?.[0];
      if (choice?.finish_reason === "length") {
        console.error(`AI reply cut off at max_tokens (model ${model})`);
        throw new HttpError(502, MESSAGES.failed);
      }
      const content = choice?.message?.content;
      if (!content) {
        console.error(`AI reply was empty (model ${model}, finish_reason ${choice?.finish_reason})`);
        throw new HttpError(502, MESSAGES.failed);
      }
      return content;
    }

    lastStatus = response.status;
    console.error(`AI error ${response.status} (model ${model}, attempt ${attempt})`, await response.text());
    if (!RETRYABLE_STATUSES.has(response.status)) break;
    const delayMs = RETRY_BASE_DELAY_MS * attempt;
    if (attempt < MAX_ATTEMPTS && Date.now() + delayMs < deadline) await sleep(delayMs);
  }

  if (RETRYABLE_STATUSES.has(lastStatus)) throw new HttpError(503, MESSAGES.busy);
  throw new HttpError(502, MESSAGES.failed);
}

async function completeJson<T>(schema: z.ZodType<T>, options: Omit<CompletionOptions, "json">): Promise<T> {
  const content = await complete({ ...options, json: true });
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(content));
  } catch {
    console.error("AI reply was not valid JSON", content.slice(0, 500));
    throw new HttpError(502, MESSAGES.failed);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error("AI response failed validation", result.error.issues);
    throw new HttpError(502, MESSAGES.failed);
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
  return completeJson(mealPlanSchema, {
    system,
    user: "Create the meal plan now.",
    // Thai text is token-heavy; 16,000 is gpt-4o's output cap.
    maxTokens: Math.min(3000 * days, 16_000),
    timeoutMs: 110_000,
  });
}

export function chatReply(system: string, message: string) {
  return complete({ system, user: message, json: false, maxTokens: 500 });
}
