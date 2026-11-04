// Turns the `vite build --mode preview` output into a page for the Claude
// artifact viewer: the viewer supplies the <html>/<head>/<body> skeleton, so the
// page keeps only its title, viewport hint, styles and scripts.
import { readFileSync, writeFileSync } from "node:fs";

const dist = new URL("../dist-preview/", import.meta.url);
const html = readFileSync(new URL("index.html", dist), "utf8");

const scripts = [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const preloads = [...html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error("No module script found in dist-preview/index.html");

const page = `<title>KiwiPath</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Your step-by-step guide from Sri Lanka to New Zealand.">
${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
${preloads.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`).join("\n")}
<div id="root"></div>
${scripts.map((src) => `<script type="module" crossorigin src="${src}"></script>`).join("\n")}
`;

writeFileSync(new URL("page.html", dist), page);
console.log(`dist-preview/page.html written (${scripts.length} script, ${styles.length} stylesheet)`);
