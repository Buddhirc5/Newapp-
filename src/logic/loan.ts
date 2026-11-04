/** Loan and savings maths for people repaying a loan in Sri Lanka from New Zealand income. */

/** Standard amortised monthly installment. */
export function installment(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export interface PayoffResult {
  months: number;
  totalInterest: number;
  /** Balance after each month, for charting. */
  balances: number[];
}

/** Months to clear a balance paying `payment` per month (null if the payment never covers interest). */
export function payoff(balance: number, annualRatePct: number, payment: number, cap = 600): PayoffResult | null {
  const r = annualRatePct / 100 / 12;
  if (balance <= 0) return { months: 0, totalInterest: 0, balances: [] };
  if (payment <= balance * r) return null;
  let b = balance;
  let interest = 0;
  const balances: number[] = [];
  let months = 0;
  while (b > 0.005 && months < cap) {
    const i = b * r;
    interest += i;
    b = Math.max(0, b + i - payment);
    balances.push(b);
    months += 1;
  }
  return { months, totalInterest: interest, balances };
}

export interface MonthlyPlan {
  incomeNzd: number;
  expensesNzd: number;
  installmentLkr: number;
  lkrPerNzd: number;
}

/** What's left each month after living costs and the loan installment. */
export function monthlySurplus(p: MonthlyPlan): { installmentNzd: number; surplusNzd: number; installmentShare: number } {
  const installmentNzd = p.lkrPerNzd > 0 ? p.installmentLkr / p.lkrPerNzd : 0;
  const surplusNzd = p.incomeNzd - p.expensesNzd - installmentNzd;
  return { installmentNzd, surplusNzd, installmentShare: p.incomeNzd > 0 ? installmentNzd / p.incomeNzd : 0 };
}
