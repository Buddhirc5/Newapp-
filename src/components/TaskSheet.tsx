import { Link } from "react-router";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { tick } from "@/lib/haptics";
import { useApp } from "@/store/app";
import type { Pathway } from "@/types";
import { ICONS } from "./icons";
import { TINT } from "./tints";
import { ProgressRing } from "./ui/Bits";
import { Sheet } from "./ui/Sheet";
import { toast } from "./ui/Toast";

/** Level detail with its checklist, opened from the journey map. */
export function TaskSheet({ pathway, levelIndex, onClose }: { pathway: Pathway; levelIndex: number | null; onClose: () => void }) {
  const tasks = useApp((s) => s.tasks);
  const toggleTask = useApp((s) => s.toggleTask);
  const level = levelIndex !== null ? pathway.levels[levelIndex] : null;
  const done = level ? level.tasks.filter((t) => tasks[t.id]).length : 0;
  const Icon = level ? ICONS[level.icon] : null;

  return (
    <Sheet
      open={level !== null}
      onClose={onClose}
      title={level ? `Level ${(levelIndex ?? 0) + 1}: ${level.title}` : ""}
      description={level?.summary}
      size="tall"
    >
      {level && Icon && (
        <div className="flex flex-col gap-4">
          <div className={cn("flex items-center gap-4 rounded-tile p-4", TINT[pathway.tint].soft)}>
            <ProgressRing value={done / level.tasks.length} size={56} stroke={6}>
              <Icon className="size-6" aria-hidden />
            </ProgressRing>
            <div>
              <p className="text-headline font-semibold tabular">
                {done} of {level.tasks.length} done
              </p>
              <p className="text-subhead text-label-2">Tick tasks off as you go. Points are added straight away.</p>
            </div>
          </div>

          <ul className="flex flex-col gap-2.5">
            {level.tasks.map((task) => {
              const isDone = Boolean(tasks[task.id]);
              return (
                <li key={task.id} className="rounded-tile bg-surface p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`${task.title}${isDone ? ", done" : ""}`}
                      onClick={() => {
                        tick(isDone ? 6 : [8, 40, 8]);
                        toggleTask(task.id);
                        if (!isDone) toast(`Done! +${task.xp} points`);
                      }}
                      className={cn(
                        "-m-1.5 grid size-11 shrink-0 place-items-center rounded-full",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full border-2 transition-colors",
                          isDone ? "border-teal bg-teal text-white" : "border-label-3 bg-transparent text-transparent",
                        )}
                      >
                        <Check className="size-4" strokeWidth={3.2} aria-hidden />
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn("text-headline font-semibold", isDone && "text-label-2 line-through decoration-label-3")}>{task.title}</p>
                        <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-caption font-bold text-label tabular">+{task.xp}</span>
                      </div>
                      <p className="mt-1 text-subhead text-label-2">{task.detail}</p>
                      {task.link &&
                        ("to" in task.link ? (
                          <Link
                            to={task.link.to}
                            onClick={onClose}
                            className="mt-2 inline-flex min-h-11 items-center gap-1 text-subhead font-semibold text-teal-ink"
                          >
                            {task.link.label}
                            <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        ) : (
                          <a
                            href={task.link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex min-h-11 items-center gap-1 text-subhead font-semibold text-teal-ink"
                          >
                            {task.link.label}
                            <ArrowUpRight className="size-4" aria-hidden />
                          </a>
                        ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="px-1 text-footnote text-label-2">
            General information, checked {pathway.checked}. Always confirm details on the official site before you apply.
          </p>
        </div>
      )}
    </Sheet>
  );
}
