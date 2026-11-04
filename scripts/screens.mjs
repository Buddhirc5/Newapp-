// Captures screenshots of the main screens for visual review.
// Usage: node scripts/screens.mjs [outDir] [--dark] [--scale=1] [--width=393] [--only=journey,tools]
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--")) ?? "screens";
const dark = args.includes("--dark");
const scale = Number(args.find((a) => a.startsWith("--scale="))?.split("=")[1] ?? 1);
const width = Number(args.find((a) => a.startsWith("--width="))?.split("=")[1] ?? 393);
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1]?.split(",");
const full = !args.includes("--viewport");
mkdirSync(out, { recursive: true });

const PORT = 4179;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { stdio: "pipe" });
await new Promise((resolve) => {
  server.stdout.on("data", (d) => String(d).includes("Local") && resolve());
  setTimeout(resolve, 6000);
});

const base = `http://localhost:${PORT}`;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width, height: width > 700 ? 900 : 852 },
  deviceScaleFactor: scale,
  colorScheme: dark ? "dark" : "light",
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

const shots = [
  { name: "welcome", path: "/welcome" },
  {
    name: "finder",
    path: "/welcome",
    run: async () => {
      await page.getByRole("button", { name: /Find my path/ }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "result",
    path: "/welcome",
    run: async () => {
      await page.getByRole("button", { name: /Find my path/ }).click();
      for (const label of [/Study a Masters/, /Bachelor's degree/]) {
        await page.getByRole("radio", { name: label }).click();
        await page.waitForTimeout(450);
      }
      await page.getByLabel("Search occupations").fill("account");
      await page.getByRole("button", { name: /^Accountant/ }).click();
      await page.waitForTimeout(450);
      for (const label of [/4–5 years/, /My test is booked/]) {
        await page.getByRole("radio", { name: label }).click();
        await page.waitForTimeout(450);
      }
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForTimeout(300);
      for (const label of [/Just me/, /In 6–12 months/, /Auckland/]) {
        await page.getByRole("radio", { name: label }).click();
        await page.waitForTimeout(450);
      }
      await page.getByLabel(/First name/).fill("Nimali");
      await page.getByRole("button", { name: /See my paths/ }).click();
      await page.waitForTimeout(500);
    },
  },
  { name: "journey", path: "/" },
  { name: "paths", path: "/paths" },
  { name: "path-detail", path: "/paths/worker" },
  { name: "tools", path: "/tools" },
  {
    name: "scam-shield",
    path: "/tools/scam-shield",
    run: async () => {
      await page.getByRole("button", { name: "Try an example" }).click();
      await page.waitForTimeout(500);
    },
  },
  { name: "money", path: "/tools/money" },
  { name: "english", path: "/tools/english" },
  {
    name: "english-prep",
    path: "/tools/english",
    run: async () => {
      await page.getByRole("button", { name: /Describe a place in Sri Lanka/ }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "cv",
    path: "/tools/cv",
    run: async () => {
      await page.getByRole("button", { name: "Try a sample CV" }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "quiz",
    path: "/tools/quiz",
    run: async () => {
      await page.getByRole("button", { name: /Play 8 questions/ }).click();
      await page.waitForTimeout(300);
      await page.getByRole("radio").first().click();
      await page.waitForTimeout(400);
    },
  },
  { name: "courses", path: "/tools/courses" },
  { name: "documents", path: "/tools/documents" },
  { name: "occupations", path: "/tools/occupations" },
  { name: "community", path: "/community" },
  { name: "me", path: "/me" },
  {
    name: "level-sheet",
    path: "/",
    full: false,
    run: async () => {
      await page.getByRole("button", { name: /Level 2:/ }).click();
      await page.waitForTimeout(600);
    },
  },
];

// Start from the sample journey so screens show realistic content.
await page.goto(`${base}/welcome`);
await page.getByRole("button", { name: "Explore a sample journey" }).click();
await page.waitForTimeout(500);

for (const shot of shots) {
  if (only && !only.includes(shot.name)) continue;
  if (shot.name === "welcome" || shot.name === "finder" || shot.name === "result") {
    // The Finder replaces the sample with a real journey, so reload the sample after it.
  }
  await page.goto(`${base}${shot.path}`);
  await page.waitForTimeout(500);
  try {
    await shot.run?.();
  } catch (e) {
    errors.push(`${shot.name}: ${e.message.split("\n")[0]}`);
  }
  await page.screenshot({ path: `${out}/${shot.name}${dark ? "-dark" : ""}.png`, fullPage: shot.full ?? full });
  if (shot.name === "result") {
    await page.goto(`${base}/welcome`);
    await page.getByRole("button", { name: "Explore a sample journey" }).click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) errors.push(`${shot.name}: horizontal overflow ${overflow}px`);
}

console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
server.kill();
process.exit(0);
