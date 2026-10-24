import Link from "next/link";
import type { ReactNode } from "react";
import { WARNING_MESSAGES } from "@/lib/safety";
import type { WarningFlag } from "@/lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-line bg-surface p-4 ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      <h1 className="font-display text-[1.75rem] leading-tight font-medium text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

export function Spinner({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-pandan border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-chili-wash p-3 text-sm text-chili" role="alert">
      {message}
    </p>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function WarningList({ flags }: { flags: readonly WarningFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <ul className="space-y-1">
      {flags.map((flag) => (
        <li key={flag} className="flex items-center gap-2 rounded-lg bg-chili-wash px-3 py-2 text-sm font-medium text-chili">
          <WarningIcon />
          {WARNING_MESSAGES[flag]}
        </li>
      ))}
    </ul>
  );
}

export function NutrientGrid({
  values,
}: {
  values: { calories: number; protein_g: number; carbs_g: number; fat_g: number; sodium_mg?: number; sugar_g?: number };
}) {
  const items: [string, string][] = [
    ["แคลอรี", `${Math.round(values.calories)} kcal`],
    ["โปรตีน", `${Math.round(values.protein_g)} g`],
    ["คาร์บ", `${Math.round(values.carbs_g)} g`],
    ["ไขมัน", `${Math.round(values.fat_g)} g`],
  ];
  if (values.sodium_mg !== undefined) items.push(["โซเดียม", `${Math.round(values.sodium_mg)} mg`]);
  if (values.sugar_g !== undefined) items.push(["น้ำตาล", `${Math.round(values.sugar_g)} g`]);
  return (
    <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="border-l-2 border-line pl-2.5">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="text-lg leading-snug font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        selected ? "border-pandan-deep bg-pandan-deep text-white" : "border-line bg-surface text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

export const buttonClass =
  "inline-flex w-full items-center justify-center rounded-[14px] bg-pandan px-4 py-3 font-semibold text-white active:bg-pandan-deep disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-[14px] bg-pandan-wash px-4 py-3 font-semibold text-pandan-deep disabled:opacity-50";
export const inputClass =
  "w-full rounded-[12px] border border-line bg-surface px-3 py-2.5 text-base text-ink focus:border-pandan";

const NAV_ITEMS = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/scan", label: "สแกนอาหาร" },
  { href: "/fridge", label: "ตู้เย็น AI" },
  { href: "/planner", label: "จัดเมนู" },
  { href: "/onboarding", label: "โปรไฟล์" },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map((item) => (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={`block border-t-2 py-3 text-center text-xs ${
                active === item.href ? "border-pandan font-semibold text-pandan" : "border-transparent text-muted"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
