import { NextResponse } from "next/server";
import { chatReply } from "@/lib/ai";
import { findProfile } from "@/lib/auth";
import { bangkokDate } from "@/lib/date";
import { liffUrl, replyMessage, verifyLineSignature } from "@/lib/line";
import { getDailyMeals } from "@/lib/meals";
import { nutritionistChatPrompt } from "@/lib/prompts";

export const maxDuration = 60;

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

const MAX_CHAT_INPUT_CHARS = 1000;

async function answerNutritionQuestion(lineUserId: string, text: string): Promise<string> {
  const profile = await findProfile(lineUserId);
  const consumed = profile ? (await getDailyMeals(profile.id, bangkokDate())).totals.calories : null;
  const system = nutritionistChatPrompt({
    conditions: profile?.medical_conditions ?? [],
    allergies: profile?.allergies ?? [],
    targetCalories: profile ? Number(profile.target_calories) : null,
    consumedCalories: consumed,
  });
  return chatReply(system, text.slice(0, MAX_CHAT_INPUT_CHARS));
}

async function handleEvent(event: LineEvent): Promise<void> {
  if (!event.replyToken) return;

  if (event.type === "follow") {
    await replyMessage(event.replyToken, [
      {
        type: "text",
        text: `ยินดีต้อนรับสู่ AI Nutritionist! เริ่มตั้งค่าเป้าหมายแคลอรีของคุณได้ที่ ${liffUrl("/")}`,
      },
    ]);
    return;
  }

  // AI Chat (FR-5.1): free-text messages are answered by the nutritionist model.
  if (event.type === "message" && event.message?.type === "text" && event.message.text && event.source?.userId) {
    let answer: string;
    try {
      answer = await answerNutritionQuestion(event.source.userId, event.message.text);
    } catch (error) {
      console.error("AI chat failed", error);
      answer = "ขออภัย ระบบ AI ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
    }
    await replyMessage(event.replyToken, [{ type: "text", text: answer }]);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { events = [] } = JSON.parse(rawBody) as { events?: LineEvent[] };
  const results = await Promise.allSettled(events.map(handleEvent));
  for (const result of results) {
    if (result.status === "rejected") console.error("LINE event handling failed", result.reason);
  }
  return NextResponse.json({ ok: true });
}
