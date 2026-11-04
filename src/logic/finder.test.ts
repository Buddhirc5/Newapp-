import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { rankPaths } from "./finder";

const base: Profile = {
  name: "",
  goal: "explore",
  qualification: "bachelor",
  occupationId: null,
  occupationOther: "",
  experience: "2-3",
  english: "preparing",
  savingsLkr: 2_000_000,
  household: "single",
  timeline: "12m",
  city: "auckland",
};

describe("rankPaths", () => {
  it("puts the study path first for a graduate who wants to study and has savings", () => {
    const ranked = rankPaths({ ...base, goal: "study", savingsLkr: 15_000_000, english: "ready" }, 187);
    expect(ranked[0].id).toBe("student");
    expect(ranked[0].fit).toBe("strong");
  });

  it("puts the registered path first for a nurse", () => {
    const ranked = rankPaths({ ...base, goal: "work", occupationId: "registered-nurse", experience: "4-5" }, 187);
    expect(ranked[0].id).toBe("registered");
    expect(ranked[0].reasons.some((r) => r.text.includes("Nursing Council"))).toBe(true);
  });

  it("puts the worker path first for an experienced developer", () => {
    const ranked = rankPaths({ ...base, goal: "work", occupationId: "software-engineer", experience: "6+" }, 187);
    expect(ranked[0].id).toBe("worker");
  });

  it("explains a funding gap for the student path", () => {
    const ranked = rankPaths({ ...base, goal: "study", savingsLkr: 100_000 }, 187);
    const student = ranked.find((r) => r.id === "student")!;
    expect(student.reasons.some((r) => !r.good && r.text.includes("funding gap"))).toBe(true);
  });

  it("returns every path exactly once, sorted by score", () => {
    const ranked = rankPaths(base, 187);
    expect(new Set(ranked.map((r) => r.id)).size).toBe(5);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
  });
});
