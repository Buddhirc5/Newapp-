import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStateStorage } from "@/lib/storage";
import { todayKey, uid } from "@/lib/format";
import { EMPTY_CV } from "@/logic/cv";
import { DEFAULT_PLAN } from "@/logic/money";
import type { Fit } from "@/logic/finder";
import type {
  Booking,
  Course,
  CvDraft,
  CvSavedDraft,
  DocStatus,
  Lang,
  MoneyPlan,
  PathId,
  PracticeSession,
  Profile,
  ScamCheck,
  ScamReport,
  ThemePref,
} from "@/types";

export interface DocDates {
  issued?: string;
  expires?: string;
  note?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  links?: { title: string; url: string }[];
  followUps?: string[];
  /** Changes the assistant suggested; `done` once the member applied them. */
  actions?: { type: string; target: string; value: string; label: string; done?: boolean }[];
  at: string;
}

export const STORE_KEY = "kiwipath-v1";

export interface FinderSnapshot {
  at: string;
  ranking: { id: PathId; score: number; fit: Fit }[];
}

export interface AppData {
  onboarded: boolean;
  isSample: boolean;
  profile: Profile;
  pathId: PathId;
  finder: FinderSnapshot | null;
  tasks: Record<string, string>;
  activeDays: string[];
  quiz: { best: number; plays: number; correct: number; answered: number };
  practice: PracticeSession[];
  scamChecks: ScamCheck[];
  money: MoneyPlan;
  savings: { savedLkr: number; monthlyLkr: number; goalSet: boolean };
  cv: CvDraft;
  cvDrafts: CvSavedDraft[];
  cvChecked: boolean;
  shortlist: Course[];
  docs: Record<string, DocStatus>;
  /** Issue and expiry dates (YYYY-MM-DD) for the visa document tracker. */
  docDates: Record<string, DocDates>;
  /** Target arrival month (YYYY-MM) for the personal timeline. */
  targetMonth: string | null;
  /** The last few AI assistant messages, kept so a chat survives a reload. */
  chat: ChatMessage[];
  bookings: Booking[];
  reports: ScamReport[];
  waitlist: { pro: boolean; mentor: boolean };
  settings: { theme: ThemePref; lang: Lang };
  updatedAt: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  goal: "explore",
  qualification: "bachelor",
  occupationId: null,
  occupationOther: "",
  experience: "2-3",
  english: "preparing",
  savingsLkr: 1_500_000,
  household: "single",
  timeline: "12m",
  city: "auckland",
};

export function freshData(): AppData {
  return {
    onboarded: false,
    isSample: false,
    profile: DEFAULT_PROFILE,
    pathId: "student",
    finder: null,
    tasks: {},
    activeDays: [],
    quiz: { best: 0, plays: 0, correct: 0, answered: 0 },
    practice: [],
    scamChecks: [],
    money: DEFAULT_PLAN,
    savings: { savedLkr: 0, monthlyLkr: 0, goalSet: false },
    cv: EMPTY_CV,
    cvDrafts: [],
    cvChecked: false,
    shortlist: [],
    docs: {},
    docDates: {},
    targetMonth: null,
    chat: [],
    bookings: [],
    reports: [],
    waitlist: { pro: false, mentor: false },
    settings: { theme: "system", lang: "en" },
    updatedAt: new Date(0).toISOString(),
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayKey(d);
}

/** A worked example so people can see a journey in progress before starting their own. */
export function sampleData(): AppData {
  const now = new Date().toISOString();
  const done = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, now]));
  return {
    ...freshData(),
    onboarded: true,
    isSample: true,
    profile: {
      name: "Nimali",
      goal: "study",
      qualification: "bachelor",
      occupationId: "accountant",
      occupationOther: "",
      experience: "4-5",
      english: "booked",
      savingsLkr: 6_500_000,
      household: "single",
      timeline: "12m",
      city: "auckland",
    },
    pathId: "student",
    finder: {
      at: now,
      ranking: [
        { id: "student", score: 78, fit: "strong" },
        { id: "worker", score: 52, fit: "possible" },
        { id: "registered", score: -30, fit: "stretch" },
        { id: "family", score: -20, fit: "stretch" },
        { id: "business", score: -20, fit: "stretch" },
      ],
    },
    tasks: done([
      "common.finder",
      "student.start.guide",
      "student.start.field",
      "student.english.choose",
      "common.speaking",
      "student.courses.shortlist",
    ]),
    activeDays: [daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)],
    quiz: { best: 75, plays: 2, correct: 12, answered: 16 },
    practice: [
      { id: "s1", at: now, promptId: "place-visit", seconds: 104, words: 196, wpm: 113, fillers: 6, longPauses: 2 },
      { id: "s2", at: now, promptId: "skill-career", seconds: 118, words: 251, wpm: 128, fillers: 3, longPauses: 1 },
      { id: "s3", at: now, promptId: "why-nz", seconds: 86, words: 190, wpm: 133, fillers: 2, longPauses: 0 },
    ],
    scamChecks: [
      { at: now, score: 85 },
      { at: now, score: 12 },
    ],
    savings: { savedLkr: 6_500_000, monthlyLkr: 180_000, goalSet: true },
    shortlist: [
      {
        id: "c1",
        university: "University of Auckland",
        programme: "Masters in professional accounting (sample)",
        intake: "July 2027",
        feeNzd: 48_000,
        ielts: 6.5,
        deadline: "2027-04-30",
        status: "researching",
      },
      {
        id: "c2",
        university: "Te Herenga Waka—Victoria University of Wellington",
        programme: "Masters in professional accounting (sample)",
        intake: "July 2027",
        feeNzd: 44_000,
        ielts: 6.5,
        deadline: "2027-05-15",
        status: "researching",
      },
    ],
    docs: { passport: "done", photo: "done", degree: "done", transcripts: "doing", english: "doing" },
    updatedAt: now,
  };
}

