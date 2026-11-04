import type { Occupation } from "@/types";

/**
 * Common occupations for Sri Lankan applicants and whether NZ law regulates them.
 * "Regulated" means you must be registered or licensed by the named body before
 * doing that work in New Zealand. Whether an occupation is on the Green List
 * changes over time, so the app links to Immigration NZ for that instead of
 * copying the list.
 */
export const OCCUPATIONS: Occupation[] = [
  {
    id: "registered-nurse",
    title: "Registered nurse",
    aliases: ["nurse", "rn", "nursing"],
    group: "Health",
    regulator: { name: "Nursing Council of New Zealand", href: "https://www.nursingcouncil.org.nz" },
    note: "Overseas nurses usually complete a competence assessment as part of registration.",
  },
  {
    id: "midwife",
    title: "Midwife",
    aliases: ["midwifery"],
    group: "Health",
    regulator: { name: "Midwifery Council", href: "https://www.midwiferycouncil.health.nz" },
    note: "Registration is required before practising.",
  },
  {
    id: "doctor",
    title: "Doctor (GP or specialist)",
    aliases: ["medical officer", "physician", "gp", "surgeon", "mbbs", "medical doctor"],
    group: "Health",
    regulator: { name: "Medical Council of New Zealand", href: "https://www.mcnz.org.nz" },
    note: "Registration pathway depends on where you trained and your specialty.",
  },
  {
    id: "dentist",
    title: "Dentist",
    aliases: ["dental surgeon", "bds"],
    group: "Health",
    regulator: { name: "Dental Council", href: "https://www.dcnz.org.nz" },
    note: "Overseas-trained dentists usually sit registration exams.",
  },
  {
    id: "pharmacist",
    title: "Pharmacist",
    aliases: ["pharmacy", "chemist"],
    group: "Health",
    regulator: { name: "Pharmacy Council", href: "https://pharmacycouncil.org.nz" },
    note: "Registration is required before practising.",
  },
  {
    id: "physiotherapist",
    title: "Physiotherapist",
    aliases: ["physio", "physical therapist"],
    group: "Health",
    regulator: { name: "Physiotherapy Board of New Zealand", href: "https://physioboard.org.nz" },
    note: "Registration is required before practising.",
  },
  {
    id: "medical-lab-scientist",
    title: "Medical laboratory scientist",
    aliases: ["mlt", "lab technologist", "medical laboratory technologist"],
    group: "Health",
    regulator: { name: "Medical Sciences Council of New Zealand", href: "https://www.mscouncil.org.nz" },
    note: "Registration is required before practising.",
  },
  {
    id: "radiographer",
    title: "Radiographer / medical imaging technologist",
    aliases: ["radiographer", "x-ray", "medical imaging", "sonographer"],
    group: "Health",
    regulator: { name: "Medical Radiation Technologists Board" },
    note: "Registration is required before practising.",
  },
  {
    id: "occupational-therapist",
    title: "Occupational therapist",
    aliases: ["ot"],
    group: "Health",
    regulator: { name: "Occupational Therapy Board of New Zealand", href: "https://otboard.org.nz" },
    note: "Registration is required before practising.",
  },
  {
    id: "psychologist",
    title: "Psychologist",
    aliases: ["counselling psychologist", "clinical psychologist"],
    group: "Health",
    regulator: { name: "New Zealand Psychologists Board", href: "https://psychologistsboard.org.nz" },
    note: "The title 'psychologist' is protected in NZ.",
  },
  {
    id: "paramedic",
    title: "Paramedic",
    aliases: ["ambulance officer", "emt"],
    group: "Health",
    regulator: { name: "Paramedic Council" },
    note: "Paramedics have been a regulated profession in NZ since 2020.",
  },
  {
    id: "caregiver",
    title: "Caregiver / aged care worker",
    aliases: ["carer", "care assistant", "support worker", "aged care"],
    group: "Health",
    note: "Not regulated, but employers often ask for first aid and a health qualification.",
  },
  {
    id: "secondary-teacher",
    title: "Secondary school teacher",
    aliases: ["teacher", "high school teacher", "maths teacher", "science teacher"],
    group: "Education",
    regulator: { name: "Teaching Council of Aotearoa New Zealand", href: "https://teachingcouncil.nz" },
    note: "You need registration and a practising certificate to teach in NZ schools.",
  },
  {
    id: "primary-teacher",
    title: "Primary school teacher",
    aliases: ["teacher", "primary teacher"],
    group: "Education",
    regulator: { name: "Teaching Council of Aotearoa New Zealand", href: "https://teachingcouncil.nz" },
    note: "You need registration and a practising certificate to teach in NZ schools.",
  },
  {
    id: "ece-teacher",
    title: "Early childhood teacher",
    aliases: ["preschool teacher", "kindergarten teacher", "ece"],
    group: "Education",
    regulator: { name: "Teaching Council of Aotearoa New Zealand", href: "https://teachingcouncil.nz" },
    note: "Qualified ECE teachers need registration and a practising certificate.",
  },
  {
    id: "civil-engineer",
    title: "Civil engineer",
    aliases: ["structural engineer", "engineer", "site engineer"],
    group: "Engineering & trades",
    regulator: { name: "Engineering New Zealand (Chartered Professional Engineer)", href: "https://www.engineeringnz.org" },
    note: "Not every engineering job needs registration, but chartership (CPEng) is needed for some sign-off work.",
  },
  {
    id: "electrical-engineer",
    title: "Electrical engineer",
    aliases: ["engineer", "power engineer"],
    group: "Engineering & trades",
    regulator: { name: "Engineering New Zealand (Chartered Professional Engineer)", href: "https://www.engineeringnz.org" },
    note: "Hands-on electrical work may also need registration with the Electrical Workers Registration Board.",
  },
  {
    id: "mechanical-engineer",
    title: "Mechanical engineer",
    aliases: ["engineer"],
    group: "Engineering & trades",
    note: "Usually not regulated. Membership of Engineering New Zealand can help with employers.",
  },
  {
    id: "electrician",
    title: "Electrician",
    aliases: ["electrical worker", "wireman"],
    group: "Engineering & trades",
    regulator: { name: "Electrical Workers Registration Board", href: "https://www.ewrb.govt.nz" },
    note: "Electrical work in NZ needs registration and a practising licence.",
  },
  {
    id: "plumber",
    title: "Plumber, gasfitter or drainlayer",
    aliases: ["plumbing", "gas fitter", "drain layer"],
    group: "Engineering & trades",
    regulator: { name: "Plumbers, Gasfitters and Drainlayers Board", href: "https://www.pgdb.co.nz" },
    note: "Licensing is required for this work.",
  },
  {
    id: "carpenter",
    title: "Carpenter / builder",
    aliases: ["builder", "construction", "joiner"],
    group: "Engineering & trades",
    regulator: { name: "Licensed Building Practitioners scheme", href: "https://www.lbp.govt.nz" },
    note: "A licence is needed for some structural ('restricted') building work.",
  },
  {
    id: "quantity-surveyor",
    title: "Quantity surveyor",
    aliases: ["qs", "cost engineer"],
    group: "Engineering & trades",
    note: "Not regulated. Professional membership is valued by employers.",
  },
  {
    id: "architect",
    title: "Architect",
    aliases: ["architecture"],
    group: "Engineering & trades",
    regulator: { name: "New Zealand Registered Architects Board" },
    note: "The title 'architect' is protected in NZ.",
  },
  {
    id: "software-engineer",
    title: "Software engineer / developer",
    aliases: ["programmer", "developer", "software developer", "full stack", "frontend", "backend", "it"],
    group: "Technology",
    note: "Not regulated. A strong portfolio and NZ-style CV matter more than certificates.",
  },
  {
    id: "data-analyst",
    title: "Data analyst / data scientist",
    aliases: ["data", "analytics", "bi analyst", "data scientist"],
    group: "Technology",
    note: "Not regulated.",
  },
  {
    id: "ict-security",
    title: "Cyber security specialist",
    aliases: ["security analyst", "cyber", "infosec", "soc analyst"],
    group: "Technology",
    note: "Not regulated. Industry certifications help.",
  },
  {
    id: "network-engineer",
    title: "Network or systems engineer",
    aliases: ["sysadmin", "network", "cloud engineer", "devops"],
    group: "Technology",
    note: "Not regulated.",
  },
  {
    id: "qa-engineer",
    title: "QA / test engineer",
    aliases: ["tester", "qa", "quality assurance"],
    group: "Technology",
    note: "Not regulated.",
  },
  {
    id: "business-analyst",
    title: "Business analyst",
    aliases: ["ba", "product analyst"],
    group: "Business",
    note: "Not regulated.",
  },
  {
    id: "accountant",
    title: "Accountant",
    aliases: ["accounts", "cima", "acca", "ca", "finance"],
    group: "Business",
    note: "Most accounting roles are not regulated, though public practice needs professional membership. CA ANZ or CPA membership is valued.",
  },
  {
    id: "project-manager",
    title: "Project manager",
    aliases: ["pm", "construction manager", "programme manager"],
    group: "Business",
    note: "Not regulated.",
  },
  {
    id: "marketing",
    title: "Marketing specialist",
    aliases: ["digital marketing", "marketing executive", "brand"],
    group: "Business",
    note: "Not regulated.",
  },
  {
    id: "lawyer",
    title: "Lawyer",
    aliases: ["attorney", "attorney-at-law", "solicitor", "barrister", "legal"],
    group: "Law & social",
    regulator: { name: "New Zealand Law Society", href: "https://www.lawsociety.org.nz" },
    note: "Overseas lawyers need their qualifications assessed before admission in NZ.",
  },
  {
    id: "social-worker",
    title: "Social worker",
    aliases: ["social work", "case worker"],
    group: "Law & social",
    regulator: { name: "Social Workers Registration Board", href: "https://swrb.govt.nz" },
    note: "Registration has been mandatory for social workers since 2021.",
  },
  {
    id: "veterinarian",
    title: "Veterinarian",
    aliases: ["vet", "veterinary surgeon"],
    group: "Law & social",
    regulator: { name: "Veterinary Council of New Zealand", href: "https://www.vetcouncil.org.nz" },
    note: "Registration is required before practising.",
  },
  {
    id: "chef",
    title: "Chef / cook",
    aliases: ["cook", "kitchen", "chef de partie", "sous chef"],
    group: "Hospitality & primary",
    note: "Not regulated. Food safety certificates help.",
  },
  {
    id: "dairy-farm",
    title: "Dairy farm worker",
    aliases: ["farm", "farmhand", "agriculture"],
    group: "Hospitality & primary",
    note: "Not regulated.",
  },
  {
    id: "truck-driver",
    title: "Truck driver",
    aliases: ["driver", "heavy vehicle", "lorry"],
    group: "Hospitality & primary",
    note: "Not regulated as a profession, but you need the right NZ licence class. Overseas licences have conversion rules.",
  },
  {
    id: "mechanic",
    title: "Automotive technician",
    aliases: ["mechanic", "motor mechanic", "auto electrician"],
    group: "Engineering & trades",
    note: "Not regulated. Some roles need certification to issue Warrants of Fitness.",
  },
];

export function searchOccupations(query: string, list: Occupation[] = OCCUPATIONS): Occupation[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list
    .map((o) => {
      const hay = [o.title, ...o.aliases, o.group, o.regulator?.name ?? ""].join(" ").toLowerCase();
      const titleHit = o.title.toLowerCase().startsWith(q) ? 3 : o.title.toLowerCase().includes(q) ? 2 : 0;
      const aliasHit = o.aliases.some((a) => a === q) ? 2 : 0;
      const all = terms.every((term) => hay.includes(term));
      return { o, score: all ? 1 + titleHit + aliasHit : 0 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.o.title.localeCompare(b.o.title))
    .map((r) => r.o);
}

export const OCCUPATION_BY_ID = Object.fromEntries(OCCUPATIONS.map((o) => [o.id, o])) as Record<string, Occupation>;
