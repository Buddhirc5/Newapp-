import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Flame, MapPin, Plane } from "lucide-react";
import { ICONS } from "@/components/icons";
import { Page } from "@/components/layout/Page";
import { Mascot, Sparkle } from "@/components/Mascot";
import { TaskSheet } from "@/components/TaskSheet";
import { TINT } from "@/components/tints";
import { Avatar, Card, PointsPill, ProgressDashes, SectionHeader } from "@/components/ui/Bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { undoToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { aucklandLeadHours, timeIn, todayKey, ZONES } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { useRate } from "@/lib/rates";
import { currentStreak, journeyProgress, totalPoints } from "@/logic/progress";
import { useApp } from "@/store/app";
import type { Task } from "@/types";

export function Journey() {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const pathId = useApp((s) => s.pathId);
  const tasks = useApp((s) => s.tasks);
  const quiz = useApp((s) => s.quiz);
  const practice = useApp((s) => s.practice);
  const scamChecks = useApp((s) => s.scamChecks);
  const activeDays = useApp((s) => s.activeDays);
  const toggleTask = useApp((s) => s.toggleTask);

  const pathway = usePathways()[pathId];
  const progress = useMemo(() => journeyProgress(pathway, tasks), [pathway, tasks]);
  const points = totalPoints({ tasks, quizCorrect: quiz.correct, practice, scamChecks });
  const streak = currentStreak(activeDays, todayKey());
  const [openLevel, setOpenLevel] = useState<number | null>(null);

  const next = progress.nextTask;
  const currentLevel = progress.levels[progress.currentIndex];

  const completeTask = (task: Task) => {
    toggleTask(task.id, true);
    undoToast(`Nice! +${task.xp} points`, () => toggleTask(task.id, false));
  };

  return (
    <Page
      title="Journey"
      hero={
        <div className="flex flex-col gap-5 pt-1 pb-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/me" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1 shadow-card" aria-label="Your profile">
              <Avatar name={profile.name || "You"} size={36} tint="lavender" />
              <span className="max-w-[9rem] truncate text-subhead font-semibold">{profile.name || "You"}</span>
            </Link>
            <PointsPill points={points} />
          </div>
          <div>
            <p className="text-title3 font-semibold text-label-2">
              {t("greet")}
              {profile.name ? `, ${profile.name}` : ""}
            </p>
            <h1 className="type-display mt-1 text-hero">{t("journey.title")}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/paths/${pathway.id}`}
              className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-subhead font-semibold", TINT[pathway.tint].solid)}
            >
              {pathway.short}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-subhead font-semibold shadow-card">
              <Flame className="size-4 text-orange" aria-hidden />
              {streak} day{streak === 1 ? "" : "s"} streak
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full bg-surface px-3.5 text-subhead font-semibold shadow-card tabular">
              {progress.percent}% complete
            </span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Next step */}
        <section aria-labelledby="next-step" className="relative">
          <div className="relative overflow-hidden rounded-[2rem] bg-gold p-5 pt-6 text-ink sm:p-7">
            <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
            <Mascot pose="suitcase" mood="happy" className="pointer-events-none absolute -top-1 right-1 w-28 sm:w-36" />
            <div className="relative flex flex-col gap-4 pr-24 sm:pr-36">
              <div>
                <p id="next-step" className="text-footnote font-semibold tracking-wide uppercase opacity-70">
                  {t("journey.next")} · Level {progress.currentIndex + 1} of {progress.levels.length}
                </p>
                <p className="mt-1 text-headline font-semibold">{currentLevel.level.title}</p>
              </div>
              <ProgressDashes
                total={currentLevel.total}
                done={currentLevel.done}
                current={currentLevel.done}
                label={`${currentLevel.done} of ${currentLevel.total} tasks done in ${currentLevel.level.title}`}
                className="[&>span]:bg-ink/15 [&>span.bg-teal]:bg-teal-ink [&>span.bg-malibu]:bg-white"
              />
            </div>
            {next ? (
              <div className="relative mt-5 flex flex-col gap-4">
                <h2 className="type-display text-title2 leading-tight">{next.task.title}</h2>
                <p className="max-w-[34rem] text-callout opacity-80">{next.task.detail}</p>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="dark" icon={<Check className="size-5" aria-hidden />} onClick={() => completeTask(next.task)}>
                    Mark done
                  </Button>
                  {next.task.link &&
                    ("to" in next.task.link ? (
                      <ButtonLink to={next.task.link.to} variant="light" iconAfter={<ArrowRight className="size-5" aria-hidden />}>
                        {next.task.link.label}
                      </ButtonLink>
                    ) : (
                      <a
                        href={next.task.link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[3.25rem] items-center gap-2 rounded-full bg-white px-6 text-headline font-semibold text-ink hover:bg-white/90"
                      >
                        {next.task.link.label}
                        <ArrowUpRight className="size-5" aria-hidden />
                      </a>
                    ))}
                </div>
              </div>
            ) : (
              <div className="relative mt-5">
                <h2 className="type-display text-title2">Every step done. Haere mai!</h2>
                <p className="mt-2 text-callout opacity-80">"Haere mai" means welcome. Keep your records handy for your next visa.</p>
              </div>
            )}
          </div>
        </section>

        {/* Map */}
        <section aria-labelledby="journey-map" className="flex flex-col gap-4">
          <SectionHeader
            id="journey-map"
            title={t("journey.map")}
            action={
              <span className="text-subhead text-label-2 tabular">
                {progress.completeLevels}/{progress.levels.length} levels
              </span>
            }
          />
          <JourneyMap progress={progress} onOpen={setOpenLevel} />
        </section>

        <QuickTools />
        <TimeAndMoney />
      </div>

      <TaskSheet
        pathway={pathway}
        levelIndex={openLevel}
        onClose={() => setOpenLevel(null)}
      />
    </Page>
  );
}

const ROW = 128;

/** Labels sit on the roomier side of each node; centred nodes alternate. */
function labelSide(index: number, x: number, width: number): "left" | "right" {
  if (Math.abs(x - width / 2) < 2) return index % 4 === 2 ? "left" : "right";
  return x > width * 0.55 ? "left" : "right";
}

function JourneyMap({ progress, onOpen }: { progress: ReturnType<typeof journeyProgress>; onOpen: (index: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Nodes zig-zag gently down the screen, like a route on a map.
  const pattern = [0.5, 0.74, 0.5, 0.26];
  const top = 92;
  const points = progress.levels.map((_, i) => ({ x: width * pattern[i % pattern.length], y: top + i * ROW }));
  const start = { x: width * 0.5, y: 28 };
  // Both ends sit in the middle so their pills never run off narrow screens.
  const end = { x: width * 0.5, y: top + progress.levels.length * ROW - 24 };
  const all = [start, ...points, end];
  const d = all
    .map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const prev = all[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `C${prev.x} ${midY} ${p.x} ${midY} ${p.x} ${p.y}`;
    })
    .join(" ");
  const height = end.y + 64;
  const currentPoint = points[progress.currentIndex];

  return (
    <div ref={box} className="relative" style={{ height }}>
      <svg className="absolute inset-0" width={width} height={height} aria-hidden>
        <path d={d} fill="none" stroke="var(--fill-3)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 14" />
      </svg>

      {/* Start: Colombo */}
      <div className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-night py-2 pr-4 pl-2.5 text-paper shadow-card" style={{ left: start.x, top: start.y }}>
        <span className="grid size-7 place-items-center rounded-full bg-gold text-ink">
          <Plane className="size-4 -rotate-45" aria-hidden />
        </span>
        <span className="text-subhead font-semibold whitespace-nowrap">Colombo, Sri Lanka</span>
      </div>

      <ol className="contents">
        {progress.levels.map((lp, i) => {
          const p = points[i];
          const Icon = ICONS[lp.level.icon];
          const isCurrent = i === progress.currentIndex && !lp.complete;
          const labelOnLeft = labelSide(i, p.x, width) === "left";
          return (
            <li key={lp.level.id} className="absolute" style={{ left: p.x, top: p.y }}>
              <button
                type="button"
                onClick={() => onOpen(i)}
                className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                aria-label={`Level ${i + 1}: ${lp.level.title}. ${lp.done} of ${lp.total} tasks done${isCurrent ? ". Current level" : ""}`}
              >
                {isCurrent && <span className="kp-pulse absolute inset-0 rounded-full bg-gold" aria-hidden />}
                <span
                  className={cn(
                    "relative grid size-[4.5rem] place-items-center rounded-full border-[5px] shadow-card transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none",
                    lp.complete ? "border-teal-soft bg-teal text-white" : isCurrent ? "border-white bg-gold text-ink" : "border-surface bg-surface-2 text-label-3",
                  )}
                >
                  {lp.complete ? <Check className="size-8" strokeWidth={3} aria-hidden /> : <Icon className="size-7" aria-hidden />}
                </span>
              </button>
              <div
                className={cn("absolute top-0 -translate-y-1/2", labelOnLeft ? "right-12 text-right" : "left-12 text-left")}
                style={{ width: Math.max(96, Math.min(192, labelOnLeft ? p.x - 52 : width - p.x - 52)) }}
                aria-hidden
              >
                <p className="text-caption font-semibold tracking-wide text-label-2 uppercase">Level {i + 1}</p>
                <p className="text-headline leading-tight font-semibold">{lp.level.title}</p>
                <p className="text-footnote text-label-2 tabular">
                  {lp.complete ? "Complete" : `${lp.done}/${lp.total} tasks`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Kiri marks where you are, on the side away from the level label. */}
      {currentPoint && !progress.levels[progress.currentIndex].complete && (
        <div
          className="pointer-events-none absolute w-16"
          style={{
            left: labelSide(progress.currentIndex, currentPoint.x, width) === "left"
              ? Math.min(currentPoint.x + 34, width - 64)
              : Math.max(currentPoint.x - 34 - 64, 0),
            top: currentPoint.y - 50,
          }}
          aria-hidden
        >
          <Mascot mood="happy" pose="wave" />
        </div>
      )}

      {/* Finish: Aotearoa */}
      <div className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-teal-ink py-2 pr-4 pl-2.5 text-white shadow-card" style={{ left: end.x, top: end.y }}>
        <span className="grid size-7 place-items-center rounded-full bg-white text-teal-ink">
          <MapPin className="size-4" aria-hidden />
        </span>
        <span className="text-subhead font-semibold whitespace-nowrap">Aotearoa New Zealand</span>
        <Sparkle className="absolute -top-3 right-2 size-4 text-gold" />
      </div>
    </div>
  );
}

const QUICK = [
  { to: "/tools/scam-shield", title: "Scam Shield", desc: "Check an offer", tint: "coral" as const },
  { to: "/tools/money", title: "Money Planner", desc: "NZD ↔ rupees", tint: "gold" as const },
  { to: "/tools/english", title: "English Coach", desc: "Speaking practice", tint: "lavender" as const },
  { to: "/tools/cv", title: "CV Studio", desc: "NZ-style CV", tint: "pink" as const },
];

function QuickTools() {
  return (
    <section aria-labelledby="quick-tools" className="flex flex-col gap-3">
      <SectionHeader
        id="quick-tools"
        title="Tools for this step"
        action={
          <Link to="/tools" className="inline-flex min-h-11 items-center text-subhead font-semibold text-teal-ink">
            See all
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        {QUICK.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className={cn("group relative flex min-h-28 flex-col justify-between overflow-hidden rounded-tile p-4 transition-transform active:scale-[0.98]", TINT[q.tint].solid)}
          >
            <span className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.06]" aria-hidden />
            <span className="relative text-headline font-bold">{q.title}</span>
            <span className="relative flex items-center justify-between text-subhead opacity-80">
              {q.desc}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TimeAndMoney() {
  const now = useNow(30_000);
  const rate = useRate();
  const lead = aucklandLeadHours(now);
  return (
    <section aria-labelledby="time-money">
      <h2 id="time-money" className="sr-only">
        Time and exchange rate
      </h2>
      <Card className="grid grid-cols-2 divide-x divide-sep overflow-hidden">
        <div className="flex flex-col gap-1 p-4">
          <p className="text-footnote font-semibold tracking-wide text-label-2 uppercase">Colombo</p>
          <p className="text-title2 font-bold tabular">{timeIn(ZONES.colombo, now)}</p>
          <p className="text-footnote text-label-2">Auckland is {lead} h ahead</p>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <p className="text-footnote font-semibold tracking-wide text-label-2 uppercase">Auckland</p>
          <p className="text-title2 font-bold tabular">{timeIn(ZONES.auckland, now)}</p>
          <p className="text-footnote text-label-2 tabular">NZ$1 = Rs {rate.lkrPerNzd.toFixed(2)}</p>
        </div>
      </Card>
      <p className="mt-2 px-1 text-caption text-label-3">
        {rate.live ? "Live mid-market rate" : "Saved rate"} from {rate.asOf}. Banks and money transfer services add their own margin.
      </p>
    </section>
  );
}
