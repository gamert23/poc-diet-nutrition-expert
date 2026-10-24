import type { MealType } from "./types";

export function suggestMealType(at: Date = new Date()): MealType {
  const hour = at.getHours();
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  return "snack";
}
