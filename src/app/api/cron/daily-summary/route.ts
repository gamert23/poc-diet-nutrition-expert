import { NextResponse } from "next/server";
import { bangkokDate, bangkokDayRange } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import { buildDailySummaryFlex } from "@/lib/flex";
import { HttpError, handleRoute } from "@/lib/http";
import { liffUrl, pushMessage } from "@/lib/line";
import { sumNutrients } from "@/lib/nutrition";
import { getSupabase } from "@/lib/supabase";
import type { MealLog, Profile } from "@/lib/types";

export const maxDuration = 300;

// FR-5.2: scheduled at 13:00 UTC (20:00 Asia/Bangkok) via vercel.json.
export const GET = handleRoute(async (request: Request) => {
  if (request.headers.get("authorization") !== `Bearer ${requireEnv("CRON_SECRET")}`) {
    throw new HttpError(401, "Unauthorized");
  }

  const date = bangkokDate();
  const { start, end } = bangkokDayRange(date);
  const supabase = getSupabase();

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("daily_summary_enabled", true);
  if (profileError) throw new Error(`Failed to load profiles: ${profileError.message}`);

  const { data: logs, error: logError } = await supabase
    .from("meal_logs")
    .select("*")
    .gte("logged_at", start)
    .lt("logged_at", end);
  if (logError) throw new Error(`Failed to load meal logs: ${logError.message}`);

  const logsByUser = new Map<string, MealLog[]>();
  for (const log of (logs ?? []) as MealLog[]) {
    logsByUser.set(log.user_id, [...(logsByUser.get(log.user_id) ?? []), log]);
  }

  const dashboardUrl = liffUrl("/");
  const results = await Promise.allSettled(
    ((profiles ?? []) as Profile[]).map((profile) => {
      const userLogs = logsByUser.get(profile.id) ?? [];
      const message = buildDailySummaryFlex({
        displayName: profile.display_name,
        date,
        totals: sumNutrients(userLogs),
        targets: {
          calories: Number(profile.target_calories),
          protein_g: Number(profile.protein_target_g),
          carbs_g: Number(profile.carbs_target_g),
          fat_g: Number(profile.fat_target_g),
        },
        mealCount: userLogs.length,
        warningCount: userLogs.reduce((count, log) => count + (log.warning_flags?.length ?? 0), 0),
        dashboardUrl,
      });
      return pushMessage(profile.line_user_id, [message]);
    }),
  );

  const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  for (const failure of failed) console.error("Daily summary push failed", failure.reason);
  return NextResponse.json({ date, sent: results.length - failed.length, failed: failed.length });
});
