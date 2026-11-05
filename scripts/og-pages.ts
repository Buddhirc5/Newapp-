// Lists the public pages that get their own share image (used by gen-og.cjs and prerender.ts).
import { GUIDES } from "../src/data/guides";
import { PATHWAYS } from "../src/data/pathways";
import { NZ_CITY_LIST, weeklyCost } from "../src/data/places";

const RATE = 186.96;
const month = (n: number) => Math.round((n * 52) / 12);

export const OG_PAGES = [
  { slug: "learn", kicker: "Free guides", title: "Moving from Sri Lanka to New Zealand", sub: "Funds, SOPs, visas, jobs and your first 30 days, in plain English.", color: "#FFD23F" },
  { slug: "visa", kicker: "Visa paths", title: "5 ways to move to New Zealand", sub: "Study, skilled work, registered jobs, family and business, compared.", color: "#8FD3FF" },
  { slug: "cities", kicker: "Cost of living", title: "What 14 NZ cities really cost", sub: "Rent, food and transport each month, in NZD and rupees.", color: "#FFD23F" },
  ...GUIDES.map((g) => ({ slug: `learn-${g.slug}`, kicker: "Guide", title: g.title, sub: g.summary, color: "#FFD23F" })),
  ...PATHWAYS.map((p) => ({ slug: `visa-${p.id}`, kicker: "Visa path", title: `${p.name} in New Zealand`, sub: p.summary.slice(0, 120), color: "#8FD3FF" })),
  ...NZ_CITY_LIST.map((c) => ({
    slug: `cities-${c.id}`,
    kicker: "Cost of living 2026",
    title: `Living in ${c.name}`,
    sub: `About NZ$${month(weeklyCost(c)).toLocaleString("en-NZ")} (Rs ${Math.round(month(weeklyCost(c)) * RATE).toLocaleString("en-LK")}) a month for one person.`,
    color: "#FF8FB7",
  })),
];

if (process.env.OG_PRINT) console.log(JSON.stringify(OG_PAGES));
