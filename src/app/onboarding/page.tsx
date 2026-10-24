"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useLiff } from "@/components/LiffProvider";
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
        <Card className="space-y-2">
          <Row label="BMR (พลังงานพื้นฐาน)" value={`${Math.round(Number(result.bmr))} kcal`} />
          <Row label="TDEE (พลังงานที่ใช้ต่อวัน)" value={`${Math.round(Number(result.tdee))} kcal`} />
          <Row label="เป้าหมายแคลอรีต่อวัน" value={`${Math.round(Number(result.target_calories))} kcal`} strong />
          <Row label="โปรตีน (30%)" value={`${Number(result.protein_target_g)} g`} />
          <Row label="คาร์บ (45%)" value={`${Number(result.carbs_target_g)} g`} />
          <Row label="ไขมัน (25%)" value={`${Number(result.fat_target_g)} g`} />
        </Card>
        <button type="button" className={`${buttonClass} mt-4`} onClick={() => router.push("/")}>
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
      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-3">
          <Field label="เพศ">
            <div className="flex gap-2">
              <Chip selected={form.gender === "female"} onClick={() => update("gender", "female")}>
                หญิง
              </Chip>
              <Chip selected={form.gender === "male"} onClick={() => update("gender", "male")}>
                ชาย
              </Chip>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
          <Field label="ระดับกิจกรรม">
            <select
              className={inputClass}
              value={form.activity_level}
              onChange={(event) => update("activity_level", event.target.value as ActivityLevel)}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACTIVITY_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        <Card className="space-y-3">
          <Field label="โรคประจำตัว">
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
          </Field>
          <Field label="ประวัติแพ้อาหาร (คั่นด้วยจุลภาค)">
            <input
              className={inputClass}
              value={form.allergies}
              onChange={(event) => update("allergies", event.target.value)}
              placeholder="เช่น กุ้ง, ถั่วลิสง"
            />
          </Field>
        </Card>

        <Card className="space-y-3">
          <Field label="อุปกรณ์ทำอาหารที่มี">
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
          </Field>
          <NumberField
            label="งบค่าอาหารต่อวัน (บาท, ไม่บังคับ)"
            value={form.daily_budget_thb}
            onChange={(value) => update("daily_budget_thb", value)}
            min={0}
            max={100000}
            required={false}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.daily_summary_enabled}
              onChange={(event) => update("daily_summary_enabled", event.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            รับสรุปการกินรายวันทาง LINE เวลา 20:00 น.
          </label>
        </Card>

        {error && <ErrorMessage message={error} />}
        <button type="submit" className={buttonClass} disabled={saving}>
          {saving ? "กำลังคำนวณ..." : "คำนวณเป้าหมาย"}
        </button>
      </form>
      {profile && <BottomNav active="/onboarding" />}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
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
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        className={inputClass}
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

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={strong ? "text-lg font-bold text-emerald-700" : "font-semibold"}>{value}</span>
    </div>
  );
}
