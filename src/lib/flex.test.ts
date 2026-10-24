import { describe, expect, it } from "vitest";
import { buildDailySummaryFlex, progressPercent } from "./flex";

const baseInput = {
  displayName: "Ploy",
  date: "2026-10-24",
  totals: { calories: 900, protein_g: 60, carbs_g: 100, fat_g: 30, sodium_mg: 800, sugar_g: 12 },
  targets: { calories: 1500, protein_g: 112.5, carbs_g: 168.8, fat_g: 41.7 },
  mealCount: 2,
  warningCount: 0,
  dashboardUrl: "https://liff.line.me/test/",
};

function findTexts(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  const own = record.type === "text" && typeof record.text === "string" ? [record.text] : [];
  return [...own, ...Object.values(record).flatMap(findTexts)];
}

describe("progressPercent", () => {
  it("handles zero targets without dividing by zero", () => {
    expect(progressPercent(100, 0)).toBe(0);
  });
});

describe("buildDailySummaryFlex", () => {
  it("builds a flex bubble with remaining calories and four progress rows", () => {
    const message = buildDailySummaryFlex(baseInput);
    expect(message.type).toBe("flex");
    expect(message.altText).toContain("900 / 1500");
    const texts = findTexts(message.contents);
    expect(texts).toContain("เหลืออีก 600 kcal");
    expect(texts).toEqual(expect.arrayContaining(["แคลอรี", "โปรตีน", "คาร์บ", "ไขมัน"]));
  });

  it("reports calories over the target and the warning count", () => {
    const texts = findTexts(
      buildDailySummaryFlex({ ...baseInput, totals: { ...baseInput.totals, calories: 1700 }, warningCount: 2 }).contents,
    );
    expect(texts).toContain("เกินเป้าหมาย 200 kcal");
    expect(texts).toContain("มีคำเตือนโซเดียม/น้ำตาล 2 รายการ");
  });

  it("caps the progress bar width at 100% and keeps a visible minimum", () => {
    const json = JSON.stringify(
      buildDailySummaryFlex({ ...baseInput, totals: { ...baseInput.totals, calories: 5000, protein_g: 0 } }),
    );
    expect(json).toContain('"width":"100%"');
    expect(json).toContain('"width":"1%"');
    expect(json).not.toMatch(/"width":"(3\d\d|[2-9]\d\d)%"/);
  });
});
