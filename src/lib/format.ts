const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const whole = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 1 });

/** "NZ$12,400" */
export function formatNzd(amount: number): string {
  const text = nzd.format(Math.round(amount));
  if (text.startsWith("-$")) return `-NZ$${text.slice(2)}`;
  if (text.startsWith("$")) return `NZ$${text.slice(1)}`;
  return text;
}

/** "Rs 2,480,000" */
export function formatLkr(amount: number): string {
  return `Rs ${whole.format(Math.round(amount))}`;
}

/**
 * Sri Lankans often talk about large sums in lakhs (1 lakh = 100,000) or millions.
 * Returns e.g. "24.8 lakh" or "1.2 million", or "" for small amounts.
 */
export function lkrSpoken(amount: number): string {
  const value = Math.abs(amount);
  if (value >= 10_000_000) return `${oneDecimal.format(amount / 1_000_000)} million`;
  if (value >= 100_000) return `${oneDecimal.format(amount / 100_000)} lakh`;
  return "";
}

export function formatNumber(value: number): string {
  return whole.format(Math.round(value));
}

export function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-NZ").format(value);
}

/** "3:05" from seconds. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const ZONES = {
  colombo: "Asia/Colombo",
  auckland: "Pacific/Auckland",
} as const;

export function timeIn(zone: string, date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit", timeZone: zone, ...opts }).format(date);
}

export function dayIn(zone: string, date: Date): string {
  return new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: zone }).format(date);
}

/** Hours that Auckland is ahead of Colombo at the given moment (7.5 in NZ summer, 6.5 in winter). */
export function aucklandLeadHours(date: Date): number {
  const offset = (zone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return (asUtc - Math.floor(date.getTime() / 60000) * 60000) / 3_600_000;
  };
  return Math.round((offset(ZONES.auckland) - offset(ZONES.colombo)) * 2) / 2;
}

export function relativeDay(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function uid(prefix = "id"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

/** Calendar date (y, m, d) in a time zone. Months are 1-based. */
export function datePartsIn(zone: string, date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function zoneOffsetMs(zone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The instant when the wall clock in `zone` shows the given local date and hour. */
export function zonedTime(zone: string, y: number, m: number, d: number, hour: number, minute = 0): Date {
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  let utc = guess - zoneOffsetMs(zone, guess);
  utc = guess - zoneOffsetMs(zone, utc);
  return new Date(utc);
}
