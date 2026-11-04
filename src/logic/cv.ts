import type { CvDraft } from "@/types";

/**
 * CV Studio checks. Sri Lankan CVs often include details that New Zealand
 * employers don't expect and, under NZ human rights law, mustn't use to decide
 * who to hire: photo, age, religion, marital status and similar. These rules
 * find them and suggest the NZ convention instead.
 */

export type IssueKind = "remove" | "improve" | "good";

export interface CvIssue {
  id: string;
  kind: IssueKind;
  title: string;
  detail: string;
  examples: string[];
}

export interface CvReport {
  score: number;
  issues: CvIssue[];
  stats: { words: number; estPages: number; numbers: number; actionVerbs: number; dutyPhrases: number };
}

interface Check {
  id: string;
  title: string;
  detail: string;
  patterns: RegExp[];
}

const REMOVE: Check[] = [
  {
    id: "photo",
    title: "Remove your photo",
    detail: "NZ CVs don't include photos. Employers avoid them to keep hiring fair.",
    patterns: [/\b(photo(graph)?|passport[-\s]size\s+picture|picture)\b/gi],
  },
  {
    id: "dob",
    title: "Remove your date of birth and age",
    detail: "Age isn't included in NZ CVs, and employers can't use it to decide who to hire.",
    patterns: [/\b(date\s+of\s+birth|d\.?\s?o\.?\s?b\.?|born\s+on)\b/gi, /\bage\s*[:-]\s*\d{2}\b/gi, /\b\d{2}\s+years\s+old\b/gi],
  },
  {
    id: "nic",
    title: "Remove your NIC or passport number",
    detail: "Identity numbers are private. You'll give them to an employer only after an offer, when they're actually needed.",
    patterns: [/\b(nic|n\.i\.c\.?|national\s+identity\s+card|passport\s+(no|number))\b/gi, /\b\d{9}[vVxX]\b/g, /\b(19|20)\d{10}\b/g],
  },
  {
    id: "religion",
    title: "Remove religion",
    detail: "Religion isn't part of an NZ CV.",
    patterns: [/\breligion\b/gi, /\b(buddhis[tm]|hindu(ism)?|muslim|islam|christian(ity)?|catholic)\b/gi],
  },
  {
    id: "marital",
    title: "Remove marital status and family details",
    detail: "Marital status, children and dependants aren't included.",
    patterns: [/\bmarital\s+status\b/gi, /\b(married|unmarried|spouse'?s?\s+name|no\.?\s+of\s+children)\b/gi],
  },
  {
    id: "parents",
    title: "Remove your parents' names",
    detail: "Parents' names and occupations aren't used in NZ CVs.",
    patterns: [/\b(father'?s|mother'?s|guardian'?s)\s+(name|occupation)\b/gi],
  },
  {
    id: "personal-traits",
    title: "Remove gender, nationality, height and weight",
    detail: "Leave these out. Add your visa or work rights status instead, which employers do need.",
    patterns: [/\b(gender|sex|nationality|race|ethnicity|height|weight|blood\s+group)\s*[:-]/gi],
  },
  {
    id: "declaration",
    title: "Remove the declaration",
    detail: "Lines like 'I hereby declare that the above information is true' aren't used in NZ. End with referees instead.",
    patterns: [/\bi\s+hereby\s+(declare|certify|confirm)\b/gi, /^\s*declaration\s*:?\s*$/gim],
  },
];

const ACTION_VERBS =
  /\b(led|managed|built|delivered|improved|increased|reduced|designed|launched|created|developed|implemented|trained|mentored|negotiated|achieved|coordinated|analy[sz]ed|streamlined|organi[sz]ed|automated|resolved|won|grew|saved|introduced|supervised|planned|established|optimi[sz]ed)\b/gi;
const DUTY_PHRASES = /\b(responsible\s+for|duties\s+include[sd]?|in\s+charge\s+of|worked\s+on|involved\s+in|tasks\s+include[sd]?)\b/gi;
const NUMBERS = /(\b\d+(\.\d+)?\s?%|\b\d{2,}(,\d{3})*\b|\b(rs|lkr|nzd|usd|\$)\s?\d)/gi;

function examples(text: string, patterns: RegExp[]): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))) {
      found.add(m[0].trim());
      if (found.size >= 3) break;
    }
  }
  return [...found];
}

