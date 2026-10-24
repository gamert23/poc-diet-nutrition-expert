import { describe, expect, it } from "vitest";
import { mealLogInputSchema, mealPlanRequestSchema, profileInputSchema } from "./schemas";

const validProfile = {
  gender: "female",
  age: 32,
  height_cm: 160,
  current_weight_kg: 68,
  target_weight_kg: 58,
  activity_level: "lightly_active",
  medical_conditions: ["diabetes", "diabetes"],
  allergies: [" กุ้ง "],
};

describe("profileInputSchema", () => {
  it("accepts a valid profile, trims allergies, and de-duplicates conditions", () => {
    const parsed = profileInputSchema.parse(validProfile);
    expect(parsed.medical_conditions).toEqual(["diabetes"]);
    expect(parsed.allergies).toEqual(["กุ้ง"]);
    expect(parsed.daily_summary_enabled).toBe(true);
    expect(parsed.daily_budget_thb).toBeNull();
  });

  it("accepts free-text medical conditions and trims them", () => {
    const parsed = profileInputSchema.parse({ ...validProfile, medical_conditions: [" โรคไต ", "ความดันสูง"] });
    expect(parsed.medical_conditions).toEqual(["โรคไต", "ความดันสูง"]);
  });

  it("rejects empty medical condition entries", () => {
    expect(profileInputSchema.safeParse({ ...validProfile, medical_conditions: ["  "] }).success).toBe(false);
  });

  it("rejects implausible body measurements", () => {
    expect(profileInputSchema.safeParse({ ...validProfile, height_cm: 20 }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...validProfile, age: 5 }).success).toBe(false);
  });
});

describe("mealLogInputSchema", () => {
  it("defaults missing nutrients to zero", () => {
    const parsed = mealLogInputSchema.parse({ meal_type: "lunch", food_name: "ข้าวมันไก่", calories: 600 });
    expect(parsed).toMatchObject({ sodium_mg: 0, sugar_g: 0, image_path: null });
  });

  it("rejects negative calories", () => {
    expect(mealLogInputSchema.safeParse({ meal_type: "lunch", food_name: "x", calories: -1 }).success).toBe(false);
  });
});

describe("mealPlanRequestSchema", () => {
  it("only allows 1 or 7 days", () => {
    expect(mealPlanRequestSchema.safeParse({ days: 7 }).success).toBe(true);
    expect(mealPlanRequestSchema.safeParse({ days: 3 }).success).toBe(false);
  });

  it("defaults ingredients to an empty list and trims them", () => {
    expect(mealPlanRequestSchema.parse({ days: 1 }).ingredients).toEqual([]);
    expect(mealPlanRequestSchema.parse({ days: 1, ingredients: [" ไข่ไก่ "] }).ingredients).toEqual(["ไข่ไก่"]);
  });
});
