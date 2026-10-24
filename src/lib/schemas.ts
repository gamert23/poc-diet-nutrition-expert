import { z } from "zod";
import { ACTIVITY_LEVELS, COOKING_EQUIPMENT, GENDERS, MEAL_TYPES, MEDICAL_CONDITIONS } from "./types";

const shortText = z.string().trim().min(1).max(100);

export const profileInputSchema = z
  .object({
    gender: z.enum(GENDERS),
    age: z.coerce.number().int().min(13).max(120),
    height_cm: z.coerce.number().min(100).max(250),
    current_weight_kg: z.coerce.number().min(25).max(350),
    target_weight_kg: z.coerce.number().min(25).max(350),
    activity_level: z.enum(ACTIVITY_LEVELS),
    medical_conditions: z.array(z.enum(MEDICAL_CONDITIONS)).default([]),
    allergies: z.array(shortText).max(20).default([]),
    cooking_equipment: z.array(z.enum(COOKING_EQUIPMENT)).default([]),
    daily_budget_thb: z.coerce.number().min(0).max(100000).nullable().default(null),
    daily_summary_enabled: z.boolean().default(true),
  })
  .transform((input) => ({
    ...input,
    medical_conditions: [...new Set(input.medical_conditions)],
    allergies: [...new Set(input.allergies)],
    cooking_equipment: [...new Set(input.cooking_equipment)],
  }));
export type ProfileInput = z.infer<typeof profileInputSchema>;

const nutrient = z.coerce.number().min(0).max(100000);

export const mealLogInputSchema = z.object({
  meal_type: z.enum(MEAL_TYPES),
  food_name: z.string().trim().min(1).max(255),
  image_path: z.string().max(500).nullable().default(null),
  calories: nutrient.max(9999),
  protein_g: nutrient.max(999).default(0),
  carbs_g: nutrient.max(999).default(0),
  fat_g: nutrient.max(999).default(0),
  sodium_mg: nutrient.max(99999).default(0),
  sugar_g: nutrient.max(999).default(0),
});

export const recipeRequestSchema = z.object({
  ingredients: z.array(shortText).min(1).max(30),
  cooking_equipment: z.array(z.enum(COOKING_EQUIPMENT)).optional(),
});

export const mealPlanRequestSchema = z.object({
  days: z.union([z.literal(1), z.literal(7)]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
