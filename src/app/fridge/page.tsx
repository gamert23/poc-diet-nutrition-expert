"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IngredientChips, useIngredientSelection } from "@/components/IngredientPicker";
import { useLiff } from "@/components/LiffProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, Chip, ErrorMessage, NutrientGrid, PageHeader, Spinner, WarningList, buttonClass, cardSecondaryButtonClass } from "@/components/ui";
import { suggestMealType } from "@/lib/meal-time";
import { COOKING_EQUIPMENT, COOKING_EQUIPMENT_LABELS, type CookingEquipment, type NutrientValues, type WarningFlag } from "@/lib/types";

interface RecipeResponse {
  recipe: NutrientValues & {
    recipe_name: string;
    used_ingredients: string[];
    missing_optional_ingredients: string[];
    cooking_time_mins: number;
    instructions: string[];
    medical_safety_note: string;
  };
  remaining_calories: number;
  warning_flags: WarningFlag[];
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function FridgePage() {
  const router = useRouter();
  const { apiFetch, error: liffError } = useLiff();
  const { profile, loading, error: profileError } = useProfile();
  const [equipment, setEquipment] = useState<CookingEquipment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { selected: ingredients, options, detecting, add, toggle: toggleIngredient, detect } = useIngredientSelection(setError);

  useEffect(() => {
    if (profile) setEquipment(profile.cooking_equipment);
  }, [profile]);

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await apiFetch<RecipeResponse>("/api/fridge/recipe", {
          method: "POST",
          body: JSON.stringify({ ingredients, cooking_equipment: equipment }),
        }),
      );
    } catch (generateError) {
      setError((generateError as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function logRecipe() {
    if (!result) return;
    setSaving(true);
    try {
      const { recipe } = result;
      await apiFetch("/api/meals", {
        method: "POST",
        body: JSON.stringify({
          meal_type: suggestMealType(),
          food_name: recipe.recipe_name,
          calories: recipe.calories,
          protein_g: recipe.protein_g,
          carbs_g: recipe.carbs_g,
          fat_g: recipe.fat_g,
          sodium_mg: recipe.sodium_mg,
          sugar_g: recipe.sugar_g,
        }),
      });
      router.push("/");
    } catch (saveError) {
      setError((saveError as Error).message);
      setSaving(false);
    }
  }

  const fatalError = liffError ?? profileError;
  if (fatalError) return <ErrorMessage message={fatalError} />;
  if (loading) return <Spinner fullPage />;

  return (
    <>
      <PageHeader title="ตู้เย็น AI" subtitle="สร้างเมนูสุขภาพจากวัตถุดิบที่คุณมี" />

      <ol className="mb-8 divide-y-2 divide-rule">
        <li className="space-y-4 pb-8">
          <h2 className="text-xl">1. สแกนตู้เย็น</h2>
          <PhotoPicker label="ถ่ายภาพตู้เย็น / วัตถุดิบ" onSelect={detect} disabled={detecting || generating} />
          {detecting && <Spinner label="AI กำลังหาวัตถุดิบ..." />}
        </li>

        <li className="space-y-4 py-8">
          <h2 className="text-xl">
            2. เลือกวัตถุดิบ <span className="font-body tabular-nums">({ingredients.length})</span>
          </h2>
          <IngredientChips options={options} selected={ingredients} onToggle={toggleIngredient} onAdd={add} />
        </li>

        <li className="space-y-4 pt-8">
          <h2 className="text-xl">3. อุปกรณ์ทำอาหาร</h2>
          <div className="flex flex-wrap gap-2">
            {COOKING_EQUIPMENT.map((item) => (
              <Chip key={item} selected={equipment.includes(item)} onClick={() => setEquipment(toggle(equipment, item))}>
                {COOKING_EQUIPMENT_LABELS[item]}
              </Chip>
            ))}
          </div>
        </li>
      </ol>

      <button type="button" className={`${buttonClass} mb-6`} onClick={generate} disabled={ingredients.length === 0 || generating}>
        {generating ? "AI กำลังคิดเมนู..." : "สร้างเมนู"}
      </button>

      {error && <ErrorMessage message={error} />}

      {result && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-2xl">{result.recipe.recipe_name}</h2>
            <p className="mt-1 text-sm text-card-muted">
              ใช้เวลา {Math.round(result.recipe.cooking_time_mins)} นาที, วันนี้เหลือ {result.remaining_calories} kcal
            </p>
          </div>
          <NutrientGrid values={result.recipe} />
          <WarningList flags={result.warning_flags} />
          <div>
            <h3 className="mb-1">วัตถุดิบที่ใช้</h3>
            <p>{result.recipe.used_ingredients.join(", ")}</p>
            {result.recipe.missing_optional_ingredients.length > 0 && (
              <p className="mt-1 text-sm text-card-muted">เพิ่มได้ถ้ามี: {result.recipe.missing_optional_ingredients.join(", ")}</p>
            )}
          </div>
          <div>
            <h3 className="mb-1">วิธีทำ</h3>
            <ol className="list-decimal space-y-1.5 pl-5 marker:font-bold">
              {result.recipe.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
          {result.recipe.medical_safety_note && (
            <p className="border-l-4 border-meal-breakfast pl-3">{result.recipe.medical_safety_note}</p>
          )}
          <button type="button" className={cardSecondaryButtonClass} onClick={logRecipe} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "ทำเมนูนี้แล้ว บันทึกเป็นมื้ออาหาร"}
          </button>
        </Card>
      )}
      <BottomNav active="/fridge" />
    </>
  );
}
