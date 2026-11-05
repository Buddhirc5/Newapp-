import type { DocDates } from "@/store/app";

/**
 * How long a document stays usable for an Immigration NZ application.
 * `fromIssue`: months after the issue date. `passportBuffer`: months of
 * validity a passport should still have. General guidance only; INZ's own
 * instructions for each visa win.
 */
export const DOC_RULES: Record<string, { fromIssue?: number; passport?: number; why: string }> = {
  passport: { passport: 6, why: "Keep at least 6 months beyond your planned stay, and renew before applying if it's close." },
  police: { fromIssue: 6, why: "INZ wants police certificates issued no more than 6 months before you apply." },
  medical: { fromIssue: 3, why: "Medical certificates are usually needed less than 3 months old when you apply." },
  english: { fromIssue: 24, why: "IELTS, PTE and TOEFL results are accepted for 2 years from the test date." },
  photo: { fromIssue: 6, why: "Visa photos should be taken in the last 6 months." },
  funds: { fromIssue: 1, why: "Bank statements and balance letters should be from the last month." },
  goodstanding: { fromIssue: 6, why: "Certificates of good standing are normally expected to be recent." },
};

export type DocAlert = { level: "expired" | "soon" | "ok" | "unknown"; date: Date | null; days: number | null; text: string };

const DAY = 86_400_000;

function addMonths(iso: string, months: number): Date {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** When a document stops being usable, and how urgent that is. */
export function docAlert(id: string, dates: DocDates | undefined, now = new Date()): DocAlert {
  const rule = DOC_RULES[id];
  let until: Date | null = null;
  if (dates?.expires) until = new Date(`${dates.expires}T00:00:00`);
  if (rule?.passport && until) until = addMonths(dates!.expires!, -rule.passport);
  if (rule?.fromIssue && dates?.issued) {
    const byIssue = addMonths(dates.issued, rule.fromIssue);
    until = until && until < byIssue ? until : byIssue;
  }
  if (!until || Number.isNaN(until.getTime())) return { level: "unknown", date: null, days: null, text: "" };
  const days = Math.ceil((until.getTime() - now.getTime()) / DAY);
  const when = until.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  if (days < 0) return { level: "expired", date: until, days, text: rule?.passport ? `Renew now: less than ${rule.passport} months left` : `Too old since ${when}` };
  if (days <= 60) return { level: "soon", date: until, days, text: `Use by ${when} (${days} days)` };
  return { level: "ok", date: until, days, text: `Good until ${when}` };
}
