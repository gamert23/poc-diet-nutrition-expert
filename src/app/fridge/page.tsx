"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useLiff } from "@/components/LiffProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, Chip, ErrorMessage, NutrientGrid, PageHeader, Spinner, WarningList, buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
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

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold">1. สแกนตู้เย็น</h2>
        <PhotoPicker label="ถ่ายภาพตู้เย็น / วัตถุดิบ" onSelect={detect} disabled={detecting || generating} />
        {detecting && <Spinner label="AI กำลังหาวัตถุดิบ..." />}
      </Card>

      <Card className="mb-4 space-y-3">
        <h2 className="font-semibold">2. เลือกวัตถุดิบ ({ingredients.length})</h2>
        <div className="flex flex-wrap gap-2">
          {chipOptions.map((name) => (
            <Chip key={name} selected={ingredients.includes(name)} onClick={() => setIngredients(toggle(ingredients, name))}>
              {name}
            </Chip>
          ))}
        </div>
        <form onSubmit={addCustom} className="flex gap-2">
          <input
            className={inputClass}
            value={customIngredient}
            onChange={(event) => setCustomIngredient(event.target.value)}
            placeholder="พิมพ์วัตถุดิบเพิ่ม"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white">
            เพิ่ม
          </button>
        </form>
      </Card>

      <Card className="mb-4 space-y-2">
        <h2 className="font-semibold">3. อุปกรณ์ทำอาหาร</h2>
        <div className="flex flex-wrap gap-2">
          {COOKING_EQUIPMENT.map((item) => (
            <Chip key={item} selected={equipment.includes(item)} onClick={() => setEquipment(toggle(equipment, item))}>
              {COOKING_EQUIPMENT_LABELS[item]}
            </Chip>
          ))}
        </div>
      </Card>

      <button type="button" className={`${buttonClass} mb-4`} onClick={generate} disabled={ingredients.length === 0 || generating}>
        {generating ? "AI กำลังคิดเมนู..." : "สร้างเมนู"}
      </button>

      {error && <ErrorMessage message={error} />}

      {result && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">{result.recipe.recipe_name}</h2>
            <p className="text-xs text-gray-500">
              ใช้เวลา {Math.round(result.recipe.cooking_time_mins)} นาที | แคลอรีคงเหลือวันนี้ {result.remaining_calories} kcal
            </p>
          </div>
          <NutrientGrid values={result.recipe} />
          <WarningList flags={result.warning_flags} />
          <div>
            <h3 className="mb-1 text-sm font-semibold">วัตถุดิบที่ใช้</h3>
            <p className="text-sm text-gray-700">{result.recipe.used_ingredients.join(", ")}</p>
            {result.recipe.missing_optional_ingredients.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">เพิ่มได้ถ้ามี: {result.recipe.missing_optional_ingredients.join(", ")}</p>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold">วิธีทำ</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
              {result.recipe.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
          {result.recipe.medical_safety_note && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{result.recipe.medical_safety_note}</p>
          )}
          <button type="button" className={secondaryButtonClass} onClick={logRecipe} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "ทำเมนูนี้แล้ว บันทึกเป็นมื้ออาหาร"}
          </button>
        </Card>
      )}
      <BottomNav active="/fridge" />
    </>
  );
}
