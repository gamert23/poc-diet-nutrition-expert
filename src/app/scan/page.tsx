"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { SheetSelect } from "@/components/SheetSelect";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, ErrorMessage, NutrientGrid, PageHeader, Spinner, WarningList, buttonClass, cardInputClass } from "@/components/ui";
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
      <div className="mb-6">
        <PhotoPicker label={result ? "ถ่ายภาพใหม่" : "ถ่ายภาพ / เลือกรูป"} onSelect={analyze} disabled={analyzing || saving} />
      </div>

      {analyzing && <Spinner label="AI กำลังวิเคราะห์อาหาร..." />}
      {error && <ErrorMessage message={error} />}

      {result && (
        <Card className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold" htmlFor="food-name">
              ชื่ออาหาร
            </label>
            <input id="food-name" className={cardInputClass} value={foodName} onChange={(event) => setFoodName(event.target.value)} />
            {result.analysis.portion_estimate && (
              <p className="mt-1.5 text-sm text-card-muted">ปริมาณโดยประมาณ: {result.analysis.portion_estimate}</p>
            )}
          </div>
          <NutrientGrid values={result.analysis} />
          <WarningList flags={result.warning_flags} />
          {result.analysis.health_advice && (
            <p className="border-l-4 border-meal-lunch pl-3">{result.analysis.health_advice}</p>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-bold" htmlFor="meal-type">
              มื้อ
            </label>
            <SheetSelect
              id="meal-type"
              title="มื้อ"
              value={mealType}
              options={MEAL_TYPES.map((type) => ({ value: type, label: MEAL_TYPE_LABELS[type] }))}
              onChange={setMealType}
              onCard
            />
          </div>
          <button type="button" className={buttonClass} onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกมื้อนี้"}
          </button>
          <p className="text-sm text-card-muted">ค่าทางโภชนาการเป็นการประมาณจาก AI อาจคลาดเคลื่อนจากค่าจริง</p>
        </Card>
      )}
      <BottomNav active="/scan" />
    </>
  );
}
