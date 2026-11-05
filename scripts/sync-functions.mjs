// Copies supabase/functions/_shared/ai.ts next to each function that imports "./ai.ts",
// so every function deploys as a self-contained folder.
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = "supabase/functions";
const shared = join(root, "_shared", "ai.ts");
for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name.startsWith("_")) continue;
  const entry = join(root, dir.name, "index.ts");
  if (existsSync(entry) && readFileSync(entry, "utf8").includes('from "./ai.ts"')) {
    copyFileSync(shared, join(root, dir.name, "ai.ts"));
    console.log(`synced ${dir.name}/ai.ts`);
  }
}
