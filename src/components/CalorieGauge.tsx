import { progressPercent } from "@/lib/flex";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieGauge({ consumed, target }: { consumed: number; target: number }) {
  const percent = progressPercent(consumed, target);
  const over = percent > 100;
  const dash = (Math.min(percent, 100) / 100) * CIRCUMFERENCE;
  const remaining = Math.round(target - consumed);

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 128 128" className="h-32 w-32 shrink-0" role="img" aria-label={`กินไปแล้ว ${percent}% ของเป้าหมาย`}>
        <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke={over ? "#dc2626" : "#16a34a"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="62" textAnchor="middle" className="fill-gray-900 text-[22px] font-bold">
          {Math.round(consumed)}
        </text>
        <text x="64" y="82" textAnchor="middle" className="fill-gray-500 text-[11px]">
          / {Math.round(target)} kcal
        </text>
      </svg>
      <div>
        <p className="text-sm text-gray-500">{over ? "เกินเป้าหมาย" : "เหลือวันนี้"}</p>
        <p className={`text-2xl font-bold ${over ? "text-red-600" : "text-emerald-700"}`}>{Math.abs(remaining)} kcal</p>
      </div>
    </div>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const percent = progressPercent(value, target);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={percent > 100 ? "text-red-600" : "text-gray-500"}>
          {Math.round(value)} / {Math.round(target)} g
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: percent > 100 ? "#dc2626" : color }}
        />
      </div>
    </div>
  );
}
