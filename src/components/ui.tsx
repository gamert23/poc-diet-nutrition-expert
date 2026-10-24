import Link from "next/link";
import type { ReactNode } from "react";
import { WARNING_MESSAGES } from "@/lib/safety";
import type { WarningFlag } from "@/lib/types";

// The one raised surface on a screen: the thing the user came for.
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card bg-card p-5 text-card-ink shadow-card ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-[2rem] leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
    </header>
  );
}

// fullPage centres the spinner in the viewport while a screen's data loads;
// otherwise it sits centred in its own row inside the page.
export function Spinner({ label = "กำลังโหลด...", fullPage = false }: { label?: string; fullPage?: boolean }) {
  return (
    <div
      className={
        fullPage
          ? "fixed inset-0 flex flex-col items-center justify-center gap-4 text-muted"
          : "flex items-center justify-center gap-3 py-10 text-center text-muted"
      }
      role="status"
    >
      <span
        className={`keep-motion shrink-0 animate-spin rounded-full border-accent border-t-transparent ${
          fullPage ? "h-10 w-10 border-4" : "h-5 w-5 border-2"
        }`}
      />
      {label}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-control bg-error-wash px-4 py-3 text-error" role="alert">
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

// On the green the flag keeps its signal in ink and icon on a sunk pill; the pale
// wash is only used on the warm-white card.
export function WarningList({ flags, onGround = false }: { flags: readonly WarningFlag[]; onGround?: boolean }) {
  if (flags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {flags.map((flag) => (
        <li key={flag} className={`flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-bold ${onGround ? "bg-paper-3 text-error-on-ground" : "bg-error-wash text-error"}`}>
          <WarningIcon />
          {WARNING_MESSAGES[flag]}
        </li>
      ))}
    </ul>
  );
}

// Sits on the card: label above, figure below, columns parted by a rule.
export function NutrientGrid({
  values,
}: {
  values: { calories: number; protein_g: number; carbs_g: number; fat_g: number; sodium_mg?: number; sugar_g?: number };
}) {
  const items: [string, string, string][] = [
    ["แคลอรี", `${Math.round(values.calories)}`, "kcal"],
    ["โปรตีน", `${Math.round(values.protein_g)}`, "g"],
    ["คาร์บ", `${Math.round(values.carbs_g)}`, "g"],
    ["ไขมัน", `${Math.round(values.fat_g)}`, "g"],
  ];
  if (values.sodium_mg !== undefined) items.push(["โซเดียม", `${Math.round(values.sodium_mg)}`, "mg"]);
  if (values.sugar_g !== undefined) items.push(["น้ำตาล", `${Math.round(values.sugar_g)}`, "g"]);
  return (
    <dl className="grid grid-cols-3 gap-y-4">
      {items.map(([label, value, unit]) => (
        <div key={label} className="border-l-2 border-card-rule pl-3">
          <dt className="text-sm text-card-muted">{label}</dt>
          <dd className="text-xl leading-snug font-bold tabular-nums">
            {value}
            <span className="ml-1 text-sm">{unit}</span>
          </dd>
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
      className={`min-h-11 rounded-pill px-4 py-2 transition-[background-color,box-shadow,translate] duration-[var(--dur-micro)] ease-out active:translate-y-px ${
        selected
          ? "bg-accent font-bold text-accent-ink"
          : "bg-paper-2 text-ink hover:bg-paper-hover"
      }`}
    >
      {children}
    </button>
  );
}

const controlBase =
  "inline-flex min-h-11 w-full items-center justify-center rounded-control px-4 font-bold whitespace-nowrap transition-[background-color,border-color,translate] duration-[var(--dur-micro)] ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0";

export const buttonClass = `${controlBase} bg-accent text-accent-ink hover:bg-accent-2 disabled:bg-paper-2 disabled:text-muted disabled:opacity-100`;
export const secondaryButtonClass = `${controlBase} border-2 border-ink text-ink hover:bg-paper-2`;
export const cardSecondaryButtonClass = `${controlBase} border-2 border-card-ink text-card-ink hover:bg-card-rule`;

export const inputClass =
  "min-h-11 w-full rounded-control border-2 border-muted bg-paper-3 px-3 text-base text-ink disabled:cursor-not-allowed disabled:opacity-55";
export const cardInputClass =
  "min-h-11 w-full rounded-control border-2 border-card-muted bg-card px-3 text-base text-card-ink disabled:cursor-not-allowed disabled:opacity-55";

const NAV_ITEMS = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/scan", label: "สแกนอาหาร" },
  { href: "/fridge", label: "ตู้เย็น AI" },
  { href: "/planner", label: "จัดเมนู" },
  { href: "/onboarding", label: "โปรไฟล์" },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-nav)] bg-paper-3 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md gap-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.href} className="min-w-0 flex-1">
            <Link
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-pill px-1 text-[0.8125rem] whitespace-nowrap transition-colors duration-[var(--dur-micro)] ${
                active === item.href ? "bg-paper-2 font-bold text-ink" : "text-muted hover:text-ink"
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
