// Builds static, search-friendly pages after `vite build`, so Google and
// social apps see real content without running JavaScript:
//   /learn, /learn/<guide>, /visa/<path>, /cities, /cities/<city>
// plus sitemap.xml and robots.txt. Each page has its own title, description,
// canonical URL, Open Graph tags and JSON-LD structured data, and links into
// the app to sign up. Run by `npm run build` (vite-node scripts/prerender.ts).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GUIDES, type Guide } from "../src/data/guides";
import { PATHWAYS } from "../src/data/pathways";
import { NZ_CITY_LIST, weeklyCost, type City } from "../src/data/places";

const SITE = "https://www.kiwipath.space";
const OUT = "dist";
const RATE = 186.96; // LKR per NZD, the app's saved fallback rate
const TODAY = new Date().toISOString().slice(0, 10);
const OG_IMAGE = `${SITE}/og.png`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const nzd = (n: number) => `NZ$${Math.round(n).toLocaleString("en-NZ")}`;
const lkr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-LK")}`;
const urls: { loc: string; priority: number }[] = [
  { loc: `${SITE}/landing`, priority: 1 },
  { loc: `${SITE}/privacy`, priority: 0.3 },
  { loc: `${SITE}/terms`, priority: 0.3 },
];

const CSS = `
:root{--bg:#F5F4ED;--surface:#fff;--ink:#1B1A14;--muted:#5f5e57;--line:#e3e1d6;--teal:#00765f;--pink:#ff8fb7;--gold:#ffd23f;--night:#100F06}
@media (prefers-color-scheme:dark){:root{--bg:#100F06;--surface:#1d1c14;--ink:#f5f4ed;--muted:#b3b1a6;--line:#2f2e25;--teal:#4fd1ad}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--teal)}.wrap{max-width:760px;margin:0 auto;padding:0 16px}
header{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;height:60px;max-width:1040px}
.logo{display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:20px;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
nav a{color:var(--muted);text-decoration:none;font-weight:600;font-size:15px;margin-left:14px}
.cta{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border-radius:999px;background:var(--night);color:#f5f4ed!important;font-weight:700;text-decoration:none;margin:0!important}
@media (prefers-color-scheme:dark){.cta{background:var(--gold);color:#1b1a14!important}}
@media (max-width:620px){nav .hide{display:none}}
main{padding:28px 0 48px}h1{font-size:clamp(30px,7vw,44px);line-height:1.08;letter-spacing:-.02em;margin:.2em 0 .35em}
h2{font-size:22px;line-height:1.25;margin:1.8em 0 .5em}p.lead{font-size:19px;color:var(--muted)}
.crumbs{font-size:14px;color:var(--muted)}.crumbs a{color:var(--muted)}
.card{background:var(--surface);border-radius:22px;padding:18px 20px;margin:12px 0;box-shadow:0 1px 2px rgb(0 0 0/.05),0 8px 24px rgb(0 0 0/.05)}
.card a.t{font-weight:700;font-size:18px;text-decoration:none;color:var(--ink)}.card p{margin:.3em 0 0;color:var(--muted)}
.warn{border-left:4px solid var(--gold);padding:10px 14px;background:var(--surface);border-radius:12px}
ul{padding-left:1.2em}li{margin:.3em 0}table{width:100%;border-collapse:collapse;font-size:16px}td,th{padding:8px 4px;border-bottom:1px solid var(--line);text-align:left}td.n{text-align:right;font-variant-numeric:tabular-nums}
.grid{display:grid;gap:12px}@media(min-width:700px){.grid{grid-template-columns:1fr 1fr}}
.banner{margin:36px 0 0;padding:24px;border-radius:26px;background:var(--night);color:#f5f4ed}.banner h2{margin:0 0 .3em;color:#f5f4ed}.banner p{color:#d6d4c8}
.banner .cta{background:var(--gold);color:#1b1a14!important}
.share{margin:32px 0 0;padding:14px 18px;border-radius:16px;background:var(--surface);font-weight:600}.share a{margin:0 4px}
footer{border-top:1px solid var(--line);padding:24px 0 40px;font-size:14px;color:var(--muted)}footer a{color:var(--muted);margin-right:14px}
`;

interface PageOpts {
  path: string;
  title: string;
  description: string;
  body: string;
  jsonld: Record<string, unknown>[];
  crumbs: { name: string; path: string }[];
  type?: "article" | "website";
  priority?: number;
}

