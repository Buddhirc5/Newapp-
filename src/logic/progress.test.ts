import { describe, expect, it } from "vitest";
import { PATHWAY_BY_ID } from "@/data/pathways";
import { currentStreak, journeyProgress, TASK_XP, totalPoints } from "./progress";

describe("journeyProgress", () => {
  const path = PATHWAY_BY_ID.student;

  it("starts at the first level with the first task next", () => {
    const p = journeyProgress(path, {});
    expect(p.currentIndex).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.nextTask?.task.id).toBe(path.levels[0].tasks[0].id);
  });

  it("moves to the next level once a level is complete", () => {
    const done = Object.fromEntries(path.levels[0].tasks.map((t) => [t.id, "2026-11-01"]));
    const p = journeyProgress(path, done);
    expect(p.levels[0].complete).toBe(true);
    expect(p.currentIndex).toBe(1);
  });
});

describe("content integrity", () => {
  it("uses unique task ids within each pathway", () => {
    for (const path of Object.values(PATHWAY_BY_ID)) {
      const ids = path.levels.flatMap((l) => l.tasks.map((t) => t.id));
      expect(new Set(ids).size, path.id).toBe(ids.length);
    }
  });

  it("gives shared tasks the same xp everywhere", () => {
    for (const path of Object.values(PATHWAY_BY_ID)) {
      for (const task of path.levels.flatMap((l) => l.tasks)) expect(TASK_XP[task.id]).toBe(task.xp);
    }
  });
});

describe("points and streaks", () => {
  it("adds task xp, quiz answers, practice and scam checks", () => {
    const points = totalPoints({
      tasks: { "common.finder": "x", "common.budget": "x" },
      quizCorrect: 3,
      practice: [{ id: "p", at: "", promptId: "", seconds: 60, words: 100, wpm: 100, fillers: 0, longPauses: 0 }],
      scamChecks: [{ at: "", score: 10 }],
    });
    expect(points).toBe(40 + 30 + 30 + 15 + 5);
  });

  it("counts consecutive days, allowing today to be pending", () => {
    expect(currentStreak(["2026-11-02", "2026-11-03", "2026-11-04"], "2026-11-04")).toBe(3);
    expect(currentStreak(["2026-11-02", "2026-11-03"], "2026-11-04")).toBe(2);
    expect(currentStreak(["2026-10-30"], "2026-11-04")).toBe(0);
    expect(currentStreak(["2026-02-28", "2026-03-01"], "2026-03-01")).toBe(2);
  });
});
