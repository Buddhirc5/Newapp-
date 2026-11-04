import { PATHWAYS } from "@/data/pathways";
import type { Level, Pathway, PracticeSession, ScamCheck, Task, Tint } from "@/types";

export type Done = Record<string, string>;

/** xp for every task id across all pathways (shared tasks appear once). */
export const TASK_XP: Record<string, number> = Object.fromEntries(
  PATHWAYS.flatMap((p) => p.levels.flatMap((l) => l.tasks.map((t) => [t.id, t.xp] as const))),
);

export interface LevelProgress {
  level: Level;
  index: number;
  done: number;
  total: number;
  complete: boolean;
}

export interface JourneyProgress {
  levels: LevelProgress[];
  currentIndex: number;
  completeLevels: number;
  doneTasks: number;
  totalTasks: number;
  percent: number;
  nextTask: { task: Task; level: Level } | null;
}

export function journeyProgress(pathway: Pathway, done: Done): JourneyProgress {
  const levels = pathway.levels.map((level, index): LevelProgress => {
    const total = level.tasks.length;
    const count = level.tasks.filter((t) => done[t.id]).length;
    return { level, index, done: count, total, complete: count === total };
  });
  const firstOpen = levels.findIndex((l) => !l.complete);
  const currentIndex = firstOpen === -1 ? levels.length - 1 : firstOpen;
  const doneTasks = levels.reduce((s, l) => s + l.done, 0);
  const totalTasks = levels.reduce((s, l) => s + l.total, 0);
  let nextTask: JourneyProgress["nextTask"] = null;
  if (firstOpen !== -1) {
    const level = levels[firstOpen].level;
    const task = level.tasks.find((t) => !done[t.id]);
    if (task) nextTask = { task, level };
  }
  return {
    levels,
    currentIndex,
    completeLevels: levels.filter((l) => l.complete).length,
    doneTasks,
    totalTasks,
    percent: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    nextTask,
  };
}

export interface PointsInput {
  tasks: Done;
  quizCorrect: number;
  practice: PracticeSession[];
  scamChecks: ScamCheck[];
}

export function totalPoints(s: PointsInput): number {
  const taskPoints = Object.keys(s.tasks).reduce((sum, id) => sum + (TASK_XP[id] ?? 0), 0);
  return taskPoints + s.quizCorrect * 10 + s.practice.length * 15 + Math.min(s.scamChecks.length, 20) * 5;
}

/** Consecutive days with activity, counting back from today (or yesterday, so a streak survives until midnight). */
export function currentStreak(days: string[], today: string): number {
  const set = new Set(days);
  const step = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    return prev.toISOString().slice(0, 10);
  };
  let cursor = set.has(today) ? today : step(today);
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = step(cursor);
  }
  return count;
}

export interface BadgeInput extends PointsInput {
  finderDone: boolean;
  quizBest: number;
  cvChecked: boolean;
  savingsGoalSet: boolean;
  docsDone: number;
  streak: number;
  journeyPercent: number;
}

export interface Badge {
  id: string;
  title: string;
  detail: string;
  tint: Tint;
  earned: (s: BadgeInput) => boolean;
}

export const BADGES: Badge[] = [
  { id: "pathfinder", title: "Pathfinder", detail: "Finished the Pathway Finder", tint: "malibu", earned: (s) => s.finderDone },
  { id: "scam-spotter", title: "Scam Spotter", detail: "Checked three messages with Scam Shield", tint: "coral", earned: (s) => s.scamChecks.length >= 3 },
  { id: "speaker", title: "Confident Speaker", detail: "Completed five speaking sessions", tint: "lavender", earned: (s) => s.practice.length >= 5 },
  { id: "kiwi-local", title: "Kiwi Local", detail: "Scored 80% or more in Kiwi Life", tint: "green", earned: (s) => s.quizBest >= 80 },
  { id: "cv-ready", title: "CV Ready", detail: "Checked a CV against NZ conventions", tint: "pink", earned: (s) => s.cvChecked },
  { id: "budget-boss", title: "Budget Boss", detail: "Set a savings goal", tint: "gold", earned: (s) => s.savingsGoalSet },
  { id: "paperwork", title: "Paper Trail", detail: "Marked five documents ready", tint: "teal", earned: (s) => s.docsDone >= 5 },
  { id: "streak-7", title: "Seven-day Streak", detail: "Used KiwiPath seven days in a row", tint: "gold", earned: (s) => s.streak >= 7 },
  { id: "halfway", title: "Halfway There", detail: "Completed half of your journey", tint: "malibu", earned: (s) => s.journeyPercent >= 50 },
];
