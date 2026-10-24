// Creates the FR-5.1 rich menu (Dashboard, AI Scanner, Fridge AI, AI Chat) and sets it
// as the default for all users.
// Usage: node --env-file=.env.local scripts/setup-rich-menu.mjs path/to/rich-menu.png
// The image must be 2500x843 px (PNG or JPEG, <= 1 MB), split into 4 equal columns.
import { readFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
const imagePath = process.argv[2];

if (!token || !liffId || !imagePath) {
  console.error("Requires LINE_CHANNEL_ACCESS_TOKEN, NEXT_PUBLIC_LIFF_ID, and an image path argument.");
  process.exit(1);
}

const WIDTH = 2500;
const HEIGHT = 843;
const COLUMN = Math.floor(WIDTH / 4);
const liffUrl = (route) => `https://liff.line.me/${liffId}${route}`;

const actions = [
  { type: "uri", label: "Dashboard", uri: liffUrl("/") },
  { type: "uri", label: "AI Scanner", uri: liffUrl("/scan") },
  { type: "uri", label: "Fridge AI", uri: liffUrl("/fridge") },
  { type: "message", label: "AI Chat", text: "สวัสดีนักโภชนาการ AI" },
];

const richMenu = {
  size: { width: WIDTH, height: HEIGHT },
  selected: true,
  name: "AI Nutritionist main menu",
  chatBarText: "เมนู",
  areas: actions.map((action, index) => ({
    bounds: { x: index * COLUMN, y: 0, width: index === 3 ? WIDTH - 3 * COLUMN : COLUMN, height: HEIGHT },
    action,
  })),
};

async function call(url, init) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method} ${url} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

const { richMenuId } = await call("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(richMenu),
});
console.log(`Created rich menu ${richMenuId}`);

const contentType = path.extname(imagePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
await call(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { "Content-Type": contentType },
  body: await readFile(imagePath),
});
console.log("Uploaded rich menu image");

await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST", headers: {} });
console.log("Set as default rich menu");
