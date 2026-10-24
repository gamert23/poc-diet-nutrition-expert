import { MEDICAL_CONDITION_LABELS, type MedicalCondition } from "./types";

// Medical conditions are typed freely by the user. The FR-2.3 safety rules only
// know hypertension and diabetes, so those two are recognised from the text;
// everything else is passed to the AI as written.
const MATCHERS: Record<MedicalCondition, (text: string) => boolean> = {
  hypertension: (text) =>
    text.includes("hypertension") ||
    text.includes("high blood pressure") ||
    (text.includes("ความดัน") && !text.includes("ต่ำ")),
  diabetes: (text) => text.includes("diabet") || text.includes("เบาหวาน"),
};

export function recognizeConditions(conditions: readonly string[]): MedicalCondition[] {
  const texts = conditions.map((condition) => condition.trim().toLowerCase());
  return (Object.keys(MATCHERS) as MedicalCondition[]).filter((condition) => texts.some(MATCHERS[condition]));
}

// Profiles saved before free-text entry hold the ids "hypertension" and "diabetes".
export function conditionLabel(condition: string): string {
  return MEDICAL_CONDITION_LABELS[condition as MedicalCondition] ?? condition;
}
