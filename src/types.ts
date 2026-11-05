export type Goal = "study" | "work" | "family" | "business" | "explore";
export type Qualification = "school" | "diploma" | "bachelor" | "postgrad" | "phd";
export type ExperienceBand = "0-1" | "2-3" | "4-5" | "6+";
export type EnglishStatus = "not-started" | "preparing" | "booked" | "below" | "ready";
export type Household = "single" | "couple" | "family";
export type Timeline = "6m" | "12m" | "24m" | "exploring";
export type CityId =
  | "undecided"
  | "auckland"
  | "wellington"
  | "christchurch"
  | "hamilton"
  | "tauranga"
  | "dunedin"
  | "palmerston-north"
  | "nelson"
  | "napier-hastings"
  | "new-plymouth"
  | "rotorua"
  | "queenstown"
  | "whangarei"
  | "invercargill";
export type PathId = "student" | "worker" | "registered" | "family" | "business";
export type Tint = "gold" | "teal" | "malibu" | "lavender" | "pink" | "coral" | "green";
export type ThemePref = "system" | "light" | "dark";
export type Lang = "en" | "si" | "ta";

/** Keys into the icon map in components/icons.tsx, so content stays plain data. */
export type IconKey =
  | "compass"
  | "book"
  | "school"
  | "wallet"
  | "files"
  | "stamp"
  | "plane"
  | "home"
  | "graduation"
  | "badge"
  | "mic"
  | "briefcase"
  | "handshake"
  | "heart"
  | "trend"
  | "shield"
  | "search"
  | "users"
  | "sparkles";

export interface Profile {
  name: string;
  goal: Goal;
  qualification: Qualification;
  occupationId: string | null;
  occupationOther: string;
  experience: ExperienceBand;
  english: EnglishStatus;
  savingsLkr: number;
  household: Household;
  timeline: Timeline;
  city: CityId;
}

export type TaskLink = { to: string; label: string } | { href: string; label: string };

export interface Task {
  id: string;
  title: string;
  detail: string;
  xp: number;
  link?: TaskLink;
}

export interface Level {
  id: string;
  title: string;
  summary: string;
  icon: IconKey;
  tasks: Task[];
}

export interface SourceLink {
  label: string;
  href: string;
}

export interface Pathway {
  id: PathId;
  name: string;
  short: string;
  tint: Tint;
  icon: IconKey;
  summary: string;
  whoFor: string[];
  steps: { title: string; detail: string }[];
  requirements: string[];
  timeline: string;
  residence: string;
  watchOuts: string[];
  sources: SourceLink[];
  checked: string;
  levels: Level[];
  documents: string[];
}

export interface Occupation {
  id: string;
  title: string;
  aliases: string[];
  group: "Health" | "Education" | "Engineering & trades" | "Technology" | "Business" | "Law & social" | "Hospitality & primary";
  regulator?: { name: string; href?: string };
  note: string;
}

export interface QuizQuestion {
  id: string;
  topic: "Kiwi slang" | "Te reo Māori" | "Driving" | "Renting" | "Work" | "Everyday life";
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface PracticeSession {
  id: string;
  at: string;
  promptId: string;
  seconds: number;
  words: number;
  wpm: number;
  fillers: number;
  longPauses: number;
}

export interface MoneyItem {
  id: string;
  label: string;
  group: "before" | "arrival" | "study";
  currency: "NZD" | "LKR";
  amount: number;
  note?: string;
}

export interface MoneyPlan {
  path: "student" | "worker";
  city: CityId;
  household: Household;
  housing: "room" | "one-bed" | "two-bed";
  bufferWeeks: number;
  overrides: Record<string, number>;
  excluded: string[];
}

export interface CvExperience {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string;
}

export interface CvDraft {
  fullName: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  workRights: string;
  summary: string;
  skills: string;
  experience: CvExperience[];
  education: string;
  certifications: string;
  volunteering?: string;
  interests?: string;
  /** Up to three referees. Empty with refereesOnRequest means "Available on request". */
  referees?: CvReferee[];
  refereesOnRequest?: boolean;
}

export interface CvReferee {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface CvSavedDraft {
  id: string;
  name: string;
  savedAt: string;
  cv: CvDraft;
}

export type CourseStatus = "researching" | "applied" | "offer" | "accepted" | "declined";

export interface Course {
  id: string;
  university: string;
  programme: string;
  intake: string;
  feeNzd: number;
  ielts: number;
  deadline: string;
  status: CourseStatus;
}

export type DocStatus = "todo" | "doing" | "done";

export interface Booking {
  id: string;
  mentorId: string;
  slotIso: string;
  topic: string;
  status: "requested";
  createdAt: string;
}

export interface ScamReport {
  id: string;
  createdAt: string;
  channel: string;
  summary: string;
  amountLkr: number;
  status: "pending" | "shared";
}

export interface ScamCheck {
  at: string;
  score: number;
}
