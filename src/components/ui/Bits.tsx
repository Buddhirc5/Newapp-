import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatPoints } from "@/lib/format";
import type { Tint } from "@/types";
import { TINT } from "../tints";

export function Card({ className, children, as: As = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "li" }) {
  return <As className={cn("rounded-card bg-surface shadow-card", className)}>{children}</As>;
}

/**
 * Pill tag. `tilt` gives the rotated sticker look of the reference "Correct" / "Wrong" tags.
 */
export function Tag({
  tint = "gold",
  tilt,
  className,
  children,
  solid = true,
}: {
  tint?: Tint;
  tilt?: number;
  className?: string;
  children: ReactNode;
  solid?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold whitespace-nowrap",
        solid ? TINT[tint].solid : cn(TINT[tint].soft, TINT[tint].text),
        tilt !== undefined && "shadow-[0_0_0_3px_var(--surface)]",
        className,
      )}
      style={tilt !== undefined ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {children}
    </span>
  );
}

export function Coin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#F4B63A" />
      <circle cx="12" cy="12" r="8.2" fill="#FFDA57" stroke="#E0A11B" strokeWidth="1.2" />
      <path d="M9.2 9.4c.4-1 1.5-1.6 2.8-1.6 1.6 0 2.7.8 2.7 2 0 2.6-5.2 1.5-5.2 4.2 0 1.2 1.1 2.1 2.6 2.1 1.4 0 2.5-.6 2.9-1.7M12 6.3v11.4" stroke="#8A5A00" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** "1,240 pts" capsule with a coin, like the score pill in the reference. */
export function PointsPill({ points, className }: { points: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full bg-surface pl-4 pr-1.5 shadow-card", className)}
      aria-label={`${formatPoints(points)} points`}
    >
      <span className="tabular text-callout font-bold">{formatPoints(points)}</span>
      <span className="text-caption font-semibold tracking-wide text-teal-ink uppercase">pts</span>
      <Coin className="size-8" />
    </span>
  );
}

/** Segmented progress dashes from the reference quiz screens. */
export function ProgressDashes({ total, done, current, className, label }: { total: number; done: number; current?: number; className?: string; label?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={label ?? `${done} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            i < done ? "bg-teal" : i === current ? "bg-malibu" : "bg-fill-3",
          )}
          style={{ maxWidth: "2.25rem" }}
        />
      ))}
    </div>
  );
}

export function ProgressRing({ value, size = 56, stroke = 6, className, children, trackClass = "text-fill-3", barClass = "text-teal" }: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
  trackClass?: string;
  barClass?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="currentColor" fill="none" className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn(barClass, "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none")}
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  );
}

export function Meter({ value, className, barClass = "bg-teal" }: { value: number; className?: string; barClass?: string }) {
  return (
    <span className={cn("block h-2 overflow-hidden rounded-full bg-fill-2", className)} aria-hidden>
      <span className={cn("block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", barClass)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </span>
  );
}

export function SectionHeader({ title, action, className, id }: { title: string; action?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3 px-1", className)}>
      <h2 id={id} className="text-title3 font-bold">
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Tile with an icon on a coloured square, used in settings-style lists. */
export function IconTile({ tint, children, className }: { tint: Tint; children: ReactNode; className?: string }) {
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-[0.6rem] text-ink", TINT[tint].solid, className)}>{children}</span>;
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "good"; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: "bg-malibu-soft",
    warn: "bg-gold-soft",
    good: "bg-green-soft",
  };
  return (
    <div className={cn("rounded-tile px-4 py-3 text-subhead", tones[tone], className)} role="note">
      {title && <p className="font-semibold">{title}</p>}
      <div className="text-label-2">{children}</div>
    </div>
  );
}

export function Avatar({ name, tint = "malibu", size = 44, className }: { name: string; tint?: Tint; size?: number; className?: string }) {
  const initials = name
    .replace(/^Sample:\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold text-ink ring-2 ring-surface", TINT[tint].solid, className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials || "K"}
    </span>
  );
}
