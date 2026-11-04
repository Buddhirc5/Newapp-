import type { PathId, Tint } from "@/types";

export interface Mentor {
  id: string;
  name: string;
  role: string;
  city: string;
  yearsInNz: number;
  path: PathId;
  languages: string[];
  priceLkr: number;
  bio: string;
  topics: string[];
  tint: Tint;
}

/**
 * Sample profiles for the demo. They are fictional and always labelled as samples
 * in the interface. Real mentors are loaded from the `mentors` table once
 * Supabase is connected and profiles have been verified.
 */
export const SAMPLE_MENTORS: Mentor[] = [
  {
    id: "sample-nurse",
    name: "Sample: Registered nurse",
    role: "Registered nurse, aged care",
    city: "Auckland",
    yearsInNz: 4,
    path: "registered",
    languages: ["Sinhala", "English"],
    priceLkr: 6000,
    bio: "Went through Nursing Council registration and a competence programme before moving with family.",
    topics: ["Nursing registration", "First job in aged care", "Bringing family"],
    tint: "pink",
  },
  {
    id: "sample-developer",
    name: "Sample: Software engineer",
    role: "Senior developer, fintech",
    city: "Wellington",
    yearsInNz: 6,
    path: "worker",
    languages: ["Tamil", "English"],
    priceLkr: 7500,
    bio: "Moved on a work visa after remote interviews; now hires developers and reviews CVs every week.",
    topics: ["Tech CVs", "Remote interviews", "Accredited employers"],
    tint: "gold",
  },
  {
    id: "sample-student",
    name: "Sample: Masters graduate",
    role: "Data analyst, logistics",
    city: "Christchurch",
    yearsInNz: 3,
    path: "student",
    languages: ["Sinhala", "English"],
    priceLkr: 4500,
    bio: "Studied a Masters, worked part-time through study and found a job on a post-study work visa.",
    topics: ["Choosing a course", "Part-time work", "Post-study work visa"],
    tint: "malibu",
  },
  {
    id: "sample-engineer",
    name: "Sample: Civil engineer",
    role: "Site engineer, infrastructure",
    city: "Hamilton",
    yearsInNz: 5,
    path: "worker",
    languages: ["Sinhala", "Tamil", "English"],
    priceLkr: 6500,
    bio: "Came through a construction employer; now working towards chartership.",
    topics: ["Engineering jobs", "Reference letters", "Residence planning"],
    tint: "teal",
  },
  {
    id: "sample-partner",
    name: "Sample: Partner visa holder",
    role: "Accountant, retail group",
    city: "Auckland",
    yearsInNz: 2,
    path: "family",
    languages: ["Tamil", "English"],
    priceLkr: 4000,
    bio: "Joined a partner on a student visa, then found accounting work and planned the next steps together.",
    topics: ["Relationship evidence", "Job hunting as a partner", "Childcare and schools"],
    tint: "lavender",
  },
];

/** Hours mentors offer, in Auckland local time. Sessions are 30 minutes. */
export const MENTOR_HOURS_NZ = [18, 19, 20, 21];
