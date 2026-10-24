"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalorieGauge, MacroBar } from "@/components/CalorieGauge";
import { useLiff } from "@/components/LiffProvider";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, ErrorMessage, PageHeader, Spinner, WarningList, buttonClass, secondaryButtonClass } from "@/components/ui";
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

  return (
    <>
      <PageHeader title={`สวัสดี ${displayName ?? ""}`.trim()} subtitle={`ภาพรวมวันนี้ (${daily.date})`} />
      {error && <ErrorMessage message={error} />}

      <Card className="mb-4">
        <CalorieGauge consumed={daily.totals.calories} target={daily.targets.calories} />
        <div className="mt-4 space-y-3">
          <MacroBar label="โปรตีน" value={daily.totals.protein_g} target={daily.targets.protein_g} color="#2563eb" />
          <MacroBar label="คาร์บ" value={daily.totals.carbs_g} target={daily.targets.carbs_g} color="#f59e0b" />
          <MacroBar label="ไขมัน" value={daily.totals.fat_g} target={daily.targets.fat_g} color="#db2777" />
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/scan" className={buttonClass}>
          สแกนอาหาร
        </Link>
        <Link href="/fridge" className={secondaryButtonClass}>
          จัดเมนูตู้เย็น
        </Link>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">อาหารที่บันทึกวันนี้</h2>
        {daily.logs.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีรายการ ลองสแกนอาหารมื้อแรกของคุณ</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {daily.logs.map((log) => (
              <li key={log.id} className="flex gap-3 py-3">
                {log.image_url ? (
                  <img src={log.image_url} alt={log.food_name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{log.food_name}</p>
                  <p className="text-xs text-gray-500">
                    {MEAL_TYPE_LABELS[log.meal_type]} | {Math.round(Number(log.calories))} kcal
                  </p>
                  <div className="mt-1">
                    <WarningList flags={log.warning_flags ?? []} />
                  </div>
                </div>
                <button type="button" onClick={() => deleteMeal(log.id)} className="self-start text-xs text-gray-400">
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {profile && profile.medical_conditions.length > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          คำเตือนโซเดียม/น้ำตาลเป็นค่าประมาณจาก AI ไม่ใช่คำแนะนำทางการแพทย์ ควรปรึกษาแพทย์เกี่ยวกับการควบคุมอาหารของคุณ
        </p>
      )}
      <BottomNav active="/" />
    </>
  );
}
