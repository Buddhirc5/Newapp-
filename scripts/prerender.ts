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
import { CITY_BY_ID, NZ_CITY_LIST, UNIVERSITIES, weeklyCost, type City } from "../src/data/places";
import { ARTICLES } from "../src/data/articles";
import { OCCUPATIONS } from "../src/data/occupations";

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
@media (max-width:720px){nav .hide{display:none}}.related{margin:28px 0 0}.related a{display:block;padding:10px 0;border-bottom:1px solid var(--line);font-weight:600}.meta{color:var(--muted);font-size:15px}.tip{border-left:4px solid var(--teal);padding:10px 14px;background:var(--surface);border-radius:12px}details{background:var(--surface);border-radius:14px;padding:12px 16px;margin:8px 0}summary{font-weight:700;cursor:pointer}
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
<link rel="alternate" hreflang="en-LK" href="${url}">
<link rel="alternate" hreflang="en-NZ" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="alternate" type="application/rss+xml" title="KiwiPath blog" href="${SITE}/blog/rss.xml">
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
<header><div class="wrap"><a class="logo" href="/landing"><svg viewBox="0 0 512 512" width="34" height="34" aria-hidden="true"><rect width="512" height="512" rx="116" fill="#00765F"/><g transform="translate(-6 -14)"><path d="M136 392 C136 260 210 150 320 128 C404 112 432 214 366 252 C318 280 270 236 300 200 C318 180 350 190 348 214" fill="none" stroke="#F5F4ED" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><circle cx="136" cy="392" r="34" fill="#FFDA57"/></g></svg>KiwiPath</a><nav><a class="hide" href="/blog">Blog</a><a class="hide" href="/learn">Guides</a><a class="hide" href="/visa">Visas</a><a class="hide" href="/cities">Cities</a><a class="cta" href="/landing">Start free</a></nav></div></header>
<main class="wrap">
<p class="crumbs">${crumbs.map((c, i) => (i === crumbs.length - 1 ? esc(c.name) : `<a href="${c.path}">${esc(c.name)}</a>`)).join(" › ")}</p>
${o.body}
<p class="share">Share this with someone planning the move: <a href="https://wa.me/?text=${shareText}%20${shareUrl}" rel="noopener">WhatsApp</a> · <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" rel="noopener">Facebook</a></p>
<section class="banner"><h2>Plan your move with KiwiPath</h2><p>Free for your first month: a step-by-step journey, budgets in rupees, CV Studio, Scam Shield, document tracker and an AI assistant for Sri Lankans moving to New Zealand.</p><a class="cta" href="/landing">Create your free account</a></section>
</main>
<footer><div class="wrap"><a href="/blog">Blog</a><a href="/news">NZ visa news</a><a href="/learn">Guides</a><a href="/visa">Visa paths</a><a href="/cities">Cost of living</a><a href="/careers">Careers</a><a href="/study">Universities</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><p>KiwiPath shares general information, not immigration advice. Always confirm rules on immigration.govt.nz or with a licensed immigration adviser.</p></div></footer>
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

