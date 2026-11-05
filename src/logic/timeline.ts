import type { Level, Pathway } from "@/types";

/**
 * Typical weeks each stage takes, planned one after another to stay on the
 * safe side. Stages that happen after arrival (0) aren't scheduled. Rough
 * guidance only: real times depend on the person, the season and INZ queues.
 */
export const STAGE_WEEKS: Record<string, number> = {
  "student.start": 2,
  "student.english": 8,
  "student.courses": 12,
  "student.money": 6,
  "student.docs": 4,
  "student.visa": 8,
  "student.fly": 3,
  "student.after": 0,
  "worker.start": 2,
  "worker.recognised": 8,
  "worker.english": 8,
  "worker.jobs": 6,
  "worker.offer": 12,
  "worker.visa": 6,
  "worker.move": 3,
  "worker.residence": 0,
  "registered.start": 2,
  "registered.registration": 16,
  "registered.jobs": 10,
  "registered.visa": 6,
  "registered.move": 3,
  "family.start": 2,
  "family.evidence": 6,
  "family.visa": 12,
  "family.move": 3,
  "business.start": 3,
  "business.plan": 16,
  "business.visa": 20,
};

export interface TimelineStage {
  level: Level;
  weeks: number;
  start: Date;
  end: Date;
  done: number;
  total: number;
  state: "done" | "now" | "late" | "upcoming";
}

const WEEK = 7 * 86_400_000;

/** The first day of a YYYY-MM month. */
export function monthStart(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

export function toMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Weeks of work left, counting only unfinished stages. */
export function weeksLeft(pathway: Pathway, done: Record<string, string>): number {
  return pathway.levels.reduce((sum, l) => (l.tasks.every((t) => done[t.id]) ? sum : sum + (STAGE_WEEKS[l.id] ?? 4)), 0);
}

/** The earliest sensible arrival month if remaining stages start now. */
export function earliestArrival(pathway: Pathway, done: Record<string, string>, now = new Date()): string {
  return toMonth(new Date(now.getTime() + weeksLeft(pathway, done) * WEEK));
}

/**
 * Plans unfinished stages backwards from the target arrival, so each one ends
 * just in time for the next. Finished stages keep their place at the start.
 */
export function buildTimeline(pathway: Pathway, done: Record<string, string>, target: string, now = new Date()): TimelineStage[] {
  const arrive = monthStart(target);
  const levels = pathway.levels.filter((l) => (STAGE_WEEKS[l.id] ?? 4) > 0);
  const out: TimelineStage[] = [];
  let cursor = arrive.getTime();
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    const weeks = STAGE_WEEKS[level.id] ?? 4;
    const end = new Date(cursor);
    const start = new Date(cursor - weeks * WEEK);
    cursor = start.getTime();
    const total = level.tasks.length;
    const finished = level.tasks.filter((t) => done[t.id]).length;
    const state: TimelineStage["state"] = finished === total ? "done" : end.getTime() < now.getTime() ? "late" : start.getTime() <= now.getTime() ? "now" : "upcoming";
    out.unshift({ level, weeks, start, end, done: finished, total, state });
  }
  return out;
}
