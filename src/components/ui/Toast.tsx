import { create } from "zustand";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "good" | "info" | "warn";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }));
let next = 1;

/** Shows a short confirmation banner, e.g. "Saved". */
export function toast(text: string, tone: Tone = "good") {
  const id = next++;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text, tone }] }));
  window.setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2600);
}

const ICON = { good: CircleCheck, info: Info, warn: TriangleAlert };

export function Toaster() {
  const items = useToasts((s) => s.items);
  const reduce = useReducedMotion();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 gutter-x"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full bg-night py-2.5 pr-5 pl-3.5 text-subhead font-semibold text-paper shadow-float"
            >
              <Icon className={cn("size-5", t.tone === "good" ? "text-green" : t.tone === "warn" ? "text-gold" : "text-malibu")} aria-hidden />
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
