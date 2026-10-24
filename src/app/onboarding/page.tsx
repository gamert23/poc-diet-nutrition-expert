"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useLiff } from "@/components/LiffProvider";
import { SheetSelect } from "@/components/SheetSelect";
import { useProfile } from "@/components/useProfile";
import { BottomNav, Card, Chip, ErrorMessage, PageHeader, Spinner, buttonClass, inputClass } from "@/components/ui";
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  COOKING_EQUIPMENT,
  COOKING_EQUIPMENT_LABELS,
  MEDICAL_CONDITIONS,
  MEDICAL_CONDITION_LABELS,
  type ActivityLevel,
  type CookingEquipment,
  type Gender,
  type MedicalCondition,
  type Profile,
} from "@/lib/types";

interface FormState {
  gender: Gender;
  age: string;
  height_cm: string;
  current_weight_kg: string;
  target_weight_kg: string;
  activity_level: ActivityLevel;
  medical_conditions: MedicalCondition[];
  allergies: string;
  cooking_equipment: CookingEquipment[];
  daily_budget_thb: string;
  daily_summary_enabled: boolean;
}

const EMPTY_FORM: FormState = {
  gender: "female",
  age: "",
  height_cm: "",
  current_weight_kg: "",
  target_weight_kg: "",
  activity_level: "sedentary",
  medical_conditions: [],
  allergies: "",
  cooking_equipment: [],
  daily_budget_thb: "",
  daily_summary_enabled: true,
};

