"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MEAL_COLORS, MacroBar, MealLegend, PintoStack, caloriesByMeal } from "@/components/Pinto";
import { useLiff } from "@/components/LiffProvider";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, ErrorMessage, PageHeader, Spinner, WarningList, buttonClass, secondaryButtonClass } from "@/components/ui";
import { formatThaiDate } from "@/lib/format";
import { MEAL_TYPE_LABELS, type MealLog, type NutrientValues } from "@/lib/types";

interface DailyResponse {
  date: string;
  logs: MealLog[];
  totals: NutrientValues;
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export default function DashboardPage() {
  const { apiFetch, error: liffError } = useLiff();
  const { profile, displayName, loading, error: profileError } = useProfile();
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDaily = useCallback(() => {
    apiFetch<DailyResponse>("/api/meals")
      .then(setDaily)
      .catch((loadError: Error) => setError(loadError.message));
  }, [apiFetch]);

  useEffect(() => {
    if (profile) loadDaily();
  }, [profile, loadDaily]);

  async function deleteMeal(id: string) {
    if (!window.confirm("ลบรายการนี้?")) return;
    try {
      await apiFetch(`/api/meals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      loadDaily();
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  }

  const fatalError = liffError ?? profileError;
  if (fatalError) return <ErrorMessage message={fatalError} />;
  if (loading || !daily) return <Spinner />;

  const remaining = Math.round(daily.targets.calories - daily.totals.calories);
  const over = remaining < 0;
  const tiers = caloriesByMeal(daily.logs);

  return (
    <>
      <PageHeader title={displayName ? `สวัสดี ${displayName}` : "สวัสดี"} subtitle={formatThaiDate(daily.date)} />
      {error && <ErrorMessage message={error} />}

      <section className="mb-6 flex items-end gap-5" aria-label="แคลอรีวันนี้">
        <PintoStack tiers={tiers} target={daily.targets.calories} />
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-sm text-muted">{over ? "เกินเป้าหมายแล้ว" : "กินได้อีก"}</p>
          <p className={`text-6xl leading-none font-semibold tabular-nums ${over ? "text-chili" : "text-ink"}`}>
            {Math.abs(remaining).toLocaleString("th-TH")}
          </p>
          <p className="mt-1 mb-4 text-sm text-muted">
            kcal จากเป้าหมาย {Math.round(daily.targets.calories).toLocaleString("th-TH")}
          </p>
          {tiers.length > 0 ? (
            <MealLegend tiers={tiers} />
          ) : (
            <p className="text-sm text-muted">ปิ่นโตยังว่าง สแกนมื้อแรกของวันได้เลย</p>
          )}
        </div>
      </section>

      <section className="mb-6 space-y-2.5" aria-label="สารอาหารหลัก">
        <MacroBar label="โปรตีน" value={daily.totals.protein_g} target={daily.targets.protein_g} color="var(--color-pea)" />
        <MacroBar label="คาร์บ" value={daily.totals.carbs_g} target={daily.targets.carbs_g} color="var(--color-turmeric)" />
        <MacroBar label="ไขมัน" value={daily.totals.fat_g} target={daily.targets.fat_g} color="var(--color-tamarind)" />
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link href="/scan" className={buttonClass}>
          สแกนอาหาร
        </Link>
        <Link href="/fridge" className={secondaryButtonClass}>
          เมนูจากตู้เย็น
        </Link>
      </div>

      <Card>
        <h2 className="font-display text-lg font-medium">อาหารที่บันทึกวันนี้</h2>
        {daily.logs.length === 0 ? (
          <p className="mt-1 text-sm text-muted">ยังไม่มีรายการ ถ่ายรูปอาหารเพื่อบันทึกมื้อแรก</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {daily.logs.map((log) => (
              <li key={log.id} className="flex gap-3 py-3">
                {log.image_url ? (
                  <img src={log.image_url} alt={log.food_name} className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <div
                    className="h-14 w-14 shrink-0 rounded-[10px]"
                    style={{ backgroundColor: MEAL_COLORS[log.meal_type], opacity: 0.18 }}
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{log.food_name}</p>
                  <p className="text-xs text-muted">
                    {MEAL_TYPE_LABELS[log.meal_type]}, {Math.round(Number(log.calories))} kcal
                  </p>
                  <div className="mt-1">
                    <WarningList flags={log.warning_flags ?? []} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMeal(log.id)}
                  className="self-start rounded px-1 text-xs text-muted"
                  aria-label={`ลบ ${log.food_name}`}
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {profile && profile.medical_conditions.length > 0 && (
        <p className="mt-4 text-xs text-muted">
          คำเตือนโซเดียมและน้ำตาลคำนวณจากค่าประมาณของ AI ไม่ใช่คำแนะนำทางการแพทย์ ปรึกษาแพทย์ก่อนปรับการรักษา
        </p>
      )}
      <BottomNav active="/" />
    </>
  );
}
