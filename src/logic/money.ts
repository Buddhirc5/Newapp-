import { CITY_BY_ID } from "@/data/places";
import type { MoneyItem, MoneyPlan } from "@/types";

/**
 * Money Planner maths. Every default is an editable estimate, labelled as such in
 * the interface. Official fees change, so the planner links to the Immigration NZ
 * fee finder rather than presenting these numbers as quotes.
 */

export const DEFAULT_PLAN: MoneyPlan = {
  path: "student",
  city: "auckland",
  household: "single",
  housing: "room",
  bufferWeeks: 4,
  overrides: {},
  excluded: [],
};

/** Weekly spending on food, transport, phone and power, by household. */
export const WEEKLY_LIVING_NZD = { single: 230, couple: 380, family: 520 } as const;
const ADULTS = { single: 1, couple: 2, family: 2 } as const;
const CHILDREN = { single: 0, couple: 0, family: 2 } as const;

export function defaultItems(plan: MoneyPlan): MoneyItem[] {
  const adults = ADULTS[plan.household];
  const children = CHILDREN[plan.household];
  const rent = CITY_BY_ID[plan.city].rent[plan.housing];
  const isStudent = plan.path === "student";

  const items: MoneyItem[] = [
    {
      id: "english-test",
      label: "English test (IELTS or PTE)",
      group: "before",
      currency: "LKR",
      amount: 80_000,
      note: "Check the current fee with your test centre.",
    },
    {
      id: "documents",
      label: "Police certificate, translations and courier",
      group: "before",
      currency: "LKR",
      amount: 20_000 * adults,
    },
    {
      id: "medical",
      label: "Medical and chest X-ray (panel physician)",
      group: "before",
      currency: "LKR",
      amount: 45_000 * (adults + children * 0.6),
      note: "Only if your visa asks for them.",
    },
    {
      id: "visa-fee",
      label: isStudent ? "Student visa application fee" : "Work visa (AEWV) application fee",
      group: "before",
      currency: "NZD",
      amount: isStudent ? 750 : 1540,
      note: "Estimate. Use the Immigration NZ fee finder for the current fee.",
    },
    {
      id: "family-visas",
      label: "Partner and children's visa fees",
      group: "before",
      currency: "NZD",
      amount: plan.household === "single" ? 0 : 1000 + children * 500,
      note: "Estimate. Depends on which visas your family applies for.",
    },
    {
      id: "ivl",
      label: "Visitor levy (IVL), if it applies",
      group: "before",
      currency: "NZD",
      amount: 100 * adults,
    },
    {
      id: "flights",
      label: `Flights Colombo → ${CITY_BY_ID[plan.city].name}`,
      group: "before",
      currency: "NZD",
      amount: 1300 * adults + 1000 * children,
      note: "One way. Prices change a lot by season.",
    },
  ];

  if (!isStudent) {
    items.push({
      id: "nzqa",
      label: "Qualification assessment (if needed)",
      group: "before",
      currency: "NZD",
      amount: 750,
      note: "Only some roles and residence pathways need one.",
    });
  }

  if (isStudent) {
    items.push(
      {
        id: "tuition",
        label: "Tuition, first year",
        group: "study",
        currency: "NZD",
        amount: 42_000,
        note: "Masters fees for international students are often NZD 35,000–55,000 a year. Check your programme.",
      },
      {
        id: "living-funds",
        label: "Living costs you must show for year 1",
        group: "study",
        currency: "NZD",
        amount: 20_000,
        note: "Immigration NZ asks students to show NZD 20,000 per year of study.",
      },
      {
        id: "insurance",
        label: "International student insurance",
        group: "study",
        currency: "NZD",
        amount: 700,
      },
    );
  }

  items.push(
    {
      id: "temp-stay",
      label: "First two weeks' short-term stay",
      group: "arrival",
      currency: "NZD",
      amount: plan.household === "single" ? 900 : 1500,
    },
    {
      id: "bond",
      label: "Rental bond (up to 4 weeks' rent)",
      group: "arrival",
      currency: "NZD",
      amount: rent * 4,
    },
    {
      id: "rent-advance",
      label: "Rent in advance (up to 2 weeks)",
      group: "arrival",
      currency: "NZD",
      amount: rent * 2,
    },
    {
      id: "setup",
      label: "Bedding, kitchen basics, SIM and transport card",
      group: "arrival",
      currency: "NZD",
      amount: 600 + 300 * (adults + children - 1),
    },
    {
      id: "warm-clothes",
      label: "Warm clothes for a NZ winter",
      group: "arrival",
      currency: "NZD",
      amount: 250 * (adults + children),
    },
  );

  if (!isStudent) {
    items.push({
      id: "buffer",
      label: `Living costs until first pay (${plan.bufferWeeks} weeks)`,
      group: "arrival",
      currency: "NZD",
      amount: (WEEKLY_LIVING_NZD[plan.household] + rent) * plan.bufferWeeks,
    });
  }

  return items.map((item) => ({ ...item, amount: Math.round(item.amount) }));
}

export interface MoneyLine extends MoneyItem {
  included: boolean;
  edited: boolean;
  nzd: number;
  lkr: number;
}

export interface MoneyTotals {
  lines: MoneyLine[];
  groups: Record<MoneyItem["group"], { nzd: number; lkr: number }>;
  totalNzd: number;
  totalLkr: number;
}

export function computeTotals(plan: MoneyPlan, lkrPerNzd: number): MoneyTotals {
  const lines = defaultItems(plan).map((item): MoneyLine => {
    const override = plan.overrides[item.id];
    const amount = typeof override === "number" && Number.isFinite(override) && override >= 0 ? override : item.amount;
    const included = !plan.excluded.includes(item.id) && amount > 0;
    const nzd = item.currency === "NZD" ? amount : amount / lkrPerNzd;
    const lkr = item.currency === "LKR" ? amount : amount * lkrPerNzd;
    return { ...item, amount, included, edited: override !== undefined, nzd, lkr };
  });

  const groups = {
    before: { nzd: 0, lkr: 0 },
    study: { nzd: 0, lkr: 0 },
    arrival: { nzd: 0, lkr: 0 },
  };
  for (const line of lines) {
    if (!line.included) continue;
    groups[line.group].nzd += line.nzd;
    groups[line.group].lkr += line.lkr;
  }
  const totalNzd = groups.before.nzd + groups.study.nzd + groups.arrival.nzd;
  return { lines, groups, totalNzd, totalLkr: totalNzd * lkrPerNzd };
}

/** Whole months needed to save `gap` at `monthly` per month; null when it can't be reached. */
export function monthsToGoal(gap: number, monthly: number): number | null {
  if (gap <= 0) return 0;
  if (!(monthly > 0)) return null;
  return Math.ceil(gap / monthly);
}

/** Rough first-year figure used by the Pathway Finder before someone builds a full budget. */
export function quickEstimateNzd(path: "student" | "worker", household: MoneyPlan["household"], lkrPerNzd: number): number {
  return computeTotals({ ...DEFAULT_PLAN, path, household }, lkrPerNzd).totalNzd;
}
