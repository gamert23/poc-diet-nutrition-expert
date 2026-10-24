"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, ErrorMessage, PageHeader, Spinner, buttonClass, secondaryButtonClass } from "@/components/ui";
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
      await apiFetch("/api/meal-plans", { method: "POST", body: JSON.stringify({ days }) });
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
          profile.daily_budget_thb ? ` | งบ ${Number(profile.daily_budget_thb)} บาท/วัน` : ""
        }`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
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
        <Card>
          <p className="text-sm text-gray-500">ยังไม่มีแผนอาหาร กดปุ่มด้านบนเพื่อให้ AI จัดเมนูให้</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupByDate(plans).map(([date, dayPlans]) => (
            <Card key={date}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold">{date}</h2>
                <span className="text-xs text-gray-500">
                  {sum(dayPlans, "estimated_calories")} kcal | ~{sum(dayPlans, "estimated_cost_thb")} บาท
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {dayPlans.map((plan) => (
                  <li key={plan.id} className="py-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-left"
                      onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                      aria-expanded={expanded === plan.id}
                    >
                      <span>
                        <span className="block text-xs text-gray-500">{MEAL_TYPE_LABELS[plan.meal_type]}</span>
                        <span className="font-medium">{plan.recipe_name}</span>
                      </span>
                      <span className="text-sm text-gray-600">{Math.round(Number(plan.estimated_calories))} kcal</span>
                    </button>
                    {expanded === plan.id && (
                      <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
                        <p className="text-xs text-gray-500">
                          P {Math.round(Number(plan.estimated_protein_g))} g | C {Math.round(Number(plan.estimated_carbs_g))} g | F{" "}
                          {Math.round(Number(plan.estimated_fat_g))} g
                        </p>
                        <ul className="list-disc pl-5">
                          {plan.ingredients.map((ingredient, index) => (
                            <li key={index}>
                              {ingredient.name} {ingredient.amount}
                            </li>
                          ))}
                        </ul>
                        <ol className="list-decimal pl-5">
                          {(plan.instructions ?? []).map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <BottomNav active="/planner" />
    </>
  );
}
