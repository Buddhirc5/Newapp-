import { describe, expect, it } from "vitest";
import { installment, monthlySurplus, payoff } from "./loan";

describe("loan maths", () => {
  it("computes an amortised installment", () => {
    // Rs 3,000,000 at 12% over 60 months ≈ Rs 66,733.
    expect(Math.round(installment(3_000_000, 12, 60))).toBe(66733);
    expect(installment(1200, 0, 12)).toBe(100);
  });

  it("pays off sooner with extra payments and saves interest", () => {
    const base = payoff(3_000_000, 12, installment(3_000_000, 12, 60))!;
    const faster = payoff(3_000_000, 12, 90_000)!;
    expect(base.months).toBe(60);
    expect(faster.months).toBeLessThan(base.months);
    expect(faster.totalInterest).toBeLessThan(base.totalInterest);
  });

  it("detects payments that never cover the interest", () => {
    expect(payoff(1_000_000, 24, 10_000)).toBeNull();
  });

  it("converts the installment and finds the monthly surplus", () => {
    const r = monthlySurplus({ incomeNzd: 4000, expensesNzd: 2500, installmentLkr: 66_733, lkrPerNzd: 187 });
    expect(r.installmentNzd).toBeCloseTo(356.86, 1);
    expect(r.surplusNzd).toBeCloseTo(1143.14, 1);
  });
});
