export interface ForecastInput {
  paying: number;
  arpu: number;
  /** New members per month. */
  signups: number;
  /** Share of new members who start paying after the free month (0-1). */
  conversion: number;
  /** Share of paying members who stop each month (0-1). */
  churn: number;
  months?: number;
}

export interface ForecastMonth {
  month: string;
  paying: number;
  mrr: number;
  revenue: number;
}

/**
 * Projects paying members and monthly revenue. New members convert one month
 * after joining (after the free month); churn applies to the existing base.
 */
export function forecast(i: ForecastInput, start = new Date()): ForecastMonth[] {
  const out: ForecastMonth[] = [];
  let paying = Math.max(0, i.paying);
  let pipeline = 0;
  for (let m = 1; m <= (i.months ?? 12); m++) {
    paying = paying * (1 - clamp(i.churn)) + pipeline;
    pipeline = Math.max(0, i.signups) * clamp(i.conversion);
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const mrr = paying * Math.max(0, i.arpu);
    out.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, paying: Math.round(paying), mrr: Math.round(mrr), revenue: Math.round(mrr) });
  }
  return out;
}

const clamp = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** Months until revenue reaches a target, or null if it never does within the horizon. */
export function monthsToTarget(rows: ForecastMonth[], target: number): number | null {
  const i = rows.findIndex((r) => r.mrr >= target);
  return i === -1 ? null : i + 1;
}
