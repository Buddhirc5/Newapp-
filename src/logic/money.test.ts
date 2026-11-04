import { describe, expect, it } from "vitest";
import { computeTotals, DEFAULT_PLAN, defaultItems, monthsToGoal } from "./money";

const RATE = 200;

describe("money planner", () => {
  it("includes study costs only on the student path", () => {
    const student = defaultItems({ ...DEFAULT_PLAN, path: "student" }).map((i) => i.id);
    const worker = defaultItems({ ...DEFAULT_PLAN, path: "worker" }).map((i) => i.id);
    expect(student).toContain("tuition");
    expect(worker).not.toContain("tuition");
    expect(worker).toContain("buffer");
  });

  it("derives bond and rent in advance from the city rent", () => {
    const items = defaultItems({ ...DEFAULT_PLAN, city: "auckland", housing: "room" });
    const bond = items.find((i) => i.id === "bond")!;
    const advance = items.find((i) => i.id === "rent-advance")!;
    expect(bond.amount).toBe(advance.amount * 2);
  });

  it("converts each line to both currencies and sums groups", () => {
    const totals = computeTotals(DEFAULT_PLAN, RATE);
    const english = totals.lines.find((l) => l.id === "english-test")!;
    expect(english.nzd).toBeCloseTo(80_000 / RATE);
    const sum = totals.lines.filter((l) => l.included).reduce((s, l) => s + l.nzd, 0);
    expect(totals.totalNzd).toBeCloseTo(sum);
    expect(totals.totalLkr).toBeCloseTo(totals.totalNzd * RATE);
  });

  it("applies overrides and exclusions", () => {
    const base = computeTotals(DEFAULT_PLAN, RATE);
    const edited = computeTotals({ ...DEFAULT_PLAN, overrides: { tuition: 30_000 }, excluded: ["insurance"] }, RATE);
    const insurance = base.lines.find((l) => l.id === "insurance")!.nzd;
    expect(base.totalNzd - edited.totalNzd).toBeCloseTo(12_000 + insurance);
    expect(edited.lines.find((l) => l.id === "tuition")!.edited).toBe(true);
  });

  it("ignores invalid overrides", () => {
    const totals = computeTotals({ ...DEFAULT_PLAN, overrides: { tuition: -5 } }, RATE);
    expect(totals.lines.find((l) => l.id === "tuition")!.amount).toBe(42_000);
  });

  it("calculates months to a savings goal", () => {
    expect(monthsToGoal(0, 100)).toBe(0);
    expect(monthsToGoal(1000, 300)).toBe(4);
    expect(monthsToGoal(1000, 0)).toBeNull();
  });
});
