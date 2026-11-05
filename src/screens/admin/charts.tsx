import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

/**
 * Admin charts. Colours come from the validated --series-1..5 tokens (fixed
 * order, never cycled). Every chart keeps a legend with values, a hover
 * crosshair/tooltip and a table view, because three light-mode series colours
 * sit below 3:1 contrast and need that relief.
 */

export interface Series {
  key: string;
  label: string;
  /** 1-5: the categorical slot. Assign by entity, never by rank. */
  slot: 1 | 2 | 3 | 4 | 5;
}

export type Row = { day: string } & Record<string, number | string>;

const color = (slot: number) => `var(--series-${slot})`;

const dayLabel = (iso: string, long = false) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-NZ", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });

/** Rounds a maximum up to a tidy axis value (1, 2, 2.5, 5 × 10^n). */
function niceMax(v: number): number {
  if (v <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Groups daily rows into weeks starting Monday, summing every numeric key. */
export function toWeekly(rows: Row[], keys: string[]): Row[] {
  const out = new Map<string, Row>();
  for (const r of rows) {
    const d = new Date(`${r.day}T00:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    const acc = out.get(k) ?? ({ day: k } as Row);
    for (const key of keys) acc[key] = Number(acc[key] ?? 0) + Number(r[key] ?? 0);
    out.set(k, acc);
  }
  return [...out.values()];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function LineChart({
  rows,
  series,
  height = 260,
  format = formatNumber,
  label,
  weekly = false,
}: {
  rows: Row[];
  series: Series[];
  height?: number;
  format?: (n: number) => string;
  label: string;
  weekly?: boolean;
}) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const visible = series.filter((s) => !hidden.has(s.key));
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = useMemo(() => niceMax(Math.max(0, ...rows.flatMap((r) => visible.map((s) => Number(r[s.key] ?? 0))))), [rows, visible]);
  const x = (i: number) => pad.l + (rows.length <= 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const totals = Object.fromEntries(series.map((s) => [s.key, rows.reduce((a, r) => a + Number(r[s.key] ?? 0), 0)]));
  const empty = visible.every((s) => totals[s.key] === 0);
  const tickCount = 4;
  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(iw / 80))));

  const toggle = (key: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else if (series.length - next.size > 1) next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {series.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={!off}
              onClick={() => toggle(s.key)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-footnote font-semibold ring-1 transition-colors",
                off ? "text-label-3 ring-sep" : "bg-surface text-label ring-label/70",
              )}
            >
              <span className="size-2.5 rounded-[3px]" style={{ background: off ? "var(--fill-3)" : color(s.slot) }} aria-hidden />
              {s.label}
              <span className="text-label-2 tabular">{format(totals[s.key])}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => setTable((t) => !t)} className="ml-auto min-h-9 rounded-full px-3 text-footnote font-semibold text-teal-ink hover:bg-fill">
          {table ? "Show chart" : "Show table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-80 overflow-auto rounded-tile ring-1 ring-sep">
          <table className="w-full text-left text-footnote tabular">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-surface-2 text-label-2">
              <tr>
                <th className="px-3 py-2">{weekly ? "Week of" : "Day"}</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.day} className="border-t border-sep">
                  <td className="px-3 py-1.5">{dayLabel(r.day, true)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right">
                      {format(Number(r[s.key] ?? 0))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={box} className="relative w-full" style={{ height }}>
          <svg width={width} height={height} role="img" aria-label={label} className="block overflow-visible">
            {Array.from({ length: tickCount + 1 }, (_, i) => {
              const v = (max / tickCount) * i;
              return (
                <g key={i}>
                  <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="var(--sep)" strokeWidth={1} />
                  <text x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-label-3 text-[11px] tabular">
                    {format(v)}
                  </text>
                </g>
              );
            })}
            {rows.map((r, i) =>
              i % labelEvery === 0 ? (
                <text key={r.day} x={x(i)} y={height - 6} textAnchor="middle" className="fill-label-3 text-[11px]">
                  {dayLabel(r.day)}
                </text>
              ) : null,
            )}
            {!empty &&
              visible.map((s) => (
                <path
                  key={s.key}
                  d={rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(r[s.key] ?? 0)).toFixed(1)}`).join("")}
                  fill="none"
                  stroke={color(s.slot)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            {hover !== null && !empty && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--label-3)" strokeWidth={1} strokeDasharray="3 3" />
                {visible.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(Number(rows[hover][s.key] ?? 0))} r={4.5} fill={color(s.slot)} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect
              x={pad.l}
              y={pad.t}
              width={Math.max(0, iw)}
              height={Math.max(0, ih)}
              fill="transparent"
              onPointerMove={(e) => {
                const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                const rel = (e.clientX - rect.left) / rect.width;
                setHover(Math.max(0, Math.min(rows.length - 1, Math.round(rel * (rows.length - 1)))));
              }}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          {empty && <p className="absolute inset-0 grid place-items-center text-subhead text-label-2">No activity in this range yet.</p>}
          {hover !== null && !empty && (
            <div
              className="pointer-events-none absolute top-1 z-10 min-w-40 rounded-xl bg-night px-3 py-2 text-footnote text-paper shadow-float"
              style={{ left: Math.min(Math.max(x(hover) + 12, 0), width - 180) }}
            >
              <p className="font-semibold">{weekly ? `Week of ${dayLabel(rows[hover].day)}` : dayLabel(rows[hover].day, true)}</p>
              {visible.map((s) => (
                <p key={s.key} className="mt-0.5 flex items-center gap-2 tabular">
                  <span className="size-2 rounded-[2px]" style={{ background: color(s.slot) }} aria-hidden />
                  <span className="flex-1 text-paper/80">{s.label}</span>
                  <b>{format(Number(rows[hover][s.key] ?? 0))}</b>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for one measure across categories (single hue: magnitude, not identity). */
export function BarList({ items, format = formatNumber, slot = 1 }: { items: { label: string; value: number; sub?: string }[]; format?: (n: number) => string; slot?: Series["slot"] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-subhead text-label-2">No data yet.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="flex flex-col gap-1" title={`${i.label}: ${format(i.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-subhead">
            <span className="min-w-0 truncate font-medium">{i.label}</span>
            <span className="shrink-0 font-semibold tabular">
              {format(i.value)}
              {i.sub && <span className="ml-1.5 text-footnote font-normal text-label-2">{i.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-fill">
            <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color(slot), minWidth: i.value > 0 ? 4 : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Part-to-whole across up to five named groups, with a 2px gap between segments. */
export function SegmentBar({ parts, format = formatNumber }: { parts: { label: string; value: number; slot: Series["slot"] }[]; format?: (n: number) => string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-fill" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(", ")}>
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => <span key={p.label} title={`${p.label}: ${format(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: color(p.slot) }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-footnote">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: color(p.slot) }} aria-hidden />
            <span className="text-label-2">{p.label}</span>
            <b className="tabular">{format(p.value)}</b>
            <span className="text-label-3 tabular">{total ? Math.round((p.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Tone = "plain" | "muted" | "blue" | "pink" | "gold" | "green";
const TONE: Record<Tone, string> = {
  plain: "bg-surface",
  muted: "bg-surface-2",
  blue: "bg-malibu-soft",
  pink: "bg-pink-soft",
  gold: "bg-gold-soft",
  green: "bg-green-soft",
};

export function Kpi({ label, value, sub, tone = "plain" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-between gap-1 rounded-card p-4 shadow-card sm:p-5", TONE[tone])}>
      <p className="text-caption font-bold tracking-[0.08em] uppercase opacity-70">{label}</p>
      <p
        className={cn(
          "type-display overflow-hidden leading-none text-ellipsis whitespace-nowrap tabular",
          // Long money values step down so they stay on one line.
          String(value).length > 11 ? "text-[clamp(1.15rem,1.9vw,1.5rem)]" : String(value).length > 7 ? "text-[clamp(1.35rem,2.4vw,1.85rem)]" : "text-[clamp(1.6rem,3.2vw,2.3rem)]",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
      {sub && <p className="truncate text-footnote opacity-70">{sub}</p>}
    </div>
  );
}

export function Insight({ label, title, value, sub, status = "info" }: { label: string; title: string; value: ReactNode; sub?: ReactNode; status?: "good" | "warn" | "bad" | "info" }) {
  const bar = { good: "border-green-ink", warn: "border-gold", bad: "border-coral-ink", info: "border-malibu" }[status];
  const ink = { good: "text-green-ink", warn: "text-label", bad: "text-coral-ink", info: "text-label" }[status];
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-card border-l-4 bg-surface p-4 shadow-card", bar)}>
      <p className="text-caption font-bold tracking-[0.08em] text-label-2 uppercase">{label}</p>
      <p className="truncate text-callout font-bold">{title}</p>
      <p className={cn("type-display text-title2 leading-tight tabular", ink)}>{value}</p>
      {sub && <p className="truncate text-footnote text-label-2">{sub}</p>}
    </div>
  );
}

export function Panel({ title, sub, actions, children, className }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-card bg-surface p-4 shadow-card sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-headline font-bold">{title}</h2>
          {sub && <p className="text-footnote text-label-2">{sub}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Pill segmented control in the admin style. */
export function Pills<T extends string>({ value, onChange, options, label, dark }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; dark?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-full p-1", dark ? "bg-night" : "bg-surface shadow-card")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 rounded-full px-3.5 text-footnote font-bold transition-colors",
            value === o.value ? (dark ? "bg-paper text-ink" : "bg-night text-paper") : dark ? "text-paper/75 hover:text-paper" : "text-label-2 hover:text-label",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
