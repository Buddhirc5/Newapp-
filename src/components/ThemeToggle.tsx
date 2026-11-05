import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app";
import type { ThemePref } from "@/types";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match my device", icon: Monitor },
];

/** Compact light / dark / automatic switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((s) => s.settings.theme);
  const setTheme = useApp((s) => s.setTheme);
  return (
    <div role="radiogroup" aria-label="Appearance" className={cn("inline-flex items-center gap-0.5 rounded-full bg-fill-2 p-1", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.value)}
          className={cn(
            "grid size-9 place-items-center rounded-full transition-colors",
            theme === o.value ? "bg-surface text-label shadow-card" : "text-label-2 hover:text-label",
          )}
        >
          <o.icon className="size-[1.125rem]" aria-hidden />
        </button>
      ))}
    </div>
  );
}
