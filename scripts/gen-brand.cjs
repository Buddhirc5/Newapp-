// Builds the KiwiPath brand pack (logo files for social media, print and
// partners) into public/brand/, plus a zip of everything.
// Run locally: node scripts/gen-brand.cjs (needs Playwright).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const OUT = path.resolve("public/brand");
fs.mkdirSync(OUT, { recursive: true });
const FONT = fs.readFileSync(path.resolve("node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2")).toString("base64");
const C = { teal: "#00765F", paper: "#F5F4ED", gold: "#FFDA57", night: "#100F06" };
const PATH = "M136 392 C136 260 210 150 320 128 C404 112 432 214 366 252 C318 280 270 236 300 200 C318 180 350 190 348 214";

const mark = (line, { tile = null, rx = 116 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${tile ? `<rect width="512" height="512" rx="${rx}" fill="${tile}"/>` : ""}<g transform="translate(-6 -14)"><path d="${PATH}" fill="none" stroke="${line}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><circle cx="136" cy="392" r="34" fill="${C.gold}"/></g></svg>`;

const svgs = {
  "kiwipath-icon.svg": mark(C.paper, { tile: C.teal }),
  "kiwipath-icon-square.svg": mark(C.paper, { tile: C.teal, rx: 0 }),
  "kiwipath-mark-teal.svg": mark(C.teal),
  "kiwipath-mark-white.svg": mark(C.paper),
};
for (const [f, s] of Object.entries(svgs)) fs.writeFileSync(path.join(OUT, f), s);

const font = `@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-stretch:62% 125%;font-weight:100 900}`;
const page = (w, h, bg, body) =>
  `<html><head><style>${font}html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}
  .word{font-family:Archivo;font-stretch:125%;font-weight:800;letter-spacing:-0.02em}</style></head><body>${body}</body></html>`;
const img = (svg, size) => svg.replace("<svg ", `<svg width="${size}" height="${size}" `);

const pngs = [
  // App icon and social profile pictures (the mark sits inside the circle crop).
  { f: "kiwipath-icon-1024.png", w: 1024, h: 1024, bg: "transparent", body: img(svgs["kiwipath-icon.svg"], 1024) },
  {
    f: "kiwipath-profile-picture.png",
    w: 1080,
    h: 1080,
    bg: C.teal,
    body: `<div style="display:grid;place-items:center;width:1080px;height:1080px">${img(mark(C.paper), 820)}</div>`,
  },
  { f: "kiwipath-mark-teal.png", w: 1024, h: 1024, bg: "transparent", body: img(svgs["kiwipath-mark-teal.svg"], 1024) },
  { f: "kiwipath-mark-white.png", w: 1024, h: 1024, bg: "transparent", body: img(svgs["kiwipath-mark-white.svg"], 1024) },
  // Logo with name.
  ...[
    ["kiwipath-logo-light.png", C.paper, C.night],
    ["kiwipath-logo-dark.png", C.night, C.paper],
    ["kiwipath-logo-transparent.png", "transparent", C.night],
    ["kiwipath-logo-transparent-white.png", "transparent", C.paper],
  ].map(([f, bg, ink]) => ({
    f,
    w: 1600,
    h: 520,
    bg,
    body: `<div style="display:flex;align-items:center;gap:56px;height:520px;padding:0 110px">${img(svgs["kiwipath-icon.svg"], 300)}<span class="word" style="font-size:190px;color:${ink}">KiwiPath</span></div>`,
  })),
  // Stacked logo for square spaces.
  {
    f: "kiwipath-logo-stacked.png",
    w: 1080,
    h: 1080,
    bg: C.paper,
    body: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px;height:1080px">${img(svgs["kiwipath-icon.svg"], 460)}<span class="word" style="font-size:150px;color:${C.night}">KiwiPath</span><span style="font:600 44px system-ui;color:#5f5e57;margin-top:-30px">Colombo → Aotearoa</span></div>`,
  },
  // Facebook page cover (1640 x 624; keep text in the middle safe area).
  {
    f: "facebook-cover.png",
    w: 1640,
    h: 624,
    bg: C.teal,
    body: `<div style="position:relative;width:1640px;height:624px;overflow:hidden">
      <div style="position:absolute;right:-120px;top:-160px;opacity:.12">${img(mark(C.paper), 760)}</div>
      <div style="position:absolute;left:330px;top:150px;display:flex;flex-direction:column;gap:22px">
        <span class="word" style="font-size:112px;color:${C.paper}">KiwiPath</span>
        <span style="font:600 46px system-ui;color:${C.paper}">Move from Sri Lanka to New Zealand, step by step</span>
        <span style="font:700 36px system-ui;color:${C.gold}">kiwipath.space · first month free</span>
      </div></div>`,
  },
  // WhatsApp / Instagram status (9:16).
  {
    f: "story-1080x1920.png",
    w: 1080,
    h: 1920,
    bg: C.night,
    body: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px;height:1920px;text-align:center;padding:0 90px">
      ${img(svgs["kiwipath-icon.svg"], 380)}
      <span class="word" style="font-size:140px;color:${C.paper}">KiwiPath</span>
      <span style="font:700 64px/1.25 system-ui;color:${C.paper}">Plan your move from Sri Lanka to New Zealand</span>
      <span style="font:600 46px/1.4 system-ui;color:#d6d4c8">Visa steps · costs in rupees · CV Studio · jobs · AI assistant</span>
      <span style="font:800 56px system-ui;color:${C.night};background:${C.gold};padding:24px 48px;border-radius:999px">kiwipath.space</span></div>`,
  },
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const t of pngs) {
    await p.setViewportSize({ width: t.w, height: t.h });
    await p.setContent(page(t.w, t.h, t.bg, t.body), { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, t.f), omitBackground: t.bg === "transparent" });
  }
  await b.close();
  fs.writeFileSync(
    path.join(OUT, "README.txt"),
    `KiwiPath brand pack

Colours
  Teal  #00765F   (main)
  Cream #F5F4ED
  Gold  #FFDA57   (start dot)
  Black #100F06

Files
  kiwipath-icon.svg / -1024.png    App icon (rounded teal square)
  kiwipath-icon-square.svg         Square version for places that round corners themselves
  kiwipath-profile-picture.png     Facebook / WhatsApp / Instagram profile picture (fits the circle crop)
  kiwipath-mark-teal.svg / .png    Symbol only, on light backgrounds
  kiwipath-mark-white.svg / .png   Symbol only, on dark or photo backgrounds
  kiwipath-logo-light.png          Logo with name, light background
  kiwipath-logo-dark.png           Logo with name, dark background
  kiwipath-logo-transparent*.png   Logo with name, no background (dark or white text)
  kiwipath-logo-stacked.png        Square logo with tagline
  facebook-cover.png               Facebook page cover (1640 x 624)
  story-1080x1920.png              WhatsApp / Instagram status

Keep clear space around the logo of at least half the icon's width, and don't stretch, recolour or rotate it.
`,
  );
  fs.rmSync(path.join(OUT, "kiwipath-brand-pack.zip"), { force: true });
  execSync(`cd "${OUT}" && zip -q -r kiwipath-brand-pack.zip . -x kiwipath-brand-pack.zip`);
  console.log(`brand pack written to ${OUT}`);
})();
