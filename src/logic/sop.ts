export interface SopInput {
  name: string;
  programme: string;
  university: string;
  degree: string;
  achievements: string;
  experience: string;
  whyProgramme: string;
  whyNz: string;
  careerGoal: string;
  funding: string;
}

export const EMPTY_SOP: SopInput = {
  name: "",
  programme: "",
  university: "",
  degree: "",
  achievements: "",
  experience: "",
  whyProgramme: "",
  whyNz: "",
  careerGoal: "",
  funding: "",
};

const clean = (s: string) => s.trim().replace(/\s+/g, " ").replace(/\.$/, "");

/**
 * Turns a career goal into a verb phrase ("work as a data analyst in Colombo")
 * when it can, so it reads naturally after "My goal is to". Returns null when
 * the person wrote a full sentence of their own.
 */
export function goalPhrase(goal: string): string | null {
  const g = clean(goal).replace(/^(my (career )?goal is|i (want|plan|hope|would like|aim|intend) to|i'?d like to)\s*(to\s+)?/i, "").replace(/^to\s+/i, "");
  if (!g) return null;
  if (/^(i|my|after|in|when|once|as)\b/i.test(g)) return null;
  return g.charAt(0).toLowerCase() + g.slice(1);
}

/** Assembles a first draft in the recommended order. The person rewrites it in their own words. */
export function draftSop(i: SopInput): string {
  const p: string[] = [];
  const goal = i.careerGoal.trim() ? goalPhrase(i.careerGoal) : null;
  p.push(
    `I am applying for the ${clean(i.programme) || "[programme]"} at ${clean(i.university) || "[university]"}. ${
      goal ? `My goal is to ${goal}, and this programme is the next step towards it.` : i.careerGoal.trim() ? "This programme is the next step towards my career goal." : ""
    }`.trim(),
  );
  if (i.degree || i.achievements) p.push(`${i.degree ? `I completed ${clean(i.degree)}.` : ""} ${i.achievements ? `${clean(i.achievements)}.` : ""}`.trim());
  if (i.experience) p.push(`${clean(i.experience)}.`);
  if (i.whyProgramme) {
    const why = clean(i.whyProgramme).replace(/^because\s+/i, "");
    p.push(/^(i|this|the|my)\b/i.test(why) ? `${why.charAt(0).toUpperCase()}${why.slice(1)}.` : `I chose this programme because ${why}.`);
  }
  if (i.whyNz) p.push(`${clean(i.whyNz)}.`);
  if (i.careerGoal.trim()) p.push(goal ? `After graduating, I plan to ${goal}.` : `${clean(i.careerGoal)}.`);
  if (i.funding) p.push(`${clean(i.funding)}.`);
  return p.filter(Boolean).join("\n\n");
}

export interface SopCheck {
  ok: boolean;
  text: string;
}

const GENERIC = /\b(world[- ]class|prestigious|beautiful country|dream (of|to)|since (my )?childhood|best (university|education) in the world)\b/gi;

export function checkSop(text: string, i: SopInput): SopCheck[] {
  const words = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const checks: SopCheck[] = [
    { ok: words >= 450 && words <= 1100, text: words < 450 ? `About ${words} words. Most strong statements are 600–1,000 words.` : words > 1100 ? `About ${words} words. Trim to under 1,000.` : `${words} words: a good length.` },
    { ok: Boolean(i.programme) && lower.includes(i.programme.toLowerCase().slice(0, 12)), text: "Names the exact programme." },
    { ok: Boolean(i.university) && lower.includes(i.university.toLowerCase().split(" ").slice(-1)[0] ?? ""), text: "Names the university." },
    { ok: /\b(course|paper|module|research|lab|project|specialisation|major)\b/i.test(text), text: "Mentions specific courses, research or projects." },
    { ok: /\b(sri lanka|colombo|kandy|galle|jaffna|home)\b/i.test(text), text: "Explains your plans in relation to home or your career path." },
    { ok: /\d/.test(text), text: "Includes concrete numbers or dates." },
  ];
  const generic = text.match(GENERIC);
  checks.push({ ok: !generic, text: generic ? `Replace general phrases like “${generic[0]}” with specific reasons.` : "No empty, generic phrases." });
  return checks;
}
