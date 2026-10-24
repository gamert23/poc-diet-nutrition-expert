import type { ActivityLevel, Gender, NutrientValues } from "./types";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const CALORIC_DEFICIT_KCAL = 500;
export const CALORIE_SAFETY_FLOOR: Record<Gender, number> = { male: 1500, female: 1200 };
export const MACRO_SPLIT = { protein: 0.3, carbs: 0.45, fat: 0.25 } as const;

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export interface GoalInput {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export interface CalorieGoal {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// Mifflin-St Jeor (FR-1.2)
export function calculateBmr({ gender, age, heightCm, weightKg }: Omit<GoalInput, "activityLevel">): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateTargetCalories(tdee: number, gender: Gender): number {
  return Math.max(tdee - CALORIC_DEFICIT_KCAL, CALORIE_SAFETY_FLOOR[gender]);
}

export function calculateMacroTargets(targetCalories: number) {
  return {
    proteinTargetG: round((targetCalories * MACRO_SPLIT.protein) / KCAL_PER_GRAM.protein, 1),
    carbsTargetG: round((targetCalories * MACRO_SPLIT.carbs) / KCAL_PER_GRAM.carbs, 1),
    fatTargetG: round((targetCalories * MACRO_SPLIT.fat) / KCAL_PER_GRAM.fat, 1),
  };
}

export function calculateCalorieGoal(input: GoalInput): CalorieGoal {
  const bmr = calculateBmr(input);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, input.gender);
  return {
    bmr: round(bmr, 2),
    tdee: round(tdee, 2),
    targetCalories: round(targetCalories),
    ...calculateMacroTargets(round(targetCalories)),
  };
}

export function sumNutrients(items: Partial<NutrientValues>[]): NutrientValues {
  const totals: NutrientValues = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0, sugar_g: 0 };
  for (const item of items) {
    for (const key of Object.keys(totals) as (keyof NutrientValues)[]) {
      totals[key] += Number(item[key] ?? 0);
    }
  }
  for (const key of Object.keys(totals) as (keyof NutrientValues)[]) {
    totals[key] = round(totals[key], 1);
  }
  return totals;
}
