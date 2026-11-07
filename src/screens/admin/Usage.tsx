import { useEffect, useMemo, useState } from "react";
import { FileDown, Search, ThumbsDown, ThumbsUp, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatNumber, relativeDay } from "@/lib/format";
import { useOnlineCount } from "@/lib/presence";
import { downloadCsv, fetchQuestions, fetchUsage, type AiQuestion, type UsageReport } from "./api";
import { BarList, Kpi, Panel, Pills } from "./charts";
import { RangeBar, Skeleton, type Range } from "./Dashboard";

const SCREEN_LABEL: Record<string, string> = {
  "/": "Journey home",
  "/tools": "Tools",
  "/board": "Board",
  "/community": "Community",
  "/me": "Me",
  "/assistant": "Ask KiwiPath (full screen)",
  "/paths": "Visa paths",
  "/guides": "Guides",
  "/experts": "Experts",
  "/agencies": "Agencies",
  "/chats": "Messages",
  "/groups": "Groups",
  "/tools/scam-shield": "Scam Shield",
  "/tools/money": "Money Planner",
  "/tools/english": "English Coach",
  "/tools/cv": "CV Studio",
  "/tools/quiz": "Kiwi Life quiz",
  "/tools/courses": "Course shortlist",
  "/tools/documents": "Visa documents",
  "/tools/occupations": "Occupation check",
  "/tools/sop": "SOP Builder",
  "/tools/savings": "Loan & savings",
  "/tools/doc-check": "AI Document Check",
  "/tools/timeline": "My Timeline",
  "/tools/jobs": "Jobs",
  "/tools/cost-of-living": "Cost of living",
};
const ACTION_LABEL: Record<string, string> = {
  "ai:chat": "Asked the AI assistant",
  "ai:action": "Applied an AI set-up suggestion",
  "ai:rate": "Rated an AI answer",
  "install:tap": "Tapped Install KiwiPath",
  "upgrade:open": "Opened packages",
  "checkout:start": "Started a payment",
};
const STEP_LABEL: Record<string, string> = {
  situation: "Where are you now",
  path: "Which way to come",
  stage: "How far along",
  "nz-stage": "Time in NZ",
  city: "Which city",
  interests: "What would help",
  name: "Display name",
  done: "Finished setup",
};

const pretty = (screen: string) => SCREEN_LABEL[screen] ?? screen;