function formFromProfile(profile: Profile): FormState {
  return {
    gender: profile.gender,
    age: String(profile.age),
    height_cm: String(Number(profile.height_cm)),
    current_weight_kg: String(Number(profile.current_weight_kg)),
    target_weight_kg: String(Number(profile.target_weight_kg)),
    activity_level: profile.activity_level,
    medical_conditions: profile.medical_conditions,
    allergies: profile.allergies.join(", "),
    cooking_equipment: profile.cooking_equipment,
    daily_budget_thb: profile.daily_budget_thb === null ? "" : String(Number(profile.daily_budget_thb)),
    daily_summary_enabled: profile.daily_summary_enabled,
  };
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { apiFetch, error: liffError } = useLiff();
  const { profile, loading, error: profileError } = useProfile({ redirectIfMissing: false });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Profile | null>(null);

  useEffect(() => {
    if (profile) setForm(formFromProfile(profile));
  }, [profile]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { profile: saved } = await apiFetch<{ profile: Profile }>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
          height_cm: Number(form.height_cm),
          current_weight_kg: Number(form.current_weight_kg),
          target_weight_kg: Number(form.target_weight_kg),
          allergies: form.allergies
            .split(/[,\n]/)
            .map((item) => item.trim())
            .filter(Boolean),
          daily_budget_thb: form.daily_budget_thb === "" ? null : Number(form.daily_budget_thb),
        }),
      });
      setResult(saved);
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fatalError = liffError ?? profileError;
  if (fatalError) return <ErrorMessage message={fatalError} />;
  if (loading) return <Spinner />;

  if (result) {
    return (
      <>
        <PageHeader title="เป้าหมายของคุณ" subtitle="คำนวณด้วยสูตร Mifflin-St Jeor" />
        <Card>
          <p className="text-card-muted">เป้าหมายแคลอรีต่อวัน</p>
          <p className="text-[4rem] leading-none font-bold tabular-nums">
            {Math.round(Number(result.target_calories)).toLocaleString("th-TH")}
            <span className="ml-2 text-xl">kcal</span>
          </p>
          <dl className="mt-5 divide-y divide-card-rule border-t-2 border-card-rule">
            <Row label="BMR (พลังงานพื้นฐาน)" value={`${Math.round(Number(result.bmr))} kcal`} />
            <Row label="TDEE (พลังงานที่ใช้ต่อวัน)" value={`${Math.round(Number(result.tdee))} kcal`} />
            <Row label="โปรตีน (30%)" value={`${Number(result.protein_target_g)} g`} />
            <Row label="คาร์บ (45%)" value={`${Number(result.carbs_target_g)} g`} />
            <Row label="ไขมัน (25%)" value={`${Number(result.fat_target_g)} g`} />
          </dl>
        </Card>
        <button type="button" className={`${buttonClass} mt-6`} onClick={() => router.push("/")}>
          ไปที่หน้าหลัก
        </button>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={profile ? "แก้ไขโปรไฟล์สุขภาพ" : "เริ่มต้นใช้งาน"}
        subtitle="ข้อมูลนี้ใช้คำนวณเป้าหมายแคลอรีและคำเตือนด้านสุขภาพ"
      />
      <form onSubmit={submit}>
        <div className="divide-y-2 divide-rule">
          <fieldset className="space-y-5 pb-8">
            <FieldGroup label="เพศ">
              <div className="grid grid-cols-2 gap-1 rounded-control bg-paper-3 p-1">
                <button
                  type="button"
                  aria-pressed={form.gender === "female"}
                  onClick={() => update("gender", "female")}
                  className={segmentClass(form.gender === "female")}
                >
                  หญิง
                </button>
                <button
                  type="button"
                  aria-pressed={form.gender === "male"}
                  onClick={() => update("gender", "male")}
                  className={segmentClass(form.gender === "male")}
                >
                  ชาย
                </button>
              </div>
            </FieldGroup>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
              <NumberField label="อายุ (ปี)" value={form.age} onChange={(value) => update("age", value)} min={13} max={120} />
              <NumberField label="ส่วนสูง (ซม.)" value={form.height_cm} onChange={(value) => update("height_cm", value)} min={100} max={250} />
              <NumberField
                label="น้ำหนักปัจจุบัน (กก.)"
                value={form.current_weight_kg}
                onChange={(value) => update("current_weight_kg", value)}
                min={25}
                max={350}
                step="0.1"
              />
              <NumberField
                label="น้ำหนักเป้าหมาย (กก.)"
                value={form.target_weight_kg}
                onChange={(value) => update("target_weight_kg", value)}
                min={25}
                max={350}
                step="0.1"
              />
            </div>
            <div>
              <label htmlFor="activity-level" className="mb-1.5 block text-sm font-bold">
                ระดับกิจกรรม
              </label>
              <SheetSelect
                id="activity-level"
                title="ระดับกิจกรรม"
                value={form.activity_level}
                options={ACTIVITY_LEVELS.map((level) => ({ value: level, label: ACTIVITY_LEVEL_LABELS[level] }))}
                onChange={(level) => update("activity_level", level)}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-5 py-8">
            <FieldGroup label="โรคประจำตัว">
              <div className="flex flex-wrap gap-2">
                {MEDICAL_CONDITIONS.map((condition) => (
                  <Chip
                    key={condition}
                    selected={form.medical_conditions.includes(condition)}
                    onClick={() => update("medical_conditions", toggle(form.medical_conditions, condition))}
                  >
                    {MEDICAL_CONDITION_LABELS[condition]}
                  </Chip>
                ))}
              </div>
            </FieldGroup>
            <label className="block">
              <FieldLabel>ประวัติแพ้อาหาร (คั่นด้วยจุลภาค)</FieldLabel>
              <input
                className={inputClass}
                value={form.allergies}
                onChange={(event) => update("allergies", event.target.value)}
                placeholder="เช่น กุ้ง, ถั่วลิสง"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-5 py-8">
            <FieldGroup label="อุปกรณ์ทำอาหารที่มี">
              <div className="flex flex-wrap gap-2">
                {COOKING_EQUIPMENT.map((item) => (
                  <Chip
                    key={item}
                    selected={form.cooking_equipment.includes(item)}
                    onClick={() => update("cooking_equipment", toggle(form.cooking_equipment, item))}
                  >
                    {COOKING_EQUIPMENT_LABELS[item]}
                  </Chip>
                ))}
              </div>
            </FieldGroup>
            <NumberField
              label="งบค่าอาหารต่อวัน (บาท, ไม่บังคับ)"
              value={form.daily_budget_thb}
              onChange={(value) => update("daily_budget_thb", value)}
              min={0}
              max={100000}
              required={false}
            />
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={form.daily_summary_enabled}
                onChange={(event) => update("daily_summary_enabled", event.target.checked)}
                className="h-5 w-5 shrink-0 accent-accent"
              />
              รับสรุปการกินรายวันทาง LINE เวลา 20:00 น.
            </label>
          </fieldset>
        </div>

        {error && <ErrorMessage message={error} />}
        <button type="submit" className={buttonClass} disabled={saving}>
          {saving ? "กำลังคำนวณ..." : "คำนวณเป้าหมาย"}
        </button>
      </form>
      {profile && <BottomNav active="/onboarding" />}
    </>
  );
}

function segmentClass(selected: boolean): string {
  return `min-h-11 rounded-[12px] transition-[background-color,translate] duration-[var(--dur-micro)] ease-out active:translate-y-px ${
    selected ? "bg-accent font-bold text-accent-ink" : "text-muted hover:text-ink"
  }`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-bold">{children}</span>;
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <span id={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </span>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "1",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        inputMode="decimal"
        className={`${inputClass} tabular-nums`}
        value={value}
        min={min}
        max={max}
        step={step}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-card-muted">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}
