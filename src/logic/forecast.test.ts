import { describe, expect, it } from "vitest";
import { forecast, monthsToTarget } from "./forecast";

describe("forecast", () => {
  it("grows from signups and shrinks with churn", () => {
    const rows = forecast({ paying: 100, arpu: 2000, signups: 200, conversion: 0.1, churn: 0.05 }, new Date(2026, 10, 5));
    expect(rows).toHaveLength(12);
    expect(rows[0].month).toBe("2026-12-01");
    expect(rows[0].paying).toBe(95);
    expect(rows[1].paying).toBe(Math.round(95.0 * 0.95 + 20));
    expect(rows[11].mrr).toBeGreaterThan(rows[0].mrr);
  });
  it("finds when a target is reached", () => {
    const rows = forecast({ paying: 10, arpu: 1000, signups: 100, conversion: 0.2, churn: 0 });
    expect(monthsToTarget(rows, 50_000)).toBe(3);
    expect(monthsToTarget(rows, 1e12)).toBeNull();
  });
});
