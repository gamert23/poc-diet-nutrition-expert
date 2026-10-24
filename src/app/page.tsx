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
  if (loading || !daily) return <Spinner fullPage />;

  const remaining = Math.round(daily.targets.calories - daily.totals.calories);
  const over = remaining < 0;
  const tiers = caloriesByMeal(daily.logs);

  return (
    <>
      <PageHeader title={displayName ? `สวัสดี ${displayName}` : "สวัสดี"} subtitle={formatThaiDate(daily.date)} />
      {error && <ErrorMessage message={error} />}

      <Card className="mb-6">
        <section className="flex items-end gap-5" aria-label="แคลอรีวันนี้">
          <PintoStack tiers={tiers} target={daily.targets.calories} />
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-card-muted">{over ? "เกินเป้าหมายแล้ว" : "กินได้อีก"}</p>
            <p className={`text-[4.5rem] leading-none font-bold tabular-nums ${over ? "text-error" : ""}`}>
              {Math.abs(remaining).toLocaleString("th-TH")}
            </p>
            <p className="mt-2 mb-4 text-sm text-card-muted">
              kcal จากเป้าหมาย {Math.round(daily.targets.calories).toLocaleString("th-TH")}
            </p>
            {tiers.length > 0 ? (
              <MealLegend tiers={tiers} />
            ) : (
              <p className="text-sm">ปิ่นโตยังว่าง สแกนมื้อแรกของวันได้เลย</p>
            )}
          </div>
        </section>
        <section className="mt-5 space-y-3 border-t-2 border-card-rule pt-5" aria-label="สารอาหารหลัก">
          <MacroBar label="โปรตีน" value={daily.totals.protein_g} target={daily.targets.protein_g} />
          <MacroBar label="คาร์บ" value={daily.totals.carbs_g} target={daily.targets.carbs_g} />
          <MacroBar label="ไขมัน" value={daily.totals.fat_g} target={daily.targets.fat_g} />
        </section>
      </Card>

      <div className="mb-10 grid grid-cols-2 gap-3">
        <Link href="/scan" className={buttonClass}>
          สแกนอาหาร
        </Link>
        <Link href="/fridge" className={secondaryButtonClass}>
          เมนูจากตู้เย็น
        </Link>
      </div>

      <section aria-labelledby="today-meals">
        <h2 id="today-meals" className="mb-2 text-2xl">
          อาหารที่บันทึกวันนี้
        </h2>
        {daily.logs.length === 0 ? (
          <p className="text-muted">ยังไม่มีรายการ ถ่ายรูปอาหารเพื่อบันทึกมื้อแรก</p>
        ) : (
          <ul className="divide-y divide-rule">
            {daily.logs.map((log) => (
              <li key={log.id} className="flex gap-4 py-4">
                {log.image_url && (
                  <img src={log.image_url} alt={log.food_name} className="h-16 w-16 shrink-0 rounded-control object-cover" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-bold">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: MEAL_COLORS[log.meal_type] }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{log.food_name}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {MEAL_TYPE_LABELS[log.meal_type]}, {Math.round(Number(log.calories))} kcal
                  </p>
                  <WarningList flags={log.warning_flags ?? []} onGround />
                </div>
                <button
                  type="button"
                  onClick={() => deleteMeal(log.id)}
                  className="-mr-2 min-h-11 self-start rounded-control px-2 text-sm text-muted underline-offset-4 transition-colors duration-[var(--dur-micro)] hover:text-ink hover:underline"
                  aria-label={`ลบ ${log.food_name}`}
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile && profile.medical_conditions.length > 0 && (
        <p className="mt-8 text-sm text-muted">
          คำเตือนโซเดียมและน้ำตาลคำนวณจากค่าประมาณของ AI ไม่ใช่คำแนะนำทางการแพทย์ ปรึกษาแพทย์ก่อนปรับการรักษา
        </p>
      )}
      <BottomNav active="/" />
    </>
  );
}
