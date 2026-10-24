import { progressPercent } from "@/lib/flex";
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from "@/lib/types";

export const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "var(--color-turmeric)",
  lunch: "var(--color-pandan)",
  dinner: "var(--color-pea)",
  snack: "var(--color-tamarind)",
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
        stroke="var(--color-ink-soft)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="22" y="34" width="76" height="12" rx="6" fill="var(--color-ink-soft)" />
      <rect x="54" y="28" width="12" height="8" rx="3" fill="var(--color-ink-soft)" />

      {stackTop > BODY_TOP + 2 && (
        <rect
          x="24"
          y={BODY_TOP}
          width="72"
          height={stackTop - BODY_TOP - 1}
          rx="5"
          fill="var(--color-surface)"
          stroke="var(--color-line)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}

      {rects.map((tier, index) => (
        <g key={tier.mealType} className="pinto-tier" style={{ animationDelay: `${index * 90}ms` }}>
          <rect x="24" y={tier.y} width="72" height={tier.height} rx="5" fill={MEAL_COLORS[tier.mealType]} />
          <rect x="24" y={tier.y} width="72" height={Math.min(3, tier.height)} rx="1.5" fill="#ffffff" opacity="0.3" />
        </g>
      ))}

      {over && (
        <line
          x1="18"
          x2="102"
          y1={targetY}
          y2={targetY}
          stroke="var(--color-chili)"
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
          <span className="text-ink-soft">{MEAL_TYPE_LABELS[tier.mealType]}</span>
          <span className="ml-auto tabular-nums text-muted">{Math.round(tier.calories).toLocaleString("th-TH")}</span>
        </li>
      ))}
    </ul>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const percent = progressPercent(value, target);
  const over = percent > 100;
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="h-1.5 rounded-full bg-line">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: over ? "var(--color-chili)" : color }}
        />
      </div>
      <span className={`text-right text-xs tabular-nums ${over ? "font-semibold text-chili" : "text-muted"}`}>
        {Math.round(value)}/{Math.round(target)} g
      </span>
    </div>
  );
}
