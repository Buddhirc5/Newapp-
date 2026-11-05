import { useEffect, useMemo, useRef, useState } from "react";
import { AiCoach } from "@/components/AiCoach";
import { InstallCard } from "@/components/InstallApp";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, Briefcase, CalendarRange, Check, ChevronRight, Files, Flame, Landmark, MapPin, Plane, Sparkles } from "lucide-react";
import { ICONS } from "@/components/icons";
import { Page } from "@/components/layout/Page";
import { Mascot, Sparkle } from "@/components/Mascot";
import { TaskSheet } from "@/components/TaskSheet";
import { TINT } from "@/components/tints";
import { Avatar, Card, PointsPill, ProgressDashes, ProgressRing, SectionHeader } from "@/components/ui/Bits";
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
        <div className="flex flex-col gap-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Link to="/me" aria-label="Your profile" className="shrink-0">
              <Avatar name={profile.name || "You"} size={44} tint="lavender" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-footnote font-semibold text-label-2">
                {t("greet")}
                {profile.name ? `, ${profile.name.split(" ")[0]}` : ""}
              </p>
              <h1 className="type-display text-title3 leading-tight sm:text-title1">{t("journey.title")}</h1>
            </div>
            <PointsPill points={points} />
          </div>

          <Link to={`/paths/${pathway.id}`} className="flex items-center gap-3 rounded-[1.4rem] bg-surface p-3 pr-4 shadow-card">
            <ProgressRing value={progress.percent / 100} size={48} stroke={5}>
              <span className="text-caption font-bold tabular">{progress.percent}%</span>
            </ProgressRing>
            <span className="min-w-0 flex-1">
              <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-caption font-bold", TINT[pathway.tint].solid)}>{pathway.short}</span>
              <span className="mt-1 flex items-center gap-3 text-footnote text-label-2">
                <span className="inline-flex items-center gap-1">
                  <Flame className="size-3.5 text-orange" aria-hidden />
                  {streak} day{streak === 1 ? "" : "s"} streak
                </span>
                <span className="tabular">
                  {progress.completeLevels}/{progress.levels.length} levels
                </span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-label-3" aria-hidden />
          </Link>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        {/* Next step */}
        <section aria-labelledby="next-step" className="relative">
          <div className="relative overflow-hidden rounded-[1.6rem] bg-gold p-4 text-ink sm:p-6">
            <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
            <Mascot pose="suitcase" mood="happy" className="pointer-events-none absolute -top-1 right-0 w-20 sm:w-28" />
            <div className="relative flex flex-col gap-2.5 pr-20 sm:pr-28">
              <p id="next-step" className="text-caption font-bold tracking-wide uppercase opacity-70">
                {t("journey.next")} · {currentLevel.level.title} · {progress.currentIndex + 1}/{progress.levels.length}
              </p>
              <ProgressDashes
                total={currentLevel.total}
                done={currentLevel.done}
                current={currentLevel.done}
                label={`${currentLevel.done} of ${currentLevel.total} tasks done in ${currentLevel.level.title}`}
                className="max-w-[12rem] [&>span]:bg-ink/15 [&>span.bg-teal]:bg-teal-ink [&>span.bg-malibu]:bg-white"
              />
            </div>
            {next ? (
              <div className="relative mt-3 flex flex-col gap-2">
                <h2 className="type-display pr-16 text-title3 leading-snug sm:pr-24 sm:text-title2">{next.task.title}</h2>
                <p className="line-clamp-2 max-w-[34rem] text-subhead opacity-80">{next.task.detail}</p>
                <div className="mt-1 flex gap-2">
                  <Button size="sm" variant="dark" className="shrink-0 whitespace-nowrap" icon={<Check className="size-4" aria-hidden />} onClick={() => completeTask(next.task)}>
                    Mark done
                  </Button>
                  {next.task.link &&
                    ("to" in next.task.link ? (
                      <ButtonLink size="sm" to={next.task.link.to} variant="light" className="min-w-0" iconAfter={<ArrowRight className="size-4 shrink-0" aria-hidden />}>
                        <span className="truncate">{next.task.link.label}</span>
                      </ButtonLink>
                    ) : (
                      <a
                        href={next.task.link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-full bg-white px-4 text-subhead font-semibold text-ink hover:bg-white/90"
                      >
                        <span className="truncate">{next.task.link.label}</span>
                        <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                      </a>
                    ))}
                </div>
              </div>
            ) : (
              <div className="relative mt-3">
                <h2 className="type-display text-title3">Every step done. Haere mai!</h2>
                <p className="mt-1 text-subhead opacity-80">"Haere mai" means welcome. Keep your records handy for your next visa.</p>
              </div>
            )}
          </div>
        </section>

        <QuickActions />

        <InstallCard />

        <AiCoach />

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

/** One-tap shortcuts to the tools people use most, sized for thumbs. */
function QuickActions() {
  const items = [
    { to: "/assistant", label: "Ask AI", icon: Sparkles, tint: "pink" as const },
    { to: "/tools/timeline", label: "Timeline", icon: CalendarRange, tint: "malibu" as const },
    { to: "/tools/documents", label: "Documents", icon: Files, tint: "green" as const },
    { to: "/tools/jobs", label: "Jobs", icon: Briefcase, tint: "lavender" as const },
    { to: "/tools/cost-of-living", label: "Costs", icon: Landmark, tint: "gold" as const },
  ];
  return (
    <nav aria-label="Shortcuts" className="-mx-4 sm:mx-0">
      <ul className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 sm:grid sm:grid-cols-5 sm:px-0">
        {items.map((it) => (
          <li key={it.to} className="shrink-0">
            <Link to={it.to} className="flex w-[4.6rem] flex-col items-center gap-1.5 sm:w-full">
              <span className={cn("grid size-14 place-items-center rounded-[1.1rem] shadow-card", TINT[it.tint].solid)}>
                <it.icon className="size-6" aria-hidden />
              </span>
              <span className="text-caption font-semibold">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
