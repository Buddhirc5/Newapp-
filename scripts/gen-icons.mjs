// Renders the app icon SVG to the PNG sizes iOS and Android expect.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const svg = readFileSync(new URL("../public/icon-full.svg", import.meta.url), "utf8");
const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const targets = [
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
  { file: "pwa-192.png", size: 192, pad: 0 },
  { file: "pwa-512.png", size: 512, pad: 0 },
  // Maskable icons keep the artwork inside the central 80% safe zone.
  { file: "pwa-maskable-512.png", size: 512, pad: 0.12 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const inner = Math.round(t.size * (1 - t.pad * 2));
  await page.setContent(
    `<body style="margin:0;background:#00765F;display:grid;place-items:center;width:${t.size}px;height:${t.size}px"><img src="${uri}" width="${inner}" height="${inner}"></body>`,
  );
  await page.screenshot({ path: new URL(`../public/${t.file}`, import.meta.url).pathname, omitBackground: false });
  console.log("wrote", t.file);
}
await browser.close();
