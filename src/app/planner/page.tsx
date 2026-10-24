"use client";

import { useCallback, useEffect, useState } from "react";
import { IngredientChips, useIngredientSelection } from "@/components/IngredientPicker";
import { useLiff } from "@/components/LiffProvider";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useProfile } from "@/components/useProfile";
import { BottomNav, ErrorMessage, PageHeader, Spinner, buttonClass, secondaryButtonClass } from "@/components/ui";
import { formatThaiDate } from "@/lib/format";
import { MEAL_TYPE_LABELS, type MealPlan } from "@/lib/types";

function groupByDate(plans: MealPlan[]): [string, MealPlan[]][] {
  const groups = new Map<string, MealPlan[]>();
  for (const plan of plans) groups.set(plan.plan_date, [...(groups.get(plan.plan_date) ?? []), plan]);
  return [...groups.entries()];
}

function sum(plans: MealPlan[], key: "estimated_calories" | "estimated_cost_thb") {
  return Math.round(plans.reduce((total, plan) => total + Number(plan[key] ?? 0), 0));
}

export default function PlannerPage() {
  const { apiFetch, error: liffError } = useLiff();
  const { profile, loading, error: profileError } = useProfile();
  const [plans, setPlans] = useState<MealPlan[] | null>(null);
  const [generatingDays, setGeneratingDays] = useState<1 | 7 | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFridge, setUseFridge] = useState(false);
  const fridge = useIngredientSelection(setError);

  const load = useCallback(() => {
    apiFetch<{ plans: MealPlan[] }>("/api/meal-plans")
      .then((result) => setPlans(result.plans))
      .catch((loadError: Error) => setError(loadError.message));
  }, [apiFetch]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  async function generate(days: 1 | 7) {
    setGeneratingDays(days);
    setError(null);
    try {
      const ingredients = useFridge ? fridge.selected : [];
      await apiFetch("/api/meal-plans", { method: "POST", body: JSON.stringify({ days, ingredients }) });
      load();
    } catch (generateError) {
      setError((generateError as Error).message);
    } finally {
      setGeneratingDays(null);
    }
  }

  const fatalError = liffError ?? profileError;
  if (fatalError) return <ErrorMessage message={fatalError} />;
  if (loading || !profile || plans === null) return <Spinner />;

  return (
    <>
      <PageHeader
        title="AI จัดสำรับอาหาร"
        subtitle={`เป้าหมาย ${Math.round(Number(profile.target_calories))} kcal/วัน${
          profile.daily_budget_thb ? `, งบ ${Number(profile.daily_budget_thb)} บาท/วัน` : ""
        }`}
      />

      <section className="mb-6 space-y-4" aria-label="วัตถุดิบจากตู้เย็น">
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input
            type="checkbox"
            checked={useFridge}
            onChange={(event) => setUseFridge(event.target.checked)}
            className="h-5 w-5 shrink-0 accent-accent"
          />
          ใช้วัตถุดิบจากตู้เย็น
        </label>
        {useFridge && (
          <>
            <PhotoPicker
              label="ถ่ายภาพตู้เย็น / วัตถุดิบ"
              onSelect={fridge.detect}
              disabled={fridge.detecting || generatingDays !== null}
            />
            {fridge.detecting && <Spinner label="AI กำลังหาวัตถุดิบ..." />}
            <IngredientChips options={fridge.options} selected={fridge.selected} onToggle={fridge.toggle} onAdd={fridge.add} />
            <p className="text-sm text-muted">
              {fridge.selected.length > 0
                ? `เลือกแล้ว ${fridge.selected.length} อย่าง AI จะจัดเมนูโดยใช้ของเหล่านี้เป็นหลัก`
                : "ยังไม่ได้เลือกวัตถุดิบ AI จะจัดเมนูแบบทั่วไป"}
            </p>
          </>
        )}
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <button type="button" className={buttonClass} onClick={() => generate(1)} disabled={generatingDays !== null}>
          {generatingDays === 1 ? "กำลังจัด..." : "จัดเมนูวันนี้"}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={() => generate(7)} disabled={generatingDays !== null}>
          {generatingDays === 7 ? "กำลังจัด..." : "จัดเมนู 7 วัน"}
        </button>
      </div>

      {generatingDays !== null && <Spinner label="AI กำลังจัดสำรับอาหาร อาจใช้เวลาสักครู่..." />}
      {error && <ErrorMessage message={error} />}

      {plans.length === 0 ? (
        <p className="text-muted">ยังไม่มีแผนอาหาร เลือกจัดเมนูวันนี้หรือ 7 วันด้านบน</p>
      ) : (
        <div className="space-y-4">
          {groupByDate(plans).map(([date, dayPlans]) => (
            <section key={date} className="rounded-card bg-paper-2 px-5 pt-5 pb-2" aria-label={formatThaiDate(date)}>
              <h2 className="text-xl">{formatThaiDate(date)}</h2>
              <p className="mt-1 mb-2 text-sm text-muted tabular-nums">
                {sum(dayPlans, "estimated_calories")} kcal, ราว {sum(dayPlans, "estimated_cost_thb")} บาท
              </p>
              <ul className="divide-y divide-rule">
                {dayPlans.map((plan) => (
                  <li key={plan.id}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center gap-3 py-3 text-left"
                      onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                      aria-expanded={expanded === plan.id}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-muted">{MEAL_TYPE_LABELS[plan.meal_type]}</span>
                        <span className="font-bold">{plan.recipe_name}</span>
                      </span>
                      <span className="text-sm tabular-nums">{Math.round(Number(plan.estimated_calories))} kcal</span>
                      <Chevron open={expanded === plan.id} />
                    </button>
                    {expanded === plan.id && (
                      <div className="mb-3 space-y-3 rounded-control bg-paper-3 p-4">
                        <p className="text-sm text-muted">
                          โปรตีน {Math.round(Number(plan.estimated_protein_g))} g, คาร์บ {Math.round(Number(plan.estimated_carbs_g))} g, ไขมัน{" "}
                          {Math.round(Number(plan.estimated_fat_g))} g
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                          {plan.ingredients.map((ingredient, index) => (
                            <li key={index}>
                              {ingredient.name} {ingredient.amount}
                            </li>
                          ))}
                        </ul>
                        <ol className="list-decimal space-y-1 pl-5">
                          {(plan.instructions ?? []).map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <BottomNav active="/planner" />
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 text-muted transition-transform duration-[var(--dur-short)] ease-out ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}
