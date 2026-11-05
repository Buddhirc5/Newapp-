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
    id: "salary",
    title: "Remove expected salary",
    detail: "Salary is discussed at interview or offer stage, not on an NZ CV.",
    patterns: [/\b(expected|current|present)\s+(salary|remuneration|package)\b/gi],
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

const US_SPELLING: [RegExp, string][] = [
  [/\b(organiz(e|ed|es|ing|ation|ations))\b/gi, "organis…"],
  [/\b(color|colors)\b/gi, "colour"],
  [/\b(center|centers)\b/gi, "centre"],
  [/\b(analyz(e|ed|es|ing))\b/gi, "analys…"],
  [/\b(optimiz(e|ed|es|ing|ation))\b/gi, "optimis…"],
  [/\b(prioritiz(e|ed|es|ing))\b/gi, "prioritis…"],
  [/\b(behavior|behaviors)\b/gi, "behaviour"],
  [/\b(program)\b(?!m)/gi, "programme (except software)"],
  [/\b(licens(e))\b(?=\s+(holder|number))/gi, "licence"],
];

const SL_INSTITUTIONS =
  /\b(university of (colombo|moratuwa|peradeniya|kelaniya|ruhuna|jaffna|sri jayewardenepura)|sliit|nsbm|iit\b|open university of sri lanka|institute of chartered accountants of sri lanka|ca sri lanka|g\.?c\.?e\.?\s*(a\/l|o\/l|advanced level|ordinary level)|sri lanka)\b/i;

export interface CheckOptions {
  /** The uploaded file had a picture on the first page. */
  hasPhoto?: boolean;
  /** Page count of an uploaded PDF. */
  pages?: number;
}

export function checkCv(text: string, opts: CheckOptions = {}): CvReport {
  const clean = text.slice(0, 60_000);
  const words = clean.split(/\s+/).filter(Boolean).length;
  const issues: CvIssue[] = [];

  for (const check of REMOVE) {
    const found = examples(clean, check.patterns);
    if (found.length) issues.push({ id: check.id, kind: "remove", title: check.title, detail: check.detail, examples: found });
  }
  if (opts.hasPhoto && !issues.some((i) => i.id === "photo")) {
    issues.unshift({ id: "photo", kind: "remove", title: "Remove your photo", detail: "Your file has a picture on the first page. NZ CVs don't include photos.", examples: [] });
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
  if (words > 1300 || (opts.pages ?? 0) > 3) {
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

  if (words > 0) {
    const us = US_SPELLING.flatMap(([re, nz]) => (clean.match(re) ?? []).slice(0, 1).map((m) => `${m} → ${nz}`)).slice(0, 4);
    if (us.length)
      issues.push({ id: "spelling", kind: "improve", title: "Use NZ English spelling", detail: "NZ employers use British-style spelling. Switch these words.", examples: us });
    const firstPerson = (clean.match(/(^|[.•\n]\s*)(i|my)\s/gim) ?? []).length;
    if (firstPerson >= 4)
      issues.push({ id: "first-person", kind: "improve", title: "Drop 'I' and 'my' from bullets", detail: "Start bullets with an action verb instead: 'Managed…', not 'I managed…'.", examples: [] });
    if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(clean) || !/(\+?\d[\d\s-]{7,}\d)/.test(clean))
      issues.push({ id: "contact", kind: "improve", title: "Add your email and phone", detail: "Put them at the top, with the country code: +94 77 123 4567.", examples: [] });
    if (!/\b(referees?|references?)\b/i.test(clean))
      issues.push({ id: "referees", kind: "improve", title: "Add referees", detail: "End with two referees (name, job title, company, phone, email), or 'Referees available on request'.", examples: [] });
    if (SL_INSTITUTIONS.test(clean) && !/\bnzqa\b/i.test(clean))
      issues.push({
        id: "nzqa",
        kind: "improve",
        title: "Show the NZ level of your qualifications",
        detail: "Add the NZQA equivalent next to Sri Lankan qualifications, e.g. 'BSc (Hons), University of Moratuwa (NZQA Level 8)'. NZQA can assess them for you.",
        examples: [],
      });
    if (/\b(profile|summary|about me|professional summary)\b/i.test(clean) && !/\bobjective\b/i.test(clean))
      issues.push({ id: "profile", kind: "good", title: "Has a profile summary", detail: "A short summary at the top is what NZ recruiters read first.", examples: [] });
    if (numbers >= 3) issues.push({ id: "numbers-good", kind: "good", title: "Uses measurable results", detail: "Numbers make your achievements believable.", examples: [] });
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
  volunteering: "",
  interests: "",
  referees: [],
  refereesOnRequest: true,
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
  if (cv.volunteering) push("", "VOLUNTEERING", ...splitLines(cv.volunteering).map((b) => `• ${b}`));
  if (cv.interests) push("", "INTERESTS", cv.interests.trim());
  push("", "REFEREES", ...refereeLines(cv));
  return lines.join("\n");
}

/** NZ CVs end with referees, or "Available on request" when none are listed. */
export function refereeLines(cv: CvDraft): string[] {
  const refs = (cv.referees ?? []).filter((r) => r.name.trim());
  if (!refs.length || cv.refereesOnRequest) return ["Available on request"];
  return refs.flatMap((r, i) => [
    ...(i ? [""] : []),
    [r.name, [r.title, r.company].filter(Boolean).join(", ")].filter(Boolean).join(" – "),
    ...(r.relationship ? [r.relationship] : []),
    [r.phone, r.email].filter(Boolean).join(" | "),
  ]).filter((l, i, a) => l || a[i + 1] !== undefined);
}

/** Pulls contact details from the top of an existing CV. */
export function guessContact(text: string): Partial<CvDraft> {
  const out: Partial<CvDraft> = {};
  const email = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/);
  if (email) out.email = email[0];
  const phone = text.match(/(\+?\d{1,3}[\s-]?)?\(?\d{2,3}\)?[\s-]?\d{3}[\s-]?\d{3,4}\b/);
  if (phone) out.phone = phone[0].trim();
  const li = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+/i);
  if (li) out.linkedin = li[0].replace(/^https?:\/\/(www\.)?/i, "");
  const firstLine = text
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l && !/^(curriculum vitae|resume|résumé|cv)$/i.test(l) && !/@|\d{4}/.test(l));
  if (firstLine && firstLine.split(/\s+/).length <= 5 && /^[A-Za-z .'-]+$/.test(firstLine)) {
    out.fullName = firstLine.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a: string, b: string) => a + b.toLowerCase());
  }
  return out;
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
