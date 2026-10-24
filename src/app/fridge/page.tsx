"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useLiff } from "@/components/LiffProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, Chip, ErrorMessage, NutrientGrid, PageHeader, Spinner, WarningList, buttonClass, cardSecondaryButtonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { compressImage, imageFormData } from "@/lib/image-client";
import { suggestMealType } from "@/lib/meal-time";
import { COOKING_EQUIPMENT, COOKING_EQUIPMENT_LABELS, type CookingEquipment, type NutrientValues, type WarningFlag } from "@/lib/types";

const QUICK_INGREDIENTS = [
  "ไข่ไก่",
  "อกไก่",
  "หมูสับ",
  "ปลา",
  "กุ้ง",
  "เต้าหู้",
  "ข้าวกล้อง",
  "เส้นบุก",
  "ผักกาดขาว",
  "บรอกโคลี",
  "แครอท",
  "มะเขือเทศ",
  "เห็ด",
  "ผักบุ้ง",
  "หอมใหญ่",
  "กระเทียม",
];

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
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [extraIngredients, setExtraIngredients] = useState<string[]>([]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [equipment, setEquipment] = useState<CookingEquipment[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RecipeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setEquipment(profile.cooking_equipment);
  }, [profile]);

  const chipOptions = [...QUICK_INGREDIENTS, ...extraIngredients.filter((item) => !QUICK_INGREDIENTS.includes(item))];

  function addIngredients(names: string[]) {
    const cleaned = names.map((name) => name.trim()).filter(Boolean);
    setExtraIngredients((current) => [...new Set([...current, ...cleaned])]);
    setIngredients((current) => [...new Set([...current, ...cleaned])]);
  }

  async function detect(file: File) {
    setDetecting(true);
    setError(null);
    try {
      const { ingredients: detected } = await apiFetch<{ ingredients: string[] }>("/api/fridge/ingredients", {
        method: "POST",
        body: imageFormData(await compressImage(file)),
      });
      if (detected.length === 0) setError("ไม่พบวัตถุดิบในภาพ ลองเลือกจากรายการด้านล่างแทน");
      addIngredients(detected);
    } catch (detectError) {
      setError((detectError as Error).message);
    } finally {
      setDetecting(false);
    }
  }

  function addCustom(event: FormEvent) {
    event.preventDefault();
    addIngredients(customIngredient.split(","));
    setCustomIngredient("");
  }

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
  if (loading) return <Spinner />;

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
          <div className="flex flex-wrap gap-2">
            {chipOptions.map((name) => (
              <Chip key={name} selected={ingredients.includes(name)} onClick={() => setIngredients(toggle(ingredients, name))}>
                {name}
              </Chip>
            ))}
          </div>
          <form onSubmit={addCustom} className="flex gap-2">
            <input
              className={`${inputClass} min-w-0`}
              value={customIngredient}
              onChange={(event) => setCustomIngredient(event.target.value)}
              placeholder="พิมพ์วัตถุดิบเพิ่ม"
              aria-label="พิมพ์วัตถุดิบเพิ่ม"
            />
            <button type="submit" className={`${secondaryButtonClass} w-auto! shrink-0`}>
              เพิ่ม
            </button>
          </form>
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
