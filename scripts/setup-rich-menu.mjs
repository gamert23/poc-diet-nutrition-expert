// Creates the FR-5.1 rich menu (Dashboard, AI Scanner, Fridge AI, AI Chat), sets it as
// the default for all users, then deletes earlier menus this script created.
// Usage: npm run richmenu:setup -- scripts/rich-menu/rich-menu.png
// The image must be 2500x843 px (PNG or JPEG, <= 1 MB) laid out like
// scripts/rich-menu/menu.html: scan on the left half, three stacked tiers on the right.
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
const HALF = WIDTH / 2;
const TIER = Math.floor(HEIGHT / 3);
const MENU_NAME = "AI Nutritionist main menu";
const liffUrl = (route) => `https://liff.line.me/${liffId}${route}`;

const tier = (index) => ({ x: HALF, y: index * TIER, width: HALF, height: index === 2 ? HEIGHT - 2 * TIER : TIER });

const areas = [
  { bounds: { x: 0, y: 0, width: HALF, height: HEIGHT }, action: { type: "uri", label: "AI Scanner", uri: liffUrl("/scan") } },
  { bounds: tier(0), action: { type: "uri", label: "Dashboard", uri: liffUrl("/") } },
  { bounds: tier(1), action: { type: "uri", label: "Fridge AI", uri: liffUrl("/fridge") } },
  { bounds: tier(2), action: { type: "message", label: "AI Chat", text: "สวัสดีนักโภชนาการ AI" } },
];

const richMenu = { size: { width: WIDTH, height: HEIGHT }, selected: true, name: MENU_NAME, chatBarText: "เมนู", areas };

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

// Only menus created by this script are removed; anything else on the account stays.
const { richmenus = [] } = await call("https://api.line.me/v2/bot/richmenu/list", { method: "GET", headers: {} });
for (const menu of richmenus) {
  if (menu.name !== MENU_NAME || menu.richMenuId === richMenuId) continue;
  await call(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, { method: "DELETE", headers: {} });
  console.log(`Deleted previous rich menu ${menu.richMenuId}`);
}