/** What members actually use: screens, actions, onboarding drop-off, AI questions, and who's online now. */
export function Usage() {
  const [range, setRange] = useState<Range>("30");
  const [data, setData] = useState<UsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AiQuestion[] | null>(null);
  const online = useOnlineCount();

  useEffect(() => {
    setData(null);
    setError(null);
    fetchUsage(Number(range)).then(setData, (e: Error) => setError(e.message));
    fetchQuestions(Number(range)).then(setQuestions, () => setQuestions([]));
  }, [range]);

  // Onboarding: each step's count, ordered as the questions appear, with the drop from the step before.
  const funnel = useMemo(() => {
    const rows = (data?.onboarding ?? []).map((o) => {
      const [, num = "99", key = o.step] = o.step.match(/^(\d+)-(.+)$/) ?? [];
      return { order: o.step === "done" ? 999 : Number(num), key: o.step === "done" ? "done" : key, members: o.members };
    });
    // Merge the same question appearing at different positions (paths differ slightly).
    const byKey = new Map<string, { order: number; key: string; members: number }>();
    for (const r of rows) {
      const cur = byKey.get(r.key);
      if (!cur) byKey.set(r.key, { ...r });
      else byKey.set(r.key, { order: Math.min(cur.order, r.order), key: r.key, members: cur.members + r.members });
    }
    return [...byKey.values()].sort((a, b) => a.order - b.order);
  }, [data]);

  return (
    <div className="flex flex-col gap-5">
      <RangeBar range={range} setRange={setRange} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Online now"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-green" />
              </span>
              {formatNumber(online.total)}
            </span>
          }
          sub={
            Object.entries(online.byScreen)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([k, v]) => `${v} ${k}`)
              .join(" · ") || "members with the app open"
          }
          tone="green"
        />
        <Kpi label="AI questions" value={data ? formatNumber(data.questions.total) : "…"} sub={data ? `${data.questions.with_actions} led to a set-up suggestion` : ""} tone="pink" />
        <Kpi label="Helpful answers" value={data ? formatNumber(data.questions.helpful) : "…"} sub={data ? `${data.questions.not_helpful} marked not helpful` : ""} tone="blue" />
        <Kpi
          label="Finished setup"
          value={funnel.length ? `${Math.round(((funnel.find((f) => f.key === "done")?.members ?? 0) / Math.max(1, funnel[0]?.members ?? 1)) * 100)}%` : "…"}
          sub="of members who started it"
          tone="gold"
        />
      </div>

      {error && <p className="rounded-card bg-coral-soft p-5 text-subhead text-coral-ink">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Most-used screens" sub="Members who opened each screen, and total views.">
          {data ? (
            <BarList items={data.screens.slice(0, 15).map((s) => ({ label: pretty(s.screen), value: s.members, sub: `${formatNumber(s.views)} views` }))} />
          ) : (
            <Skeleton h="h-72" />
          )}
        </Panel>
        <Panel title="Onboarding drop-off" sub="Members who reached each setup question. A big drop means that question needs work.">
          {data ? (
            funnel.length ? (
              <ol className="flex flex-col gap-2.5">
                {funnel.map((f, i) => {
                  const first = funnel[0].members || 1;
                  const prev = i ? funnel[i - 1].members : f.members;
                  const drop = prev ? Math.round(((prev - f.members) / prev) * 100) : 0;
                  return (
                    <li key={f.key} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-3 text-subhead">
                        <span className="font-medium">
                          {i + 1}. {STEP_LABEL[f.key] ?? f.key}
                        </span>
                        <span className="shrink-0 font-semibold tabular">
                          {f.members}
                          {i > 0 && drop > 0 && <span className={cn("ml-1.5 text-footnote font-semibold", drop >= 25 ? "text-coral-ink" : "text-label-2")}>−{drop}%</span>}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-fill">
                        <div className={cn("h-full rounded-full", f.key === "done" ? "bg-green" : "bg-malibu")} style={{ width: `${(f.members / first) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-subhead text-label-2">No new sign-ups since tracking started.</p>
            )
          ) : (
            <Skeleton h="h-72" />
          )}
        </Panel>
        <Panel title="Key actions" sub="Things members did, beyond opening screens.">
          {data ? (
            <BarList
              items={data.actions.slice(0, 12).map((a) => ({ label: `${ACTION_LABEL[a.action] ?? a.action}${a.detail ? ` (${a.detail})` : ""}`, value: a.times, sub: `${a.members} members` }))}
            />
          ) : (
            <Skeleton />
          )}
        </Panel>
        <Panel title="Daily active members" sub="Members who used the app each day.">
          {data ? <BarList slot={3} items={data.daily_active.slice(-14).map((d) => ({ label: new Date(`${d.day}T00:00:00`).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }), value: d.members }))} /> : <Skeleton />}
        </Panel>
      </div>

      <QuestionList questions={questions} />
    </div>
  );
}

function QuestionList({ questions }: { questions: AiQuestion[] | null }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "down" | "up" | "unrated">("all");
  const [open, setOpen] = useState<number | null>(null);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (questions ?? [])
      .filter((x) => (filter === "all" ? true : filter === "up" ? x.helpful === true : filter === "down" ? x.helpful === false : x.helpful === null))
      .filter((x) => !term || x.question.toLowerCase().includes(term) || x.answer.toLowerCase().includes(term));
  }, [questions, q, filter]);

  return (
    <Panel
      title="Questions members ask the AI"
      sub="Use these to improve answers and decide what guides or tools to build next. Emails and phone numbers are removed."
      actions={
        <Button
          size="sm"
          variant="tinted"
          disabled={!shown.length}
          icon={<FileDown className="size-4" aria-hidden />}
          onClick={() => downloadCsv("kiwipath-ai-questions", shown.map((x) => ({ when: x.created_at, question: x.question, answer: x.answer, helpful: x.helpful === null ? "" : x.helpful ? "yes" : "no", suggestions: x.actions, model: x.model })))}
        >
          Export
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-fill px-3">
            <Search className="size-4 text-label-2" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions or answers" className="min-w-0 flex-1 bg-transparent text-callout outline-none" aria-label="Search questions" />
          </label>
          <Pills
            label="Rating"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "down", label: "👎 Not helpful" },
              { value: "up", label: "👍 Helpful" },
              { value: "unrated", label: "Unrated" },
            ]}
          />
        </div>
        {!questions ? (
          <Skeleton />
        ) : !shown.length ? (
          <p className="py-6 text-center text-subhead text-label-2">No questions yet in this range.</p>
        ) : (
          <ul className="flex max-h-[40rem] flex-col divide-y divide-sep overflow-auto">
            {shown.map((x) => (
              <li key={x.id} className="py-3">
                <button type="button" className="flex w-full gap-3 text-left" aria-expanded={open === x.id} onClick={() => setOpen(open === x.id ? null : x.id)}>
                  <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", x.helpful === true ? "bg-green-soft text-green-ink" : x.helpful === false ? "bg-coral-soft text-coral-ink" : "bg-fill text-label-3")}>
                    {x.helpful === false ? <ThumbsDown className="size-4" aria-hidden /> : <ThumbsUp className="size-4" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-callout font-semibold break-words">{x.question}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-label-3">
                      {relativeDay(x.created_at)}
                      {x.actions > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Wand2 className="size-3" aria-hidden /> {x.actions} suggestion{x.actions === 1 ? "" : "s"}
                        </span>
                      )}
                      {x.model?.includes("sonnet") && <span>answered by Sonnet</span>}
                    </span>
                  </span>
                </button>
                {open === x.id && <p className="mt-2 ml-11 rounded-xl bg-fill p-3 text-subhead whitespace-pre-wrap text-label-2">{x.answer}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
