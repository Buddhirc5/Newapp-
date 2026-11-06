import { cn } from "@/lib/cn";

/** The KiwiPath mark: one path from a start dot unfolding into a koru (Option 2, "Koru Path"). */
const PATH = "M136 392 C136 260 210 150 320 128 C404 112 432 214 366 252 C318 280 270 236 300 200 C318 180 350 190 348 214";

/**
 * `tile`: the app-icon square (teal, cream line, gold dot).
 * `plain`: just the line and dot, in the current text colour, for headers.
 */
export function LogoMark({ className, variant = "tile", label = "KiwiPath" }: { className?: string; variant?: "tile" | "plain"; label?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn("shrink-0", className)} role="img" aria-label={label}>
      {variant === "tile" && <rect width="512" height="512" rx="116" fill="#00765F" />}
      <g transform="translate(-6 -14)">
        <path d={PATH} fill="none" stroke={variant === "tile" ? "#F5F4ED" : "currentColor"} strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="136" cy="392" r="34" fill="#FFDA57" />
      </g>
    </svg>
  );
}

/** Mark plus the KiwiPath wordmark. */
export function Logo({ className, markClassName, textClassName }: { className?: string; markClassName?: string; textClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("size-9", markClassName)} label="" />
      <span className={cn("type-display text-title3 leading-none tracking-tight", textClassName)}>KiwiPath</span>
    </span>
  );
}
