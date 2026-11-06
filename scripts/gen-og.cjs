// Generates a 1200x630 share image for every public page (Facebook, WhatsApp,
// LinkedIn previews) into public/og/. Run locally: node scripts/gen-og.cjs
// (needs Playwright). Images are committed, so the Vercel build doesn't need a browser.
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");
const { execSync } = require("node:child_process");

const out = execSync("npx vite-node scripts/og-pages.ts", { encoding: "utf8", env: { ...process.env, OG_PRINT: "1" } }).trim().split("\n").pop();
const pages = JSON.parse(out);
mkdirSync("public/og", { recursive: true });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;background:#100F06;color:#F5F4ED;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;position:relative;overflow:hidden}
.tag{display:inline-block;background:${p.color};color:#1B1A14;font-weight:800;font-size:26px;padding:10px 22px;border-radius:999px;width:max-content}
h1{font-size:${p.title.length > 40 ? 64 : 78}px;line-height:1.04;margin:26px 0 18px;font-weight:900;letter-spacing:-2px;max-width:920px}
p{font-size:30px;color:#d6d4c8;margin:0;max-width:900px;line-height:1.3}
.dot{position:absolute;border-radius:50%}.url{position:absolute;bottom:46px;left:90px;font-size:28px;font-weight:700;color:#4FD1AD}
.brand{position:absolute;bottom:40px;right:90px;font-size:30px;font-weight:900;display:flex;align-items:center;gap:12px}
</style></head><body>
<div class="dot" style="width:520px;height:520px;right:-170px;top:-190px;background:#00765f;opacity:.5"></div>
<div class="dot" style="width:240px;height:240px;right:140px;bottom:-110px;background:#FF8FB7;opacity:.45"></div>
<div style="position:relative"><div class="tag">${esc(p.kicker)}</div><h1>${esc(p.title)}</h1><p>${esc(p.sub)}</p></div>
<div class="url">kiwipath.space</div><div class="brand"><svg viewBox="0 0 512 512" width="46" height="46" aria-hidden="true"><rect width="512" height="512" rx="116" fill="#00765F"/><g transform="translate(-6 -14)"><path d="M136 392 C136 260 210 150 320 128 C404 112 432 214 366 252 C318 280 270 236 300 200 C318 180 350 190 348 214" fill="none" stroke="#F5F4ED" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><circle cx="136" cy="392" r="34" fill="#FFDA57"/></g></svg><span>KiwiPath</span></div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const p of pages) {
    await page.setContent(html(p));
    await page.screenshot({ path: `public/og/${p.slug}.png` });
  }
  await b.close();
  console.log(`${pages.length} share images written to public/og/`);
})();
