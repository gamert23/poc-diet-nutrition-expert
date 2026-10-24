// Creates the FR-5.1 rich menu, sets it as the default for all users, then deletes
// earlier menus this script created.
// Usage: npm run richmenu:setup -- <image> [layout.json]
//   npm run richmenu:setup -- scripts/rich-menu/illustrated.jpg scripts/rich-menu/illustrated.json
//   npm run richmenu:setup -- scripts/rich-menu/rich-menu.png   (built-in pinto layout)
// Images are PNG or JPEG, at most 1 MB, 800 to 2500 px wide, width/height >= 1.45.
// A layout file gives the image size and one area per tap target, each with either
// a LIFF `route` or a chat `message`.
import { readFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
const [imagePath, layoutPath] = process.argv.slice(2);

if (!token || !liffId || !imagePath) {
  console.error("Requires LINE_CHANNEL_ACCESS_TOKEN, NEXT_PUBLIC_LIFF_ID, and an image path argument.");
  process.exit(1);
}

const MENU_NAME = "AI Nutritionist main menu";
const liffUrl = (route) => `https://liff.line.me/${liffId}${route}`;

// The 2500x843 pinto layout drawn by scripts/rich-menu/menu.html: scan on the left
// half, three stacked tiers on the right.
function pintoLayout() {
  const width = 2500;
  const height = 843;
  const half = width / 2;
  const tierHeight = Math.floor(height / 3);
  const tier = (index) => ({ x: half, y: index * tierHeight, width: half, height: index === 2 ? height - 2 * tierHeight : tierHeight });
  return {
    size: { width, height },
    areas: [
      { label: "AI Scanner", bounds: { x: 0, y: 0, width: half, height }, route: "/scan" },
      { label: "Dashboard", bounds: tier(0), route: "/" },
      { label: "Fridge AI", bounds: tier(1), route: "/fridge" },
      { label: "AI Chat", bounds: tier(2), message: "สวัสดี กินดี AI" },
    ],
  };
}

const layout = layoutPath ? JSON.parse(await readFile(layoutPath, "utf8")) : pintoLayout();

const areas = layout.areas.map(({ label, bounds, route, message }) => {
  if (route === undefined && message === undefined) throw new Error(`Area "${label}" needs a route or a message`);
  const action =
    route !== undefined ? { type: "uri", label, uri: liffUrl(route) } : { type: "message", label, text: message };
  return { bounds, action };
});

const richMenu = { size: layout.size, selected: true, name: MENU_NAME, chatBarText: "เมนู", areas };

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
