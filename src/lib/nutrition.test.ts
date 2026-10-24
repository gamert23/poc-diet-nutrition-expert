import { describe, expect, it } from "vitest";
import {
  calculateBmr,
  calculateCalorieGoal,
  calculateMacroTargets,
  calculateTargetCalories,
  calculateTdee,
  sumNutrients,
} from "./nutrition";

describe("calculateBmr (Mifflin-St Jeor)", () => {
  it("adds 5 for males", () => {
    // 10*80 + 6.25*175 - 5*30 + 5 = 1748.75
    expect(calculateBmr({ gender: "male", age: 30, heightCm: 175, weightKg: 80 })).toBeCloseTo(1748.75);
  });

  it("subtracts 161 for females", () => {
    // 10*60 + 6.25*160 - 5*25 - 161 = 1314
    expect(calculateBmr({ gender: "female", age: 25, heightCm: 160, weightKg: 60 })).toBeCloseTo(1314);
  });
});

describe("calculateTdee", () => {
  it("applies the 1.2 multiplier for sedentary and 1.9 for extra active", () => {
    expect(calculateTdee(1500, "sedentary")).toBeCloseTo(1800);
    expect(calculateTdee(1500, "extra_active")).toBeCloseTo(2850);
  });
});

describe("calculateTargetCalories", () => {
  it("subtracts a 500 kcal deficit", () => {
    expect(calculateTargetCalories(2500, "male")).toBe(2000);
  });

  it("never goes below the male floor of 1500 kcal", () => {
    expect(calculateTargetCalories(1800, "male")).toBe(1500);
  });

  it("never goes below the female floor of 1200 kcal", () => {
    expect(calculateTargetCalories(1500, "female")).toBe(1200);
    expect(calculateTargetCalories(1000, "female")).toBe(1200);
  });
});

describe("calculateMacroTargets", () => {
  it("splits calories 30/45/25 into grams", () => {
    expect(calculateMacroTargets(2000)).toEqual({ proteinTargetG: 150, carbsTargetG: 225, fatTargetG: 55.6 });
  });
});

describe("calculateCalorieGoal", () => {
  it("chains BMR, TDEE, deficit, and macros", () => {
    const goal = calculateCalorieGoal({ gender: "male", age: 30, heightCm: 175, weightKg: 80, activityLevel: "moderately_active" });
    expect(goal.bmr).toBe(1748.75);
    expect(goal.tdee).toBeCloseTo(2710.56, 2);
    expect(goal.targetCalories).toBe(2211);
    expect(goal.proteinTargetG).toBeCloseTo(165.8, 1);
  });

  it("applies the safety floor for a small sedentary female", () => {
    const goal = calculateCalorieGoal({ gender: "female", age: 60, heightCm: 150, weightKg: 45, activityLevel: "sedentary" });
    expect(goal.targetCalories).toBe(1200);
  });
});

describe("sumNutrients", () => {
  it("returns zeros for no meals", () => {
    expect(sumNutrients([])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0, sugar_g: 0 });
  });

  it("sums numeric strings returned by Postgres NUMERIC columns", () => {
    const totals = sumNutrients([
      { calories: "450.50" as unknown as number, sodium_mg: 300 },
      { calories: 200, sodium_mg: 450 },
    ]);
    expect(totals.calories).toBe(650.5);
    expect(totals.sodium_mg).toBe(750);
  });
});