// ── Blog ──────────────────────────────────────────────────────────────────
const faqLd = (faq: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
const faqHtml = (faq: { q: string; a: string }[]) =>
  faq.length ? `<h2>Questions people ask</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}` : "";
const relatedHtml = (links: { href: string; label: string }[]) =>
  links.length ? `<nav class="related" aria-label="Related"><h2>Keep reading</h2>${links.map((l) => `<a href="${l.href}">${esc(l.label)} →</a>`).join("")}</nav>` : "";
const ORG = { "@type": "Organization", name: "KiwiPath", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/brand/kiwipath-icon-1024.png` } };

for (const a of ARTICLES) {
  const others = ARTICLES.filter((x) => x.slug !== a.slug && x.category === a.category).slice(0, 2).map((x) => ({ href: `/blog/${x.slug}`, label: x.title }));
  page({
    path: `/blog/${a.slug}`,
    title: `${a.title} · KiwiPath`,
    description: a.description.slice(0, 160),
    priority: 0.9,
    crumbs: [
      { name: "Blog", path: "/blog" },
      { name: a.title, path: `/blog/${a.slug}` },
    ],
    body: `<article><h1>${esc(a.title)}</h1><p class="meta">${a.category} · ${a.minutes} min read · Updated ${new Date(a.updated).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}</p>
<p class="lead">${esc(a.intro)}</p>
${a.sections
  .map(
    (s) => `<h2>${esc(s.heading)}</h2>${(s.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join("")}${s.bullets ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}${s.tip ? `<p class="tip"><strong>Tip:</strong> ${esc(s.tip)}</p>` : ""}`,
  )
  .join("\n")}
${faqHtml(a.faq)}
<p class="meta">General information, not immigration advice. Confirm current rules on immigration.govt.nz or with a licensed immigration adviser.</p>
${relatedHtml([...a.related, ...others])}</article>`,
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: a.title,
        description: a.description,
        keywords: a.keywords.join(", "),
        inLanguage: "en",
        datePublished: a.published,
        dateModified: a.updated,
        articleSection: a.category,
        author: ORG,
        publisher: ORG,
        image: OG_IMAGE,
        mainEntityOfPage: `${SITE}/blog/${a.slug}`,
      },
      faqLd(a.faq),
    ],
  });
}

page({
  path: "/blog",
  title: "KiwiPath blog: moving from Sri Lanka to New Zealand · KiwiPath",
  description: "Practical articles for Sri Lankans moving to New Zealand: student and work visas, IELTS, jobs, cost of living in rupees, scams to avoid and settling in.",
  type: "website",
  priority: 0.9,
  crumbs: [{ name: "Blog", path: "/blog" }],
  body: `<h1>KiwiPath blog</h1><p class="lead">Practical, checked articles for Sri Lankans studying, working and settling in New Zealand.</p>
${ARTICLES.map((a) => `<div class="card"><a class="t" href="/blog/${a.slug}">${esc(a.title)}</a><p>${esc(a.description)}</p><p class="meta">${a.category} · ${a.minutes} min</p></div>`).join("\n")}`,
  jsonld: [{ "@context": "https://schema.org", "@type": "Blog", name: "KiwiPath blog", url: `${SITE}/blog`, publisher: ORG, blogPost: ARTICLES.map((a) => ({ "@type": "BlogPosting", headline: a.title, url: `${SITE}/blog/${a.slug}`, datePublished: a.published })) }],
});

const rssItems = ARTICLES.map(
  (a) => `<item><title>${esc(a.title)}</title><link>${SITE}/blog/${a.slug}</link><guid>${SITE}/blog/${a.slug}</guid><pubDate>${new Date(a.published).toUTCString()}</pubDate><description>${esc(a.description)}</description><category>${a.category}</category></item>`,
).join("\n");
mkdirSync(join(OUT, "blog"), { recursive: true });
writeFileSync(
  join(OUT, "blog", "rss.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>KiwiPath blog</title><link>${SITE}/blog</link><description>Moving from Sri Lanka to New Zealand, step by step.</description><language>en</language>
${rssItems}
</channel></rss>
`,
);

// ── Careers (one page per occupation) ─────────────────────────────────────

const GROUP_PATH: Record<string, string> = { Health: "registered", Education: "registered", "Engineering & trades": "worker", Technology: "worker", Business: "worker", "Law & social": "registered", "Hospitality & primary": "worker" };
const citiesFor = (group: string) => {
  const words: Record<string, RegExp> = {
    Health: /health/i,
    Education: /education|research/i,
    "Engineering & trades": /engineer|construction|manufactur|energy/i,
    Technology: /it|tech/i,
    Business: /finance|professional|government|logistics/i,
    "Law & social": /government|professional/i,
    "Hospitality & primary": /hospitality|tourism|agri|horticulture|dairy|forestry|seafood|food/i,
  };
  return NZ_CITY_LIST.filter((c) => c.jobs.some((j) => words[group]?.test(j))).slice(0, 5);
};

for (const o of OCCUPATIONS) {
  const slug = o.id;
  const regulated = Boolean(o.regulator);
  const cities = citiesFor(o.group);
  const path = GROUP_PATH[o.group] ?? "worker";
  const faq = [
    {
      q: `Can a Sri Lankan ${o.title.toLowerCase()} work in New Zealand?`,
      a: regulated
        ? `Yes, after registering with the ${o.regulator!.name} and getting a visa, usually an Accredited Employer Work Visa with an accredited employer.`
        : `Yes. This job isn't regulated by an NZ registration body, so you usually need a job offer from an accredited employer and an Accredited Employer Work Visa.`,
    },
    { q: `Do I need NZ registration to work as a ${o.title.toLowerCase()}?`, a: regulated ? `Yes. ${o.note}` : `Usually not. ${o.note}` },
    { q: "Is this job on the Green List?", a: "The Green List changes over time. Check the current list on immigration.govt.nz." },
  ];
  page({
    path: `/careers/${slug}`,
    title: `${o.title} jobs in New Zealand for Sri Lankans: registration and visa · KiwiPath`,
    description: `How to work as a ${o.title.toLowerCase()} in New Zealand from Sri Lanka: ${regulated ? `registration with the ${o.regulator!.name}, ` : ""}visas, job search and the path to residence.`.slice(0, 160),
    priority: 0.7,
    crumbs: [
      { name: "Careers", path: "/careers" },
      { name: o.title, path: `/careers/${slug}` },
    ],
    body: `<article><h1>Working in New Zealand as a ${esc(o.title.toLowerCase())}</h1><p class="lead">${esc(o.group)} · ${regulated ? "Regulated in New Zealand" : "Not regulated by an NZ registration body"}</p>
<div class="card"><p style="margin:0;color:var(--ink)"><strong>${regulated ? `Registration required: ${esc(o.regulator!.name)}` : "No NZ registration needed"}</strong></p><p>${esc(o.note)}</p>${o.regulator?.href ? `<p><a href="${esc(o.regulator.href)}" rel="noopener">Visit ${esc(o.regulator.name)}</a></p>` : ""}</div>
<h2>Your steps</h2><ol>
${regulated ? `<li><strong>Apply for registration</strong> with the ${esc(o.regulator!.name)}. They assess your qualification, experience and English, often to a higher standard than the visa.</li>` : `<li><strong>Get your qualification recognised</strong> if a visa or employer asks. NZQA can assess overseas qualifications.</li>`}
<li><strong>Write an NZ-style CV</strong>: achievement-focused, two to three pages, no photo, age, NIC or religion.</li>
<li><strong>Find an accredited employer</strong> and check they're on Immigration NZ's accredited employer list.</li>
<li><strong>Apply for your visa</strong>, usually an Accredited Employer Work Visa once your employer's Job Check is approved.</li>
<li><strong>Build towards residence</strong> through the Green List or the Skilled Migrant Category.</li>
</ol>
${cities.length ? `<h2>Cities with ${esc(o.group.toLowerCase())} jobs</h2><div class="grid">${cities.map((c) => `<div class="card"><a class="t" href="/cities/${c.id}">${esc(c.name)}</a><p>${esc(c.jobs.join(", "))}</p></div>`).join("")}</div>` : ""}
${faqHtml(faq)}
${relatedHtml([
  { href: `/visa/${path}`, label: path === "registered" ? "The registered professions path" : "The skilled worker path" },
  { href: "/blog/how-to-find-a-job-in-new-zealand-from-sri-lanka", label: "How to find a job in NZ from Sri Lanka" },
  { href: "/blog/new-zealand-job-scams-sri-lanka", label: "Spot NZ job scams" },
])}</article>`,
    jsonld: [faqLd(faq)],
  });
}

const groups = [...new Set(OCCUPATIONS.map((o) => o.group))];
page({
  path: "/careers",
  title: "Careers in New Zealand for Sri Lankans: 46 occupations · KiwiPath",
  description: "Find out if your job is regulated in New Zealand, which body registers it, and the steps for Sri Lankan nurses, engineers, teachers, IT workers, chefs and more.",
  type: "website",
  priority: 0.9,
  crumbs: [{ name: "Careers", path: "/careers" }],
  body: `<h1>Careers in New Zealand</h1><p class="lead">Registration, visas and steps for 46 occupations Sri Lankans often work in.</p>
${groups.map((g) => `<h2>${esc(g)}</h2><div class="grid">${OCCUPATIONS.filter((o) => o.group === g).map((o) => `<div class="card"><a class="t" href="/careers/${o.id}">${esc(o.title)}</a><p>${o.regulator ? "Registration needed" : "No registration needed"}</p></div>`).join("")}</div>`).join("\n")}`,
  jsonld: [{ "@context": "https://schema.org", "@type": "ItemList", name: "Careers in New Zealand", itemListElement: OCCUPATIONS.map((o, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/careers/${o.id}`, name: o.title })) }],
});

// ── Universities ──────────────────────────────────────────────────────────
const UNI_CITY: Record<string, string> = { uoa: "auckland", aut: "auckland", waikato: "hamilton", massey: "palmerston-north", vuw: "wellington", canterbury: "christchurch", lincoln: "christchurch", otago: "dunedin" };
for (const u of UNIVERSITIES) {
  const city = CITY_BY_ID[UNI_CITY[u.id] as keyof typeof CITY_BY_ID];
  const monthly = city ? Math.round((weeklyCost(city) * 52) / 12) : 0;
  const faq = [
    { q: `How much money do I need to study at ${u.name}?`, a: `Your tuition (set by the university) plus Immigration NZ's living cost requirement of NZD 20,000 for each year of study, and funds for an onward ticket.${monthly ? ` Living in ${city!.name} costs about NZD ${monthly.toLocaleString("en-NZ")} a month for one person renting a room.` : ""}` },
    { q: `What English score does ${u.name} need?`, a: "Each programme sets its own. Many Masters programmes ask for an academic IELTS around 6.5 overall, or an equivalent PTE or TOEFL score. Check your programme's page." },
    { q: "Can I work after graduating?", a: "After an eligible NZ qualification you can get a post-study work visa for up to 3 years, once only. Degrees at level 7 or higher need at least 30 weeks of full-time study in NZ." },
  ];
  page({
    path: `/study/${u.id}`,
    title: `${u.name} for Sri Lankan students: costs, English and visa · KiwiPath`,
    description: `Studying at ${u.name} from Sri Lanka: living costs in ${u.city}, English requirements, the student visa and post-study work rights.`.slice(0, 160),
    priority: 0.8,
    crumbs: [
      { name: "Universities", path: "/study" },
      { name: u.name, path: `/study/${u.id}` },
    ],
    body: `<article><h1>Studying at ${esc(u.name)}</h1><p class="lead">${esc(u.city)} · one of New Zealand's eight universities</p>
<p><a href="${esc(u.href)}" rel="noopener">Programmes, fees and intakes on the university's website →</a></p>
${city ? `<div class="card"><p style="margin:0;color:var(--ink);font-size:24px;font-weight:800">About NZD ${monthly.toLocaleString("en-NZ")} a month</p><p>Living in ${esc(city.name)} for one student renting a room. <a href="/cities/${city.id}">Full cost breakdown</a></p></div>` : ""}
<h2>Your steps</h2><ol>
<li>Shortlist programmes that build on your degree and lead to jobs in demand.</li>
<li>Meet the programme's English requirement (IELTS, PTE or TOEFL).</li>
<li>Apply and get your offer of place.</li>
<li>Prepare funds evidence: tuition plus NZD 20,000 for each year of living costs.</li>
<li>Apply for your student visa online with Immigration New Zealand.</li>
</ol>
${faqHtml(faq)}
${relatedHtml([
  { href: "/blog/new-zealand-student-visa-from-sri-lanka", label: "NZ student visa from Sri Lanka" },
  { href: "/learn/statement-of-purpose", label: "Write a strong Statement of Purpose" },
  { href: "/learn/proof-of-funds", label: "Show your funds the right way" },
])}</article>`,
    jsonld: [
      { "@context": "https://schema.org", "@type": "CollegeOrUniversity", name: u.name, url: u.href, address: { "@type": "PostalAddress", addressLocality: u.city, addressCountry: "NZ" } },
      faqLd(faq),
    ],
  });
}
page({
  path: "/study",
  title: "New Zealand universities for Sri Lankan students · KiwiPath",
  description: "All eight New Zealand universities compared for Sri Lankan students: cities, living costs in NZD and rupees, English requirements and the student visa.",
  type: "website",
  priority: 0.9,
  crumbs: [{ name: "Universities", path: "/study" }],
  body: `<h1>New Zealand universities</h1><p class="lead">All eight universities, with what it costs to live in each city.</p><div class="grid">${UNIVERSITIES.map((u) => `<div class="card"><a class="t" href="/study/${u.id}">${esc(u.name)}</a><p>${esc(u.city)}</p></div>`).join("")}</div>`,
  jsonld: [{ "@context": "https://schema.org", "@type": "ItemList", name: "New Zealand universities", itemListElement: UNIVERSITIES.map((u, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/study/${u.id}`, name: u.name })) }],
});

// ── NZ immigration news (latest headlines at build time) ───────────────────
{
  const env = (k: string) => process.env[k] ?? (import.meta as unknown as { env?: Record<string, string> }).env?.[k] ?? "";
  const url = env("VITE_SUPABASE_URL");
  const key = env("VITE_SUPABASE_ANON_KEY");
  type News = { title: string; url: string; source: string; summary: string; published_at: string; tags: string[] };
  let news: News[] = [];
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/news_items?select=title,url,source,summary,published_at,tags&order=published_at.desc&limit=40`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (res.ok) news = (await res.json()) as News[];
    } catch {
      /* build without news */
    }
  }
  page({
    path: "/news",
    title: "New Zealand immigration and visa news for Sri Lankans · KiwiPath",
    description: "The latest New Zealand immigration, visa, student and work news, collected from official and trusted NZ sources and updated regularly.",
    type: "website",
    priority: 0.8,
    crumbs: [{ name: "News", path: "/news" }],
    body: `<h1>NZ immigration and visa news</h1><p class="lead">Latest headlines from the NZ Government, RNZ and other trusted sources. Members get these with tags and alerts inside KiwiPath.</p>
${news.length ? news.map((n) => `<div class="card"><a class="t" href="${esc(n.url)}" rel="nofollow noopener">${esc(n.title)}</a>${n.summary ? `<p>${esc(n.summary)}</p>` : ""}<p class="meta">${esc(n.source)} · ${new Date(n.published_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</p></div>`).join("\n") : `<p>News is loading. Open KiwiPath for the latest headlines.</p>`}`,
    jsonld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "NZ immigration news", url: `${SITE}/news` }],
  });
}

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

// ── IndexNow: tell Bing/Yandex (and others) about every page on production deploys ──
const INDEXNOW_KEY = "6f1c2b9e4d7a4e0f8b3c5a1d9e2f7b40";
writeFileSync(join(OUT, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
if (process.env.VERCEL_ENV === "production") {
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: urls.map((u) => u.loc) }),
    });
    console.log(`IndexNow ping: ${res.status}`);
  } catch (e) {
    console.log(`IndexNow ping skipped: ${(e as Error).message}`);
  }
}
