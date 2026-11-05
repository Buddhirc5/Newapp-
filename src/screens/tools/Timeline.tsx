import { useMemo } from "react";
import { Link } from "react-router";
import { CalendarDays, Check, ChevronRight, Plane } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Notice } from "@/components/ui/Bits";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { buildTimeline, earliestArrival, monthStart, toMonth, weeksLeft } from "@/logic/timeline";
import { useApp } from "@/store/app";

const STATE = {
  done: { label: "Done", dot: "bg-teal text-white", chip: "bg-green-soft text-green-ink" },
  now: { label: "Now", dot: "bg-pink text-ink", chip: "bg-pink/25 text-label" },
  late: { label: "Behind", dot: "bg-coral text-white", chip: "bg-coral-soft text-coral-ink" },
  upcoming: { label: "Later", dot: "bg-fill-3 text-label-2", chip: "bg-fill text-label-2" },
};

const MONTHS_BY_TIMELINE = { "6m": 6, "12m": 12, "24m": 24, exploring: 18 } as const;
const fmt = (d: Date) => d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

/** A dated plan from today to arrival, built from the member's pathway and progress. */
export function Timeline() {
  const pathId = useApp((s) => s.pathId);
  const tasks = useApp((s) => s.tasks);
  const profile = useApp((s) => s.profile);
  const saved = useApp((s) => s.targetMonth);
  const setTarget = useApp((s) => s.setTargetMonth);
  const pathway = usePathways()[pathId];

  const earliest = earliestArrival(pathway, tasks);
  const suggested = toMonth(new Date(new Date().getFullYear(), new Date().getMonth() + MONTHS_BY_TIMELINE[profile.timeline], 1));
  const target = saved ?? (suggested > earliest ? suggested : earliest);
  const stages = useMemo(() => buildTimeline(pathway, tasks, target), [pathway, tasks, target]);
  const tooSoon = target < earliest;
  const late = stages.filter((s) => s.state === "late").length;
  const current = stages.find((s) => s.state === "now" || s.state === "late");
  const arrive = monthStart(target);
  const monthsAway = Math.max(0, (arrive.getFullYear() - new Date().getFullYear()) * 12 + arrive.getMonth() - new Date().getMonth());

  return (
    <Page title="My timeline" back={{ to: "/tools", label: "Tools" }} lead={`A dated plan for the ${pathway.name.toLowerCase()} path, worked back from when you want to land.`}>
      <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-night p-5 text-paper">
          <p className="text-footnote font-semibold tracking-wide text-paper/60 uppercase">Target arrival</p>
          <p className="type-display mt-1 flex items-center gap-2 text-[clamp(1.8rem,7vw,2.4rem)] leading-none">
            <Plane className="size-7 text-gold" aria-hidden />
            {arrive.toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}
          </p>
          <p className="mt-2 text-callout text-paper/75">
            {monthsAway} months away · about {weeksLeft(pathway, tasks)} weeks of steps left
          </p>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-footnote font-semibold text-paper/70">Change month</span>
            <input
              type="month"
              value={target}
              min={toMonth(new Date())}
              onChange={(e) => e.target.value && setTarget(e.target.value)}
              className="min-h-11 rounded-xl bg-paper/10 px-3 text-callout text-paper outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-gold"
            />
          </label>
        </section>

        {tooSoon ? (
          <Notice tone="warn" title="That's tight">
            If you start the remaining steps today, {monthStart(earliest).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })} is a more realistic arrival. Some steps can overlap, but
            visa processing and English test results take the time they take.
          </Notice>
        ) : late > 0 ? (
          <Notice tone="warn" title={`${late} ${late === 1 ? "stage is" : "stages are"} behind`}>
            Catch up on the red stages first, or move your arrival month a little later.
          </Notice>
        ) : (
          <Notice tone="good" title="On track">
            Keep going with {current ? `“${current.level.title}”` : "the next stage"}. Each finished step moves the plan forward.
          </Notice>
        )}

        <ol className="relative flex flex-col gap-3 pl-2" aria-label="Stages">
          <span className="absolute top-4 bottom-4 left-[1.45rem] w-0.5 bg-fill-3" aria-hidden />
          {stages.map((s, i) => {
            const st = STATE[s.state];
            const next = s.level.tasks.find((t) => !tasks[t.id]);
            return (
              <li key={s.level.id} className="relative flex gap-3">
                <span className={cn("relative z-10 mt-4 grid size-8 shrink-0 place-items-center rounded-full text-footnote font-bold", st.dot)} aria-hidden>
                  {s.state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <Card className={cn("min-w-0 flex-1 p-4", (s.state === "now" || s.state === "late") && "ring-2 ring-pink")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-headline font-semibold">{s.level.title}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold", st.chip)}>{st.label}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-footnote text-label-2 tabular">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {fmt(s.start)} – {fmt(s.end)} · {s.weeks} weeks
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill">
                      <span className="block h-full rounded-full bg-teal" style={{ width: `${(s.done / Math.max(1, s.total)) * 100}%` }} />
                    </span>
                    <span className="text-caption font-semibold text-label-2 tabular">
                      {s.done}/{s.total}
                    </span>
                  </div>
                  {next && s.state !== "upcoming" && (
                    <Link to="/" className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-fill px-3 py-2.5 text-subhead">
                      <span className="min-w-0 truncate">
                        Next: <b>{next.title}</b>
                      </span>
                      <ChevronRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>

        <Notice title="How dates are worked out">
          Each stage gets a typical number of weeks and they're planned one after another, ending the month you want to land. Real times vary: check current
          processing times on immigration.govt.nz.
        </Notice>
      </div>
    </Page>
  );
}