interface Actions {
  completeOnboarding: (profile: Profile, finder: FinderSnapshot, pathId: PathId) => void;
  loadSample: () => void;
  resetAll: () => void;
  replaceData: (data: AppData) => void;
  setProfile: (patch: Partial<Profile>) => void;
  setPath: (id: PathId) => void;
  toggleTask: (id: string, value?: boolean) => void;
  markActive: () => void;
  recordQuiz: (correct: number, total: number) => void;
  addPractice: (session: Omit<PracticeSession, "id" | "at">) => void;
  addScamCheck: (score: number) => void;
  setMoney: (patch: Partial<MoneyPlan>) => void;
  setSavings: (patch: Partial<AppData["savings"]>) => void;
  setCv: (patch: Partial<CvDraft>) => void;
  replaceCv: (cv: CvDraft) => void;
  saveCvDraft: (name: string) => CvSavedDraft;
  deleteCvDraft: (id: string) => void;
  restoreCvDrafts: (drafts: CvSavedDraft[]) => void;
  markCvChecked: () => void;
  upsertCourse: (course: Course) => void;
  removeCourse: (id: string) => void;
  setDoc: (id: string, status: DocStatus) => void;
  setDocDates: (id: string, patch: DocDates) => void;
  setTargetMonth: (month: string | null) => void;
  setChat: (chat: ChatMessage[]) => void;
  addBooking: (booking: Omit<Booking, "id" | "createdAt" | "status">) => Booking;
  cancelBooking: (id: string) => void;
  addReport: (report: Omit<ScamReport, "id" | "createdAt" | "status">) => void;
  joinWaitlist: (kind: keyof AppData["waitlist"]) => void;
  setTheme: (theme: ThemePref) => void;
  setLang: (lang: Lang) => void;
}

export type AppState = AppData & Actions;

