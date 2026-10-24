import type { MedicalCondition, NutrientValues, WarningFlag } from "./types";

// FR-2.3 per-meal limits, used as written in the SRD (no clinical review planned).
export const SODIUM_LIMIT_MG_PER_MEAL = 600;
export const SUGAR_LIMIT_G_PER_MEAL = 10;

export const WARNING_MESSAGES: Record<WarningFlag, string> = {
  HIGH_SODIUM_WARNING: "โซเดียมสูงเกินเกณฑ์ความดัน",
  HIGH_SUGAR_WARNING: "น้ำตาลสูงเกินเกณฑ์เบาหวาน",
};

// Flags are computed here rather than trusted from the AI response so the rule
// is deterministic and tied to the user's actual conditions.
export function evaluateMealWarnings(
  nutrients: Pick<NutrientValues, "sodium_mg" | "sugar_g">,
  conditions: readonly MedicalCondition[],
): WarningFlag[] {
  const flags: WarningFlag[] = [];
  if (conditions.includes("hypertension") && nutrients.sodium_mg > SODIUM_LIMIT_MG_PER_MEAL) {
    flags.push("HIGH_SODIUM_WARNING");
  }
  if (conditions.includes("diabetes") && nutrients.sugar_g > SUGAR_LIMIT_G_PER_MEAL) {
    flags.push("HIGH_SUGAR_WARNING");
  }
  return flags;
}