function page(o: PageOpts) {
  const url = `${SITE}${o.path}`;
  const ogSlug = o.path.slice(1).replace(/\//g, "-");
  const image = existsSync(`public/og/${ogSlug}.png`) ? `${SITE}/og/${ogSlug}.png` : OG_IMAGE;
  const shareUrl = encodeURIComponent(`${url}?utm_source=share`);
  const shareText = encodeURIComponent(o.title.split(" · ")[0].split(" | ")[0]);
  urls.push({ loc: url, priority: o.priority ?? 0.7 });
  const crumbs = [{ name: "KiwiPath", path: "/landing" }, ...o.crumbs];
  const ld = [
    ...o.jsonld,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${SITE}${c.path}` })),
    },
  ];
  const html = `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="${o.type ?? "article"}">
<meta property="og:site_name" content="KiwiPath">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(o.title.split(" · ")[0])}">
<meta property="og:locale" content="en_NZ">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${image}">
<meta name="theme-color" content="#F5F4ED">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>${CSS.replace(/\n/g, "")}</style>
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>
<header><div class="wrap"><a class="logo" href="/landing"><svg viewBox="0 0 512 512" width="34" height="34" aria-hidden="true"><rect width="512" height="512" rx="116" fill="#00765F"/><g transform="translate(-6 -14)"><path d="M136 392 C136 260 210 150 320 128 C404 112 432 214 366 252 C318 280 270 236 300 200 C318 180 350 190 348 214" fill="none" stroke="#F5F4ED" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><circle cx="136" cy="392" r="34" fill="#FFDA57"/></g></svg>KiwiPath</a><nav><a class="hide" href="/learn">Guides</a><a class="hide" href="/visa">Visa paths</a><a class="hide" href="/cities">Cities</a><a class="cta" href="/landing">Start free</a></nav></div></header>
<main class="wrap">
<p class="crumbs">${crumbs.map((c, i) => (i === crumbs.length - 1 ? esc(c.name) : `<a href="${c.path}">${esc(c.name)}</a>`)).join(" › ")}</p>
${o.body}
<p class="share">Share this with someone planning the move: <a href="https://wa.me/?text=${shareText}%20${shareUrl}" rel="noopener">WhatsApp</a> · <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" rel="noopener">Facebook</a></p>
<section class="banner"><h2>Plan your move with KiwiPath</h2><p>Free for your first month: a step-by-step journey, budgets in rupees, CV Studio, Scam Shield, document tracker and an AI assistant for Sri Lankans moving to New Zealand.</p><a class="cta" href="/landing">Create your free account</a></section>
</main>
<footer><div class="wrap"><a href="/learn">Guides</a><a href="/visa">Visa paths</a><a href="/cities">Cost of living</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><p>KiwiPath shares general information, not immigration advice. Always confirm rules on immigration.govt.nz or with a licensed immigration adviser.</p></div></footer>
</body>
</html>
`;
  const file = join(OUT, `${o.path === "/" ? "index" : o.path.replace(/^\//, "")}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ── Guides ────────────────────────────────────────────────────────────────
const STAGE = { prepare: "Prepare", apply: "Apply", arrive: "Arrive", thrive: "Thrive" };

function guideBody(g: Guide) {
  return `<article>
<h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.summary)}</p>
<p class="crumbs">${STAGE[g.stage]} · ${g.minutes} min read · Checked November 2026</p>
${g.sections
  .map(
    (s) => `<h2>${esc(s.heading)}</h2>
${s.body ? `<p>${esc(s.body)}</p>` : ""}
${s.bullets ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
${s.warn ? `<p class="warn"><strong>Watch out:</strong> ${esc(s.warn)}</p>` : ""}`,
  )
  .join("\n")}
</article>`;
}

for (const g of GUIDES) {
  page({
    path: `/learn/${g.slug}`,
    title: `${g.title} | Sri Lanka to New Zealand guide · KiwiPath`,
    description: `${g.summary} A plain-language guide for Sri Lankans moving to New Zealand.`.slice(0, 160),
    body: guideBody(g),
    crumbs: [
      { name: "Guides", path: "/learn" },
      { name: g.title, path: `/learn/${g.slug}` },
    ],
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: g.title,
        description: g.summary,
        inLanguage: "en-NZ",
        dateModified: TODAY,
        author: { "@type": "Organization", name: "KiwiPath", url: SITE },
        publisher: { "@type": "Organization", name: "KiwiPath", logo: { "@type": "ImageObject", url: `${SITE}/pwa-512.png` } },
        image: `${SITE}/og/learn-${g.slug}.png`,
        mainEntityOfPage: `${SITE}/learn/${g.slug}`,
      },
    ],
  });
}

page({
  path: "/learn",
  title: "Guides for moving from Sri Lanka to New Zealand · KiwiPath",
  description: "Free plain-language guides: proof of funds, SOPs, relationship evidence, work experience letters, sending money, your first 30 days in NZ and more.",
  type: "website",
  priority: 0.9,
  crumbs: [{ name: "Guides", path: "/learn" }],
  body: `<h1>Guides for your move to New Zealand</h1><p class="lead">Written for Sri Lankans studying, working or joining family in New Zealand. Checked against official sources in November 2026.</p>
${GUIDES.map((g) => `<div class="card"><a class="t" href="/learn/${g.slug}">${esc(g.title)}</a><p>${esc(g.summary)}</p></div>`).join("\n")}`,
  jsonld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "KiwiPath guides", url: `${SITE}/learn` }],
});

// ── Visa paths ────────────────────────────────────────────────────────────
for (const p of PATHWAYS) {
  const faq = [
    { q: `Who is the ${p.name.toLowerCase()} path for?`, a: p.whoFor.join(". ") + "." },
    { q: "How long does it take?", a: p.timeline },
    { q: "Can it lead to residence?", a: p.residence },
  ];
  page({
    path: `/visa/${p.id}`,
    title: `${p.name} in New Zealand from Sri Lanka: steps, requirements and timeline · KiwiPath`,
    description: p.summary.slice(0, 160),
    priority: 0.9,
    crumbs: [
      { name: "Visa paths", path: "/visa" },
      { name: p.name, path: `/visa/${p.id}` },
    ],
    body: `<article><h1>${esc(p.name)}</h1><p class="lead">${esc(p.summary)}</p>
<h2>Who it suits</h2><ul>${p.whoFor.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
<h2>Step by step</h2><ol>${p.steps.map((s) => `<li><strong>${esc(s.title)}.</strong> ${esc(s.detail)}</li>`).join("")}</ol>
<h2>What you'll usually need</h2><ul>${p.requirements.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
<h2>Timeline</h2><p>${esc(p.timeline)}</p>
<h2>Path to residence</h2><p>${esc(p.residence)}</p>
<h2>Watch out for</h2><ul>${p.watchOuts.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
<h2>Official sources</h2><ul>${p.sources.map((s) => `<li><a href="${esc(s.href)}" rel="noopener">${esc(s.label)}</a></li>`).join("")}</ul>
<p class="crumbs">Summary checked ${esc(p.checked)}. General information, not immigration advice.</p></article>`,
    jsonld: [
      { "@context": "https://schema.org", "@type": "Article", headline: p.name, description: p.summary, inLanguage: "en-NZ", dateModified: TODAY, author: { "@type": "Organization", name: "KiwiPath" }, image: OG_IMAGE },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  });
}

page({
  path: "/visa",
  title: "Ways to move from Sri Lanka to New Zealand: visa paths compared · KiwiPath",
  description: "Compare the main ways Sri Lankans move to New Zealand: study a Masters, skilled work, registered professions, partner and family, and business.",
  type: "website",
  priority: 0.9,
  crumbs: [{ name: "Visa paths", path: "/visa" }],
  body: `<h1>Ways to move to New Zealand</h1><p class="lead">Five common paths for Sri Lankans, in plain language. Take the free Pathway Finder in KiwiPath to see which suits you.</p>
${PATHWAYS.map((p) => `<div class="card"><a class="t" href="/visa/${p.id}">${esc(p.name)}</a><p>${esc(p.summary)}</p></div>`).join("\n")}`,
  jsonld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "New Zealand visa paths", url: `${SITE}/visa` }],
});