const stamp = () => ({ updatedAt: new Date().toISOString() });

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...freshData(),

      completeOnboarding: (profile, finder, pathId) =>
        set((s) => {
          // Coming from the sample, start a clean journey but keep display settings.
          const base = s.isSample ? { ...freshData(), settings: s.settings } : s;
          return {
            ...base,
            onboarded: true,
            isSample: false,
            profile,
            finder,
            pathId,
            tasks: { ...base.tasks, "common.finder": base.tasks["common.finder"] ?? new Date().toISOString() },
            money: { ...base.money, path: pathId === "student" ? "student" : "worker", city: profile.city, household: profile.household },
            ...stamp(),
          };
        }),

      loadSample: () => set((s) => ({ ...sampleData(), settings: s.settings })),

      resetAll: () => set((s) => ({ ...freshData(), settings: s.settings, ...stamp() })),

      replaceData: (data) => set({ ...freshData(), ...data }),

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch }, ...stamp() })),

      setPath: (pathId) => set({ pathId, ...stamp() }),

      toggleTask: (id, value) =>
        set((s) => {
          const tasks = { ...s.tasks };
          const next = value ?? !tasks[id];
          if (next) tasks[id] = new Date().toISOString();
          else delete tasks[id];
          return { tasks, ...stamp() };
        }),

      markActive: () => {
        const today = todayKey();
        const days = get().activeDays;
        if (days.includes(today)) return;
        set({ activeDays: [...days.slice(-59), today] });
      },

      recordQuiz: (correct, total) =>
        set((s) => {
          const pct = total ? Math.round((correct / total) * 100) : 0;
          const tasks = { ...s.tasks };
          if (pct >= 80 && !tasks["common.quiz"]) tasks["common.quiz"] = new Date().toISOString();
          return {
            quiz: {
              best: Math.max(s.quiz.best, pct),
              plays: s.quiz.plays + 1,
              correct: s.quiz.correct + correct,
              answered: s.quiz.answered + total,
            },
            tasks,
            ...stamp(),
          };
        }),

      addPractice: (session) =>
        set((s) => {
          const practice = [{ ...session, id: uid("prac"), at: new Date().toISOString() }, ...s.practice].slice(0, 100);
          const tasks = { ...s.tasks };
          if (practice.length >= 3 && !tasks["common.speaking"]) tasks["common.speaking"] = new Date().toISOString();
          return { practice, tasks, ...stamp() };
        }),

      addScamCheck: (score) =>
        set((s) => {
          const tasks = { ...s.tasks };
          if (!tasks["common.scam-check"]) tasks["common.scam-check"] = new Date().toISOString();
          return { scamChecks: [{ at: new Date().toISOString(), score }, ...s.scamChecks].slice(0, 50), tasks, ...stamp() };
        }),

      setMoney: (patch) => set((s) => ({ money: { ...s.money, ...patch }, ...stamp() })),

      setSavings: (patch) => set((s) => ({ savings: { ...s.savings, ...patch }, ...stamp() })),

      setCv: (patch) => set((s) => ({ cv: { ...s.cv, ...patch }, ...stamp() })),

      replaceCv: (cv) => set({ cv, ...stamp() }),

      saveCvDraft: (name) => {
        const draft: CvSavedDraft = { id: uid("cv"), name: name.trim().slice(0, 60) || "My CV", savedAt: new Date().toISOString(), cv: get().cv };
        // Saving under an existing name replaces that draft.
        set((s) => ({ cvDrafts: [draft, ...s.cvDrafts.filter((d) => d.name.toLowerCase() !== draft.name.toLowerCase())].slice(0, 12), ...stamp() }));
        return draft;
      },

      deleteCvDraft: (id) => set((s) => ({ cvDrafts: s.cvDrafts.filter((d) => d.id !== id), ...stamp() })),

      restoreCvDrafts: (cvDrafts) => set({ cvDrafts, ...stamp() }),

      markCvChecked: () => set({ cvChecked: true, ...stamp() }),

      upsertCourse: (course) =>
        set((s) => {
          const exists = s.shortlist.some((c) => c.id === course.id);
          const shortlist = exists ? s.shortlist.map((c) => (c.id === course.id ? course : c)) : [...s.shortlist, course];
          const tasks = { ...s.tasks };
          if (shortlist.length >= 3 && !tasks["student.courses.shortlist"]) tasks["student.courses.shortlist"] = new Date().toISOString();
          return { shortlist, tasks, ...stamp() };
        }),

      removeCourse: (id) => set((s) => ({ shortlist: s.shortlist.filter((c) => c.id !== id), ...stamp() })),

      setDoc: (id, status) => set((s) => ({ docs: { ...s.docs, [id]: status }, ...stamp() })),

      setDocDates: (id, patch) => set((s) => ({ docDates: { ...s.docDates, [id]: { ...s.docDates[id], ...patch } }, ...stamp() })),

      setTargetMonth: (targetMonth) => set({ targetMonth, ...stamp() }),

      setChat: (chat) => set({ chat: chat.slice(-30), ...stamp() }),

      addBooking: (booking) => {
        const created: Booking = { ...booking, id: uid("book"), createdAt: new Date().toISOString(), status: "requested" };
        set((s) => ({ bookings: [created, ...s.bookings], ...stamp() }));
        return created;
      },

      cancelBooking: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id), ...stamp() })),

      addReport: (report) =>
        set((s) => ({
          reports: [{ ...report, id: uid("rep"), createdAt: new Date().toISOString(), status: "pending" as const }, ...s.reports],
          ...stamp(),
        })),

      joinWaitlist: (kind) => set((s) => ({ waitlist: { ...s.waitlist, [kind]: true }, ...stamp() })),

      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme }, ...stamp() })),

      setLang: (lang) => set((s) => ({ settings: { ...s.settings, lang }, ...stamp() })),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStateStorage),
      partialize: (s) => pickData(s),
      merge: (persisted, current) => ({ ...current, ...freshData(), ...(persisted as Partial<AppData>) }),
    },
  ),
);

const DATA_KEYS = Object.keys(freshData()) as (keyof AppData)[];

/** Only the serialisable data, without action functions. */
export function pickData(state: AppData): AppData {
  const out = {} as Record<string, unknown>;
  for (const key of DATA_KEYS) out[key] = state[key];
  return out as unknown as AppData;
}
