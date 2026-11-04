/**
 * Scam Shield: a transparent, rule-based check for recruitment and visa scams.
 * It runs entirely on the device, so nothing a person pastes leaves their phone.
 * Each rule explains itself; the score only summarises how many warning signs appear.
 */

export type Severity = "high" | "medium" | "low";

export interface Rule {
  id: string;
  severity: Severity | "good";
  title: string;
  explain: string;
  patterns: RegExp[];
  weight: number;
}

export interface Match {
  start: number;
  end: number;
  text: string;
}

export interface Finding {
  rule: Rule;
  matches: Match[];
}

export type RiskLevel = "empty" | "low" | "caution" | "high";

export interface ScamResult {
  score: number;
  level: RiskLevel;
  warnings: Finding[];
  positives: Finding[];
  highlights: (Match & { severity: Rule["severity"] })[];
}

const WEIGHT = { high: 35, medium: 15, low: 8 } as const;

export const RULES: Rule[] = [
  {
    id: "upfront-fee",
    severity: "high",
    weight: WEIGHT.high,
    title: "Asks you to pay for a job or visa",
    explain:
      "Real NZ employers never charge you for a job offer, and charging a premium for employment is against NZ law. Fees for 'processing', 'registration' or 'job reservation' are the most common scam.",
    patterns: [
      /\b(processing|registration|service|visa|job|placement|file|agency|embassy|documentation|reservation|booking|medical|interview)\s+(fees?|charges?|costs?|payments?)\b/gi,
      /\b(pay|send|transfer|deposit|remit)\b[^.\n]{0,40}?\b(rs\.?|lkr|rupees|usd|us\$|nzd|nz\$|lakhs?|dollars)/gi,
      /\badvance\s+(payment|fee|amount)\b/gi,
      /\b\d+(\.\d+)?\s*lakhs?\b/gi,
    ],
  },
  {
    id: "guarantee",
    severity: "high",
    weight: WEIGHT.high,
    title: "Promises a guaranteed visa or job",
    explain: "Only Immigration New Zealand decides visas. Nobody can guarantee an approval, a job, or residence.",
    patterns: [
      /\b(100\s?%|guarantee[sd]?|assured|confirmed|sure)\s+(visa|job|approval|pr|residence|placement|selection)/gi,
      /\b(visa|job|approval|placement)\s+(is\s+)?(100\s?%|guaranteed|assured)/gi,
      /\bno\s+(rejections?|refusals?)\b/gi,
      /\bmoney[-\s]?back\s+guarantee\b/gi,
    ],
  },
  {
    id: "payment-method",
    severity: "high",
    weight: WEIGHT.high,
    title: "Wants payment in a hard-to-trace way",
    explain:
      "Requests for payment into a personal account, by money transfer service, mobile wallet top-up, gift cards or crypto are a strong sign of fraud. Once sent, the money is very hard to recover.",
    patterns: [
      /\b(western\s+union|moneygram|bitcoin|crypto(currency)?|usdt|binance|gift\s?cards?|itunes\s+cards?|steam\s+cards?)\b/gi,
      /\b(personal|private|my)\s+(bank\s+)?account\b/gi,
      /\b(ez\s?cash|reload\s+card|mobile\s+wallet)\b/gi,
    ],
  },
  {
    id: "visitor-work",
    severity: "high",
    weight: WEIGHT.high,
    title: "Suggests working on a visitor visa",
    explain: "Visitor visas do not allow work in New Zealand. Working on one breaks your visa conditions and can get you deported.",
    patterns: [
      /\b(visit(or)?|tourist|holiday)\s+visa\b[^.\n]{0,60}\b(work|job|convert|change)/gi,
      /\b(convert|change)\b[^.\n]{0,30}\b(visit(or)?|tourist)\s+visa\b/gi,
    ],
  },
  {
    id: "passport",
    severity: "high",
    weight: WEIGHT.high,
    title: "Asks for your original passport",
    explain: "Never hand over your original passport to an agent or employer. Immigration NZ applications are made online with scanned copies.",
    patterns: [/\b(send|give|hand\s+over|submit|courier|bring)\b[^.\n]{0,30}\boriginal\s+passports?\b/gi, /\b(keep|hold)\s+(your\s+)?passports?\b/gi],
  },
  {
    id: "urgency",
    severity: "medium",
    weight: WEIGHT.medium,
    title: "Pressures you to act fast",
    explain: "Scammers create urgency so you pay before checking. A real offer gives you time to read your employment agreement.",
    patterns: [
      /\b(urgent(ly)?|hurry|immediately|act\s+now|last\s+chance|today\s+only|don'?t\s+miss)\b/gi,
      /\blimited\s+(seats|slots|vacancies|places|positions)\b/gi,
      /\bonly\s+\d+\s+(seats|slots|vacancies|places|positions)\b/gi,
      /\bwithin\s+(24|48|72)\s+hours\b/gi,
    ],
  },
  {
    id: "too-easy",
    severity: "medium",
    weight: WEIGHT.medium,
    title: "Skips normal checks",
    explain:
      "Real skilled jobs involve interviews and checks of your experience. Offers with no interview, no experience and no English needed are a common hook.",
    patterns: [/\b(no|without)\s+(an?\s+)?(interviews?|experience|english|ielts|pte|qualifications?)\b/gi, /\bany\s+one\s+can\s+apply\b|\banyone\s+can\s+apply\b/gi],
  },
  {
    id: "free-perks",
    severity: "medium",
    weight: WEIGHT.medium,
    title: "Too-good-to-be-true perks",
    explain: "Free flights, free visas and free housing on top of a high salary for unskilled work rarely exist.",
    patterns: [/\bfree\s+(visa|tickets?|air\s?tickets?|flights?|accommodation|housing|food)\b/gi],
  },
  {
    id: "official-claim",
    severity: "medium",
    weight: WEIGHT.medium,
    title: "Claims government or embassy approval",
    explain:
      "Immigration New Zealand does not appoint or approve private recruitment agents. Advisers must hold a licence you can check on the public register.",
    patterns: [
      /\b(government|embassy|immigration|high\s+commission)[-\s]+(approved|authori[sz]ed|certified|appointed|registered)\b/gi,
      /\bapproved\s+by\s+(the\s+)?(nz|new\s+zealand)\s+(government|immigration|embassy)/gi,
      /\bofficial\s+(agent|partner)\s+of\s+(the\s+)?(nz|new\s+zealand)/gi,
    ],
  },
  {
    id: "jobseeker",
    severity: "medium",
    weight: WEIGHT.medium,
    title: "Mentions a visa type that doesn't fit NZ",
    explain:
      "New Zealand has no general 'job seeker' visa for Sri Lankan citizens. Terms like work permit, LMIA or green card come from other countries' systems and are often copied into scam templates.",
    patterns: [/\bjob\s*seeker\s+visa\b/gi, /\b(lmia|green\s+card|h-?1b|blue\s+card)\b/gi, /\bwork\s+permits?\b/gi, /\bpr\s+in\s+\d+\s+(months?|weeks?)\b/gi],
  },
  {
    id: "free-email",
    severity: "medium",
    weight: WEIGHT.medium,
    title: "Company uses a free email address",
    explain: "Established NZ employers and licensed advisers normally email from their own domain, not Gmail, Yahoo or Hotmail.",
    patterns: [/\b[\w.+-]+@(gmail|yahoo|hotmail|outlook|live|ymail|aol|rediffmail|proton(mail)?)\.[a-z.]{2,6}\b/gi],
  },
  {
    id: "chat-only",
    severity: "low",
    weight: WEIGHT.low,
    title: "Recruitment happens only on chat apps",
    explain: "Being recruited only through WhatsApp, Telegram, Viber or IMO, with no company website or video interview, is a warning sign.",
    patterns: [/\b(whats\s?app|telegram|viber|imo)\b/gi],
  },
  {
    id: "nzbn",
    severity: "good",
    weight: -5,
    title: "Includes an NZ Business Number",
    explain: "An NZBN (13 digits starting with 94) lets you check the company on the NZ business register. Scammers sometimes copy real numbers, so check the contact details match.",
    patterns: [/\b94\d{11}\b/g],
  },
  {
    id: "process-terms",
    severity: "good",
    weight: -4,
    title: "Uses the correct NZ process",
    explain: "Accredited employers, Job Checks and written employment agreements are how real AEWV hiring works. Still verify the employer on the official list.",
    patterns: [/\b(accredited\s+employer|job\s+check|job\s+token|employment\s+agreement)\b/gi],
  },
  {
    id: "interview",
    severity: "good",
    weight: -3,
    title: "Includes a proper interview",
    explain: "A video or in-person interview with the hiring manager is a normal part of real recruitment.",
    patterns: [/\b(video|zoom|teams|in[-\s]person|panel|technical)\s+interviews?\b/gi],
  },
];

function findMatches(text: string, rule: Rule): Match[] {
  const out: Match[] = [];
  for (const pattern of rule.patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    for (const m of text.matchAll(re)) {
      if (m.index === undefined || !m[0]) continue;
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export function analyzeMessage(input: string): ScamResult {
  const text = input.slice(0, 20_000);
  if (text.trim().length < 12) {
    return { score: 0, level: "empty", warnings: [], positives: [], highlights: [] };
  }

  const warnings: Finding[] = [];
  const positives: Finding[] = [];
  for (const rule of RULES) {
    const matches = findMatches(text, rule);
    if (!matches.length) continue;
    (rule.severity === "good" ? positives : warnings).push({ rule, matches });
  }

  const risk = warnings.reduce((sum, f) => sum + f.rule.weight, 0);
  // Good signs soften the score a little but never cancel a serious warning.
  const relief = Math.min(10, positives.reduce((sum, f) => sum - f.rule.weight, 0));
  const hasHigh = warnings.some((f) => f.rule.severity === "high");
  let score = Math.max(0, Math.min(100, risk - relief));
  if (hasHigh) score = Math.max(score, 50);

  const level: RiskLevel = score >= 50 ? "high" : score >= 20 ? "caution" : "low";
  const order: Record<Rule["severity"], number> = { high: 0, medium: 1, low: 2, good: 3 };
  warnings.sort((a, b) => order[a.rule.severity] - order[b.rule.severity]);

  return { score, level, warnings, positives, highlights: mergeHighlights([...warnings, ...positives]) };
}

/** Flattens matches into non-overlapping ranges; the most severe rule wins an overlap. */
function mergeHighlights(findings: Finding[]): ScamResult["highlights"] {
  const rank: Record<Rule["severity"], number> = { high: 3, medium: 2, low: 1, good: 0 };
  const all = findings
    .flatMap((f) => f.matches.map((m) => ({ ...m, severity: f.rule.severity })))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: ScamResult["highlights"] = [];
  for (const h of all) {
    const last = out[out.length - 1];
    if (last && h.start < last.end) {
      last.end = Math.max(last.end, h.end);
      if (rank[h.severity] > rank[last.severity]) last.severity = h.severity;
      continue;
    }
    out.push({ ...h });
  }
  return out;
}

/** Splits text into plain and highlighted segments for rendering. */
export function segment(text: string, highlights: ScamResult["highlights"]) {
  const parts: { text: string; severity?: Rule["severity"] }[] = [];
  let cursor = 0;
  for (const h of highlights) {
    if (h.start > cursor) parts.push({ text: text.slice(cursor, h.start) });
    parts.push({ text: text.slice(h.start, h.end), severity: h.severity });
    cursor = h.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export const SAMPLE_MESSAGE = `Dear Applicant,
Congratulations! You are selected for FARM WORKER job in New Zealand. Salary NZD 6,500 per month + free accommodation + free air ticket.
100% visa guarantee, no interview and no IELTS needed. Government approved agency.
Only 5 slots left — pay the registration fee of Rs 450,000 within 24 hours to our manager's personal account to confirm your seat.
Contact on WhatsApp: +94 7X XXX XXXX or nzjobs.recruit@gmail.com`;
