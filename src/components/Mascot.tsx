import { useId } from "react";
import { cn } from "@/lib/cn";
import type { Tint } from "@/types";
import { TINT_HEX } from "./tints";

export type Mood = "happy" | "smile" | "wow" | "worried" | "thinking";
export type Pose = "stand" | "cheer" | "wave" | "suitcase";

interface MascotProps {
  mood?: Mood;
  pose?: Pose;
  tint?: Tint;
  className?: string;
  /** Spoken description. Leave empty for a purely decorative mascot. */
  label?: string;
  animate?: boolean;
}

const INK = "#100F06";
const SHOE = "#00917A";
const CHEEK = "#FF8FB8";

/**
 * Kiri, the KiwiPath guide: a little cloud (Aotearoa is often translated as
 * "land of the long white cloud") who walks with people from Colombo to NZ.
 * Drawn in the bold, rounded style of the reference board.
 */
export function Mascot({ mood = "happy", pose = "stand", tint = "malibu", className, label, animate = true }: MascotProps) {
  const id = useId();
  const { body, shade } = TINT_HEX[tint];
  const decorative = !label;

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("overflow-visible", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
    >
      {!decorative && <title>{label}</title>}
      <g className={animate ? "kp-bob" : undefined}>
        {/* Arms sit behind the body. */}
        <Arms pose={pose} color={shade} />

        {/* Legs and shoes */}
        <rect x="76" y="140" width="13" height="34" rx="6.5" fill={shade} />
        <rect x="111" y="140" width="13" height="34" rx="6.5" fill={shade} />
        <path d="M66 182c0-9 7-14 16-14s12 5 12 14H66z" fill={SHOE} />
        <path d="M106 182c0-9 3-14 12-14s16 5 16 14h-28z" fill={SHOE} />
        <path d="M76 172l7 5m0-5l-7 5M118 172l7 5m0-5l-7 5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />

        {/* Cloud body */}
        <path
          d="M50 152c-25 0-35-22-24-39-12-17 3-41 27-37 4-26 33-38 52-25 14-18 48-12 52 15 26 0 34 30 20 46 12 20-4 41-26 40H50z"
          fill={body}
        />
        <path
          d="M50 152c-25 0-35-22-24-39-12-17 3-41 27-37 4-26 33-38 52-25 14-18 48-12 52 15 26 0 34 30 20 46 12 20-4 41-26 40H50z"
          fill={`url(#${id}-shine)`}
        />
        <defs>
          <radialGradient id={`${id}-shine`} cx="0.35" cy="0.25" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <Brows mood={mood} />
        <Eyes mood={mood} />

        {/* Cheeks with hatching, as on the reference characters */}
        <ellipse cx="62" cy="122" rx="12" ry="7" fill={CHEEK} opacity="0.9" />
        <ellipse cx="142" cy="122" rx="12" ry="7" fill={CHEEK} opacity="0.9" />
        <path d="M55 125l4-6m3 6l4-6M135 125l4-6m3 6l4-6" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />

        <Mouth mood={mood} />
        {pose === "suitcase" && <Suitcase />}
      </g>
    </svg>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  const look = mood === "thinking" ? { x: 5, y: -5 } : mood === "worried" ? { x: 0, y: 1 } : { x: 2, y: -4 };
  return (
    <g>
      {[78, 122].map((cx) => (
        <g key={cx} className="kp-blink">
          <ellipse cx={cx} cy="98" rx="15" ry="17" fill="#fff" />
          <circle cx={cx + look.x} cy={98 + look.y} r="9.5" fill={INK} />
          <circle cx={cx + look.x + 3.5} cy={98 + look.y - 4} r="3.2" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ mood }: { mood: Mood }) {
  const paths: Record<Mood, string> = {
    happy: "M64 74q12-9 26-3M110 71q14-6 26 3",
    smile: "M64 76q12-7 26-3M110 73q14-4 26 3",
    wow: "M64 70q12-10 26-4M110 66q14-6 26 4",
    worried: "M66 70q12 2 24 9M110 79q12-7 24-9",
    thinking: "M64 76q12-4 26 0M110 68q14-8 26 0",
  };
  return <path d={paths[mood]} stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />;
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M86 120q14 24 28 0z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M93 129q7 7 14 0-7-5-14 0z" fill="#FF6F91" />
        </g>
      );
    case "smile":
      return <path d="M88 123q12 11 24 0" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />;
    case "wow":
      return <ellipse cx="100" cy="128" rx="7" ry="9" fill={INK} />;
    case "worried":
      return <path d="M86 131q7-7 14 0t14 0" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />;
    case "thinking":
      return <path d="M92 127q10-4 18 2" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />;
  }
}

function Arms({ pose, color }: { pose: Pose; color: string }) {
  const arm = { stroke: color, strokeWidth: 11, strokeLinecap: "round" as const, fill: "none" };
  const star = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r="11" fill="#FFDA57" stroke={INK} strokeWidth="2.5" />
      <path d="M0-6l1.8 3.8 4.2.6-3 2.9.7 4.1L0 3.5l-3.7 1.9.7-4.1-3-2.9 4.2-.6z" fill={INK} />
    </g>
  );
  switch (pose) {
    case "cheer":
      return (
        <g>
          <path d="M36 108q-22-18-20-46" {...arm} />
          <path d="M164 108q22-18 20-46" {...arm} />
          {star(16, 56)}
          {star(184, 56)}
        </g>
      );
    case "wave":
      return (
        <g>
          <path d="M34 126q-16 10-14 26" {...arm} />
          <path d="M166 106q22-14 22-40" {...arm} />
        </g>
      );
    case "suitcase":
      return (
        <g>
          <path d="M34 126q-16 10-14 26" {...arm} />
          <path d="M166 124q14 6 16 18" {...arm} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M34 126q-16 10-14 26" {...arm} />
          <path d="M166 126q16 10 14 26" {...arm} />
        </g>
      );
  }
}

function Suitcase() {
  return (
    <g>
      <path d="M170 138v-7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7" stroke={INK} strokeWidth="3" fill="none" />
      <rect x="160" y="138" width="38" height="30" rx="6" fill="#FFDA57" stroke={INK} strokeWidth="3" />
      <path d="M160 150h38" stroke={INK} strokeWidth="2.5" />
      <circle cx="171" cy="161" r="2.5" fill={INK} />
      <circle cx="187" cy="161" r="2.5" fill={INK} />
    </g>
  );
}

/** Four-point sparkle from the reference screens. */
export function Sparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("kp-twinkle", className)} style={{ animationDelay: `${delay}s` }} aria-hidden>
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill="currentColor" />
    </svg>
  );
}
