"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, ErrorMessage, NutrientGrid, PageHeader, Spinner, WarningList, buttonClass, inputClass } from "@/components/ui";
import { compressImage, imageFormData } from "@/lib/image-client";
import { suggestMealType } from "@/lib/meal-time";
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType, type NutrientValues, type WarningFlag } from "@/lib/types";

interface ScanResult {
  analysis: NutrientValues & { food_name: string; portion_estimate: string; health_advice: string };
  warning_flags: WarningFlag[];
  image_path: string;
}

export default function ScanPage() {
  const router = useRouter();
  const { apiFetch, error: liffError } = useLiff();
  const { loading, error: profileError } = useProfile();
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState<MealType>(suggestMealType());
  const [error, setError] = useState<string | null>(null);

  async function analyze(file: File) {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const scan = await apiFetch<ScanResult>("/api/scan", {
        method: "POST",
        body: imageFormData(await compressImage(file)),
      });
      setResult(scan);
      setFoodName(scan.analysis.food_name);
    } catch (scanError) {
      setError((scanError as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const { analysis } = result;
      await apiFetch("/api/meals", {
        method: "POST",
        body: JSON.stringify({
          meal_type: mealType,
          food_name: foodName.trim() || analysis.food_name,
          image_path: result.image_path,
          calories: analysis.calories,
          protein_g: analysis.protein_g,
          carbs_g: analysis.carbs_g,
          fat_g: analysis.fat_g,
          sodium_mg: analysis.sodium_mg,
          sugar_g: analysis.sugar_g,
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
      <PageHeader title="AI สแกนอาหาร" subtitle="ถ่ายภาพอาหาร แล้วให้ AI ประเมินแคลอรีและสารอาหาร" />
      <Card className="mb-4">
        <PhotoPicker label={result ? "ถ่ายภาพใหม่" : "ถ่ายภาพ / เลือกรูป"} onSelect={analyze} disabled={analyzing || saving} />
      </Card>

      {analyzing && <Spinner label="AI กำลังวิเคราะห์อาหาร..." />}
      {error && <ErrorMessage message={error} />}

      {result && (
        <Card className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft" htmlFor="food-name">
              ชื่ออาหาร
            </label>
            <input id="food-name" className={inputClass} value={foodName} onChange={(event) => setFoodName(event.target.value)} />
            {result.analysis.portion_estimate && (
              <p className="mt-1 text-xs text-muted">ปริมาณโดยประมาณ: {result.analysis.portion_estimate}</p>
            )}
          </div>
          <NutrientGrid values={result.analysis} />
          <WarningList flags={result.warning_flags} />
          {result.analysis.health_advice && (
            <p className="rounded-xl bg-pandan-wash p-3 text-sm text-pandan">{result.analysis.health_advice}</p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft" htmlFor="meal-type">
              มื้อ
            </label>
            <select
              id="meal-type"
              className={inputClass}
              value={mealType}
              onChange={(event) => setMealType(event.target.value as MealType)}
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={buttonClass} onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกมื้อนี้"}
          </button>
          <p className="text-xs text-muted">ค่าทางโภชนาการเป็นการประมาณจาก AI อาจคลาดเคลื่อนจากค่าจริง</p>
        </Card>
      )}
      <BottomNav active="/scan" />
    </>
  );
}