// ── Cities and cost of living ─────────────────────────────────────────────
const month = (c: City, h: keyof City["rent"] = "room") => weeklyCost(c, h) * (52 / 12);

for (const c of NZ_CITY_LIST) {
  const rows: [string, number][] = [
    ["Rent (room in a flat)", c.rent.room],
    ["Groceries", c.weekly.groceries],
    ["Transport", c.weekly.transport],
    ["Power", c.weekly.power],
    ["Phone and internet", c.weekly.phone],
  ];
  const faq = [
    { q: `How much does it cost to live in ${c.name}?`, a: `Roughly ${nzd(month(c))} a month (about ${lkr(month(c) * RATE)}) for one adult renting a room, or ${nzd(month(c, "one-bed"))} with a one-bedroom place. These are estimates; check current rents before moving.` },
    { q: `What jobs are there in ${c.name}?`, a: `Main hiring areas: ${c.jobs.join(", ")}.` },
    { q: `Is there a Sri Lankan community in ${c.name}?`, a: c.community === "large" ? "Yes, a large and well-established one." : c.community === "growing" ? "Yes, and it's growing." : "A small one. KiwiPath groups help you meet others nearby." },
  ];
  page({
    path: `/cities/${c.id}`,
    title: `Cost of living in ${c.name}, New Zealand in rupees and NZD (2026) · KiwiPath`,
    description: `Living in ${c.name}: about ${nzd(month(c))} (${lkr(month(c) * RATE)}) a month for one adult. Rent, groceries, transport, jobs and study options.`.slice(0, 160),
    priority: 0.8,
    crumbs: [
      { name: "Cost of living", path: "/cities" },
      { name: c.name, path: `/cities/${c.id}` },
    ],
    body: `<article><h1>Cost of living in ${esc(c.name)}</h1><p class="lead">${esc(c.maori)} · ${esc(c.region)}. ${esc(c.known)}</p>
<div class="card"><p style="margin:0;color:var(--ink);font-size:28px;font-weight:800">${nzd(month(c))} a month</p><p>About ${lkr(month(c) * RATE)} for one adult renting a room · ${nzd(month(c, "one-bed"))} with a 1-bedroom · ${nzd(month(c, "two-bed"))} with a 2-bedroom</p></div>
<h2>Weekly costs for one adult</h2><table><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td class="n">${nzd(v)}</td><td class="n">${lkr(v * RATE)}</td></tr>`).join("")}<tr><th>Total</th><th class="n">${nzd(weeklyCost(c))}</th><th class="n">${lkr(weeklyCost(c) * RATE)}</th></tr></tbody></table>
<h2>Rent</h2><ul><li>Room in a flat: ${nzd(c.rent.room)} a week</li><li>1 bedroom: ${nzd(c.rent["one-bed"])} a week</li><li>2 bedrooms: ${nzd(c.rent["two-bed"])} a week</li></ul>
<h2>Jobs</h2><p>${esc(c.jobs.join(", "))}.</p>
${c.study.length ? `<h2>Study</h2><p>${esc(c.study.join(", "))}.</p>` : ""}
<h2>Climate</h2><p>${esc(c.climate)}.</p>
<p class="crumbs">Estimates based on MBIE market rent medians and Stats NZ spending, rounded, at NZ$1 = Rs ${RATE}. Check tenancy.govt.nz for current rents.</p>
<h2>Compare with other cities</h2><div class="grid">${NZ_CITY_LIST.filter((x) => x.id !== c.id)
      .slice(0, 6)
      .map((x) => `<div class="card"><a class="t" href="/cities/${x.id}">${esc(x.name)}</a><p>${nzd(month(x))} a month</p></div>`)
      .join("")}</div></article>`,
    jsonld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }],
  });
}

const sorted = [...NZ_CITY_LIST].sort((a, b) => month(a) - month(b));
page({
  path: "/cities",
  title: "Cost of living in New Zealand cities in rupees (2026) · KiwiPath",
  description: "Compare monthly living costs in 14 New Zealand cities in NZD and Sri Lankan rupees: Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin and more.",
  type: "website",
  priority: 0.9,
  crumbs: [{ name: "Cost of living", path: "/cities" }],
  body: `<h1>Cost of living in New Zealand cities</h1><p class="lead">Monthly costs for one adult renting a room, cheapest first. In NZ dollars and Sri Lankan rupees.</p>
<table><thead><tr><th>City</th><th class="n">NZD / month</th><th class="n">Rupees / month</th></tr></thead><tbody>${sorted
    .map((c) => `<tr><td><a href="/cities/${c.id}">${esc(c.name)}</a></td><td class="n">${nzd(month(c))}</td><td class="n">${lkr(month(c) * RATE)}</td></tr>`)
    .join("")}</tbody></table>`,
  jsonld: [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "New Zealand cities by cost of living",
      itemListElement: sorted.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/cities/${c.id}`, name: c.name })),
    },
  ],
});

// ── Sitemap and robots ───────────────────────────────────────────────────
writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`,
);
writeFileSync(
  join(OUT, "robots.txt"),
  `User-agent: *
Allow: /
Disallow: /admin
Disallow: /me
Disallow: /chats
Disallow: /start

Sitemap: ${SITE}/sitemap.xml
`,
);
console.log(`prerendered ${urls.length - 3} pages + sitemap.xml + robots.txt`);
