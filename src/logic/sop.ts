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

/** Assembles a first draft in the recommended order. The person rewrites it in their own words. */
export function draftSop(i: SopInput): string {
  const p: string[] = [];
  p.push(
    `I am applying for the ${clean(i.programme) || "[programme]"} at ${clean(i.university) || "[university]"}. ${
      i.careerGoal ? `My goal is to ${clean(i.careerGoal).replace(/^to /i, "")}, and this programme is the next step towards it.` : ""
    }`.trim(),
  );
  if (i.degree || i.achievements) p.push(`${i.degree ? `I completed ${clean(i.degree)}.` : ""} ${i.achievements ? `${clean(i.achievements)}.` : ""}`.trim());
  if (i.experience) p.push(`${clean(i.experience)}.`);
  if (i.whyProgramme) p.push(`I chose this programme because ${clean(i.whyProgramme).replace(/^because /i, "")}.`);
  if (i.whyNz) p.push(`${clean(i.whyNz)}.`);
  if (i.careerGoal) p.push(`After graduating, I plan to ${clean(i.careerGoal).replace(/^to /i, "")}.`);
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