export function checkCv(text: string): CvReport {
  const clean = text.slice(0, 60_000);
  const words = clean.split(/\s+/).filter(Boolean).length;
  const issues: CvIssue[] = [];

  for (const check of REMOVE) {
    const found = examples(clean, check.patterns);
    if (found.length) issues.push({ id: check.id, kind: "remove", title: check.title, detail: check.detail, examples: found });
  }

  const actionVerbs = (clean.match(ACTION_VERBS) ?? []).length;
  const dutyPhrases = (clean.match(DUTY_PHRASES) ?? []).length;
  const numbers = (clean.match(NUMBERS) ?? []).length;

  if (/\b(career\s+)?objective\b/i.test(clean)) {
    issues.push({
      id: "objective",
      kind: "improve",
      title: "Swap 'Objective' for a profile summary",
      detail: "Open with three or four lines on who you are, your strongest skills and the role you're targeting in NZ.",
      examples: examples(clean, [/\b(career\s+)?objective\b/gi]),
    });
  }
  if (dutyPhrases >= 2 && dutyPhrases >= actionVerbs) {
    issues.push({
      id: "duties",
      kind: "improve",
      title: "Lead with achievements, not duties",
      detail: "Start bullets with an action verb and finish with the result: 'Reduced month-end close from 8 to 5 days'.",
      examples: examples(clean, [DUTY_PHRASES]),
    });
  }
  if (words > 120 && numbers < 3) {
    issues.push({
      id: "numbers",
      kind: "improve",
      title: "Add measurable results",
      detail: "Numbers make achievements believable: team size, budgets, percentages, time saved, customers served.",
      examples: [],
    });
  }
  if (words > 1300) {
    issues.push({
      id: "length",
      kind: "improve",
      title: "Trim to two or three pages",
      detail: "NZ recruiters skim quickly. Keep the last 10 years in detail and summarise older roles.",
      examples: [],
    });
  }
  if (words > 0 && words < 180) {
    issues.push({
      id: "short",
      kind: "improve",
      title: "Add more detail about your experience",
      detail: "Include each role's dates, the employer's industry and three to five achievement bullets.",
      examples: [],
    });
  }

  const mentionsRights = /\b(visa|work\s+rights|eligible\s+to\s+work|sponsorship|open\s+work)\b/i.test(clean);
  if (words > 0) {
    issues.push(
      mentionsRights
        ? { id: "rights", kind: "good", title: "Work rights are clear", detail: "Employers can see your visa situation straight away.", examples: [] }
        : {
            id: "rights",
            kind: "improve",
            title: "Say what your work rights are",
            detail: "Add a line under your name, such as 'Requires AEWV sponsorship' or 'Eligible for a post-study work visa from March 2027'.",
            examples: [],
          },
    );
  }
  if (actionVerbs >= 5) {
    issues.push({ id: "verbs", kind: "good", title: "Strong action verbs", detail: `You use ${actionVerbs} action verbs. Keep leading with them.`, examples: [] });
  }

  const removeCount = issues.filter((i) => i.kind === "remove").length;
  const improveCount = issues.filter((i) => i.kind === "improve").length;
  const score = words === 0 ? 0 : Math.max(0, Math.min(100, 100 - removeCount * 12 - improveCount * 7));
  const order: Record<IssueKind, number> = { remove: 0, improve: 1, good: 2 };
  issues.sort((a, b) => order[a.kind] - order[b.kind]);

  return { score, issues, stats: { words, estPages: Math.max(1, Math.ceil(words / 450)), numbers, actionVerbs, dutyPhrases } };
}

export const EMPTY_CV: CvDraft = {
  fullName: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  linkedin: "",
  workRights: "",
  summary: "",
  skills: "",
  experience: [],
  education: "",
  certifications: "",
};

/** Plain-text version of the CV for copying into job portals. */
export function cvToText(cv: CvDraft): string {
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);
  push(cv.fullName || "Your Name");
  if (cv.headline) push(cv.headline);
  const contact = [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join(" | ");
  if (contact) push(contact);
  if (cv.workRights) push(`Work rights: ${cv.workRights}`);
  if (cv.summary) push("", "PROFILE", cv.summary);
  if (cv.skills) push("", "KEY SKILLS", ...splitList(cv.skills).map((s) => `• ${s}`));
  if (cv.experience.length) {
    push("", "EXPERIENCE");
    for (const job of cv.experience) {
      push("", `${job.role}${job.company ? `, ${job.company}` : ""}`, [job.location, [job.start, job.end].filter(Boolean).join(" – ")].filter(Boolean).join(" | "));
      push(...splitLines(job.bullets).map((b) => `• ${b}`));
    }
  }
  if (cv.education) push("", "EDUCATION", ...splitLines(cv.education));
  if (cv.certifications) push("", "CERTIFICATIONS", ...splitLines(cv.certifications));
  push("", "REFEREES", "Available on request");
  return lines.join("\n");
}

export function splitLines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export function splitList(value: string): string[] {
  return value
    .split(/[,\n]+/)
    .map((s) => s.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export const SAMPLE_SL_CV = `CURRICULUM VITAE
Career Objective: To obtain a challenging position in a reputed organisation.
Personal Details
Date of Birth: 14/03/1994
NIC: 941234567V
Religion: Buddhism
Marital Status: Married
Father's Name: K. Perera
Gender: Female

Work Experience
Accountant, ABC Holdings (2019 – present)
Responsible for preparing monthly accounts.
Responsible for supplier payments.
Duties included bank reconciliations and VAT returns.

Declaration
I hereby declare that the above information is true and correct.`;
