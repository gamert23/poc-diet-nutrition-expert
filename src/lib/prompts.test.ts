import { describe, expect, it } from "vitest";
import { foodScannerPrompt, fridgeRecipePrompt, mealPlanPrompt } from "./prompts";

describe("prompt templates", () => {
  it("injects user conditions into the food scanner prompt", () => {
    expect(foodScannerPrompt(["hypertension"])).toContain("hypertension (ความดันโลหิตสูง)");
    expect(foodScannerPrompt([])).toContain("health conditions: none");
  });

  it("clamps a negative remaining calorie budget to zero", () => {
    const prompt = fridgeRecipePrompt({
      ingredients: ["ไข่ไก่", "ผักบุ้ง"],
      remainingCalories: -250,
      conditions: ["diabetes"],
      equipment: ["air_fryer"],
      allergies: ["กุ้ง"],
    });
    expect(prompt).toContain("Remaining Calorie Budget Today: 0 kcal");
    expect(prompt).toContain("Available Ingredients: ไข่ไก่, ผักบุ้ง");
    expect(prompt).toContain("air_fryer (หม้อทอดไร้น้ำมัน)");
    expect(prompt).toContain("never use): กุ้ง");
  });

  it("includes every date and the budget in the meal plan prompt", () => {
    const prompt = mealPlanPrompt({
      dates: ["2026-10-24", "2026-10-25"],
      targetCalories: 1500,
      proteinTargetG: 112.5,
      carbsTargetG: 168.8,
      fatTargetG: 41.7,
      conditions: [],
      allergies: [],
      dailyBudgetThb: 200,
    });
    expect(prompt).toContain("2026-10-24, 2026-10-25");
    expect(prompt).toContain("200 THB per day");
  });
});
