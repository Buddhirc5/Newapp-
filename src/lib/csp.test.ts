import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The Content-Security-Policy in vercel.json only allows the inline theme script
// by its hash. If you edit that script, update the hash or the site's theme
// switch will stop working before the app loads.
describe("Content-Security-Policy", () => {
  const html = readFileSync("index.html", "utf8");
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy")?.value ?? "";

  it("allows every inline script by hash", () => {
    // JSON-LD blocks are data, not code: browsers never run them, so CSP doesn't apply.
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(inline.length).toBeGreaterThan(0);
    for (const body of inline) {
      const hash = createHash("sha256").update(body).digest("base64");
      expect(csp).toContain(`'sha256-${hash}'`);
    }
  });

  it("blocks framing, plugins and inline script injection", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });
});
