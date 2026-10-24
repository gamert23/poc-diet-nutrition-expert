import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env";

const MESSAGING_API = "https://api.line.me/v2/bot/message";

export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", requireEnv("LINE_CHANNEL_SECRET")).update(rawBody).digest();
  const received = Buffer.from(signature, "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function callMessagingApi(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${MESSAGING_API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("LINE_CHANNEL_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`LINE ${path} failed with ${response.status}: ${await response.text()}`);
  }
}

export function pushMessage(to: string, messages: object[]): Promise<void> {
  return callMessagingApi("push", { to, messages });
}

export function replyMessage(replyToken: string, messages: object[]): Promise<void> {
  return callMessagingApi("reply", { replyToken, messages });
}

export function liffUrl(path = ""): string {
  return `https://liff.line.me/${requireEnv("NEXT_PUBLIC_LIFF_ID")}${path}`;
}
