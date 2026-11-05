// Copies shared helpers from supabase/functions/_shared/ next to each function
// that imports them (e.g. `from "./ai.ts"`), so every function deploys as a
// self-contained folder. Helpers that import other helpers are followed too.
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = "supabase/functions";
const sharedDir = join(root, "_shared");
const shared = new Set(readdirSync(sharedDir).filter((f) => f.endsWith(".ts")));
const importsOf = (file) => [...readFileSync(file, "utf8").matchAll(/from "\.\/([\w-]+\.ts)"/g)].map((m) => m[1]).filter((f) => shared.has(f));

for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name.startsWith("_")) continue;
  const entry = join(root, dir.name, "index.ts");
  if (!existsSync(entry)) continue;
  const queue = importsOf(entry);
  const done = new Set();
  while (queue.length) {
    const f = queue.shift();
    if (done.has(f)) continue;
    done.add(f);
    copyFileSync(join(sharedDir, f), join(root, dir.name, f));
    queue.push(...importsOf(join(sharedDir, f)));
  }
  if (done.size) console.log(`${dir.name}: ${[...done].join(", ")}`);
}
