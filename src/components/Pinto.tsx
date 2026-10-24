import { progressPercent } from "@/lib/flex";
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from "@/lib/types";

export const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "var(--color-meal-breakfast)",
  lunch: "var(--color-meal-lunch)",
  dinner: "var(--color-meal-dinner)",
  snack: "var(--color-meal-snack)",
};

const BODY_TOP = 50;
const BODY_BOTTOM = 210;
const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP;
const TIER_GAP = 3;
const MIN_TIER_HEIGHT = 8;

export interface PintoTier {
  mealType: MealType;
  calories: number;
}

export function caloriesByMeal(logs: { meal_type: MealType; calories: number | string }[]): PintoTier[] {
  return MEAL_TYPES.map((mealType) => ({
    mealType,
    calories: logs.filter((log) => log.meal_type === mealType).reduce((sum, log) => sum + Number(log.calories), 0),
  })).filter((tier) => tier.calories > 0);
}

// A pinto (stacked Thai food carrier): its full height is today's calorie target and
// each meal eaten is one tier, so the empty space on top is what is left to eat.
export function PintoStack({ tiers, target }: { tiers: PintoTier[]; target: number }) {
  const consumed = tiers.reduce((sum, tier) => sum + tier.calories, 0);
  const capacity = Math.max(target, consumed, 1);
  const rawHeights = tiers.map((tier) => Math.max((tier.calories / capacity) * BODY_HEIGHT, MIN_TIER_HEIGHT));
  const rawTotal = rawHeights.reduce((sum, height) => sum + height, 0);
  const scale = rawTotal > BODY_HEIGHT ? BODY_HEIGHT / rawTotal : 1;

  let cursor = BODY_BOTTOM;
  const rects = tiers.map((tier, index) => {
    const height = rawHeights[index] * scale;
    cursor -= height;
    return { ...tier, y: cursor + TIER_GAP / 2, height: Math.max(height - TIER_GAP, 2) };
  });
  const stackTop = cursor;
  const targetY = BODY_BOTTOM - (target / capacity) * BODY_HEIGHT;
  const over = consumed > target;
  const percent = progressPercent(consumed, target);

  return (
    <svg viewBox="0 0 120 220" className="h-56 w-auto shrink-0" role="img" aria-label={`กินไปแล้ว ${percent}% ของเป้าหมายวันนี้`}>
      <path
        d="M16 210 V22 Q16 10 28 10 H92 Q104 10 104 22 V210"
        fill="none"
        stroke="var(--color-card-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="22" y="34" width="76" height="12" rx="6" fill="var(--color-card-ink)" />
      <rect x="54" y="28" width="12" height="8" rx="3" fill="var(--color-card-ink)" />

      {stackTop > BODY_TOP + 2 && (
        <rect
          x="24"
          y={BODY_TOP}
          width="72"
          height={stackTop - BODY_TOP - 1}
          rx="5"
          fill="none"
          stroke="var(--color-card-muted)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}

      {rects.map((tier) => (
        <g key={tier.mealType}>
          <rect x="24" y={tier.y} width="72" height={tier.height} rx="5" fill={MEAL_COLORS[tier.mealType]} />
          <rect x="24" y={tier.y} width="72" height={Math.min(3, tier.height)} rx="1.5" fill="var(--color-card)" opacity="0.3" />
        </g>
      ))}

      {over && (
        <line
          x1="18"
          x2="102"
          y1={targetY}
          y2={targetY}
          stroke="var(--color-error)"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
      )}
    </svg>
  );
}

export function MealLegend({ tiers }: { tiers: PintoTier[] }) {
  if (tiers.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {[...tiers].reverse().map((tier) => (
        <li key={tier.mealType} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MEAL_COLORS[tier.mealType] }} aria-hidden="true" />
          <span>{MEAL_TYPE_LABELS[tier.mealType]}</span>
          <span className="ml-auto font-bold tabular-nums">{Math.round(tier.calories).toLocaleString("th-TH")}</span>
        </li>
      ))}
    </ul>
  );
}

// Sits on the card. One fill colour for all three: the label names the macro, and
// the error colour is kept for going over.
export function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const percent = progressPercent(value, target);
  const over = percent > 100;
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
      <span className="text-sm">{label}</span>
      <div className="h-2 rounded-pill bg-track">
        <div
          className={`h-2 rounded-pill ${over ? "bg-error" : "bg-meal-lunch"}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={`text-right text-sm tabular-nums ${over ? "font-bold text-error" : "text-card-muted"}`}>
        {Math.round(value)}/{Math.round(target)} g
      </span>
    </div>
  );
}
