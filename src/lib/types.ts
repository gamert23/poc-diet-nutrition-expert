export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEDICAL_CONDITIONS = ["hypertension", "diabetes"] as const;
export type MedicalCondition = (typeof MEDICAL_CONDITIONS)[number];

export const COOKING_EQUIPMENT = ["air_fryer", "microwave", "gas_stove"] as const;
export type CookingEquipment = (typeof COOKING_EQUIPMENT)[number];

export const WARNING_FLAGS = ["HIGH_SODIUM_WARNING", "HIGH_SUGAR_WARNING"] as const;
export type WarningFlag = (typeof WARNING_FLAGS)[number];

export interface Profile {
  id: string;
  line_user_id: string;
  display_name: string | null;
  gender: Gender;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  activity_level: ActivityLevel;
  bmr: number;
  tdee: number;
  target_calories: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  medical_conditions: MedicalCondition[];
  allergies: string[];
  cooking_equipment: CookingEquipment[];
  daily_budget_thb: number | null;
  daily_summary_enabled: boolean;
}

export interface NutrientValues {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  sugar_g: number;
}

export interface MealLog extends NutrientValues {
  id: string;
  user_id: string;
  meal_type: MealType;
  food_name: string;
  image_url: string | null;
  warning_flags: WarningFlag[];
  logged_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  meal_type: MealType;
  recipe_name: string;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
  estimated_calories: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fat_g: number;
  estimated_cost_thb: number | null;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "มื้อเช้า",
  lunch: "มื้อกลางวัน",
  dinner: "มื้อเย็น",
  snack: "ของว่าง",
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "นั่งทำงานเป็นหลัก ไม่ออกกำลังกาย",
  lightly_active: "ออกกำลังกายเบา 1-3 วัน/สัปดาห์",
  moderately_active: "ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์",
  very_active: "ออกกำลังกายหนัก 6-7 วัน/สัปดาห์",
  extra_active: "ออกกำลังกายหนักมาก หรือใช้แรงงาน",
};

export const MEDICAL_CONDITION_LABELS: Record<MedicalCondition, string> = {
  hypertension: "ความดันโลหิตสูง",
  diabetes: "เบาหวาน",
};

export const COOKING_EQUIPMENT_LABELS: Record<CookingEquipment, string> = {
  air_fryer: "หม้อทอดไร้น้ำมัน",
  microwave: "ไมโครเวฟ",
  gas_stove: "เตาแก๊ส",
};
