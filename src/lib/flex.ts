import type { NutrientValues } from "./types";

export interface DailySummaryInput {
  displayName: string | null;
  date: string;
  totals: NutrientValues;
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  mealCount: number;
  warningCount: number;
  dashboardUrl: string;
}

const COLORS = {
  calories: "#2F6B3A",
  over: "#B8352B",
  protein: "#3657A6",
  carbs: "#D9961E",
  fat: "#8A5A3B",
  track: "#DFE5DA",
  muted: "#5C6B60",
};

export function progressPercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

function progressRow(label: string, value: number, target: number, unit: string, color: string) {
  const percent = progressPercent(value, target);
  const barWidth = Math.min(Math.max(percent, 1), 100);
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    margin: "md",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: label, size: "sm", color: "#1F2A22", flex: 1 },
          {
            type: "text",
            text: `${Math.round(value)} / ${Math.round(target)} ${unit}`,
            size: "sm",
            color: percent > 100 ? COLORS.over : COLORS.muted,
            align: "end",
            flex: 2,
          },
        ],
      },
      {
        type: "box",
        layout: "vertical",
        height: "8px",
        backgroundColor: COLORS.track,
        cornerRadius: "4px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            width: `${barWidth}%`,
            height: "8px",
            backgroundColor: percent > 100 ? COLORS.over : color,
            cornerRadius: "4px",
            contents: [],
          },
        ],
      },
    ],
  };
}

// FR-5.2: daily summary with calorie and macro progress bars.
export function buildDailySummaryFlex(input: DailySummaryInput) {
  const remaining = Math.round(input.targets.calories - input.totals.calories);
  const remainingText = remaining >= 0 ? `เหลืออีก ${remaining} kcal` : `เกินเป้าหมาย ${Math.abs(remaining)} kcal`;
  const footnotes: object[] = [
    { type: "text", text: `บันทึกแล้ว ${input.mealCount} มื้อ`, size: "xs", color: COLORS.muted },
  ];
  if (input.warningCount > 0) {
    footnotes.push({
      type: "text",
      text: `มีคำเตือนโซเดียม/น้ำตาล ${input.warningCount} รายการ`,
      size: "xs",
      color: COLORS.over,
    });
  }

  return {
    type: "flex",
    altText: `สรุปการกินวันนี้: ${Math.round(input.totals.calories)} / ${Math.round(input.targets.calories)} kcal`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#E3EEE0",
        contents: [
          { type: "text", text: "สรุปการกินวันนี้", weight: "bold", size: "lg", color: "#22502B" },
          {
            type: "text",
            text: input.displayName ? `${input.displayName} | ${input.date}` : input.date,
            size: "xs",
            color: COLORS.muted,
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: remainingText,
            weight: "bold",
            size: "md",
            color: remaining >= 0 ? COLORS.calories : COLORS.over,
          },
          progressRow("แคลอรี", input.totals.calories, input.targets.calories, "kcal", COLORS.calories),
          progressRow("โปรตีน", input.totals.protein_g, input.targets.protein_g, "g", COLORS.protein),
          progressRow("คาร์บ", input.totals.carbs_g, input.targets.carbs_g, "g", COLORS.carbs),
          progressRow("ไขมัน", input.totals.fat_g, input.targets.fat_g, "g", COLORS.fat),
          { type: "separator", margin: "lg" },
          { type: "box", layout: "vertical", margin: "md", spacing: "xs", contents: footnotes },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: COLORS.calories,
            action: { type: "uri", label: "เปิดแดชบอร์ด", uri: input.dashboardUrl },
          },
        ],
      },
    },
  };
}
