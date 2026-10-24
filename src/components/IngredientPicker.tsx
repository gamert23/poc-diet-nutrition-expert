"use client";

import { useState, type FormEvent } from "react";
import { compressImage, imageFormData } from "@/lib/image-client";
import { useLiff } from "./LiffProvider";
import { Chip, inputClass, secondaryButtonClass } from "./ui";

const QUICK_INGREDIENTS = [
  "ไข่ไก่",
  "อกไก่",
  "หมูสับ",
  "ปลา",
  "กุ้ง",
  "เต้าหู้",
  "ข้าวกล้อง",
  "เส้นบุก",
  "ผักกาดขาว",
  "บรอกโคลี",
  "แครอท",
  "มะเขือเทศ",
  "เห็ด",
  "ผักบุ้ง",
  "หอมใหญ่",
  "กระเทียม",
];

// Ingredient selection shared by the fridge recipe and the meal planner: quick
// chips, typed additions, and ingredients detected from a fridge photo.
export function useIngredientSelection(onError: (message: string | null) => void) {
  const { apiFetch } = useLiff();
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);

  const options = [...QUICK_INGREDIENTS, ...extra.filter((item) => !QUICK_INGREDIENTS.includes(item))];

  function add(names: string[]) {
    const cleaned = names.map((name) => name.trim()).filter(Boolean);
    setExtra((current) => [...new Set([...current, ...cleaned])]);
    setSelected((current) => [...new Set([...current, ...cleaned])]);
  }

  function toggle(name: string) {
    setSelected((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  async function detect(file: File) {
    setDetecting(true);
    onError(null);
    try {
      const { ingredients } = await apiFetch<{ ingredients: string[] }>("/api/fridge/ingredients", {
        method: "POST",
        body: imageFormData(await compressImage(file)),
      });
      if (ingredients.length === 0) onError("ไม่พบวัตถุดิบในภาพ ลองเลือกจากรายการด้านล่างแทน");
      add(ingredients);
    } catch (detectError) {
      onError((detectError as Error).message);
    } finally {
      setDetecting(false);
    }
  }

  return { selected, options, detecting, add, toggle, detect };
}

export function IngredientChips({
  options,
  selected,
  onToggle,
  onAdd,
}: {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (name: string) => void;
  onAdd: (names: string[]) => void;
}) {
  const [customIngredient, setCustomIngredient] = useState("");

  function addCustom(event: FormEvent) {
    event.preventDefault();
    onAdd(customIngredient.split(","));
    setCustomIngredient("");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {options.map((name) => (
          <Chip key={name} selected={selected.includes(name)} onClick={() => onToggle(name)}>
            {name}
          </Chip>
        ))}
      </div>
      <form onSubmit={addCustom} className="flex gap-2">
        <input
          className={`${inputClass} min-w-0`}
          value={customIngredient}
          onChange={(event) => setCustomIngredient(event.target.value)}
          placeholder="พิมพ์วัตถุดิบเพิ่ม"
          aria-label="พิมพ์วัตถุดิบเพิ่ม"
        />
        <button type="submit" className={`${secondaryButtonClass} w-auto! shrink-0`}>
          เพิ่ม
        </button>
      </form>
    </>
  );
}
