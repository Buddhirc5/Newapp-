import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { formatLkr, formatNumber } from "@/lib/format";
import { downloadCsv, fetchAnalytics, PATH_LABEL, SITUATION_LABEL, STAGE_LABEL, type Analytics } from "./api";
import { BarList, Insight, Kpi, LineChart, Panel, Pills, SegmentBar, toWeekly, type Row, type Series } from "./charts";

export const PROVIDER_LABEL: Record<string, string> = { google: "Google", email: "Email code", apple: "Apple" };
const SOURCE_LABEL: Record<string, string> = { facebook: "Facebook", whatsapp: "WhatsApp", google: "Google search", direct: "Direct / typed in", "Direct / unknown": "Before tracking", instagram: "Instagram", tiktok: "TikTok", share: "Shared page" };

const RANGES = [
  { value: "1", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "12 months" },
] as const;
export type Range = (typeof RANGES)[number]["value"];

/** Shared loader for the analytics-driven pages. */
export function useAnalytics(range: Range) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    fetchAnalytics(Number(range)).then(
      (d) => live && setData(d),
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [range]);
  return { data, error };
}

export function RangeBar({ range, setRange, grain, setGrain, children }: { range: Range; setRange: (r: Range) => void; grain?: "daily" | "weekly"; setGrain?: (g: "daily" | "weekly") => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pills label="Time range" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
      {grain && setGrain && (
        <Pills
          label="Chart grain"
          dark
          value={grain}
          onChange={setGrain}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
      )}
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export const Skeleton = ({ h = "h-40" }: { h?: string }) => <div className={`${h} animate-pulse rounded-card bg-fill-2`} />;

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];

const GROWTH: Series[] = [
  { key: "active", label: "Active members", slot: 1 },
  { key: "signups", label: "Sign-ups", slot: 2 },
  { key: "ai", label: "AI requests", slot: 3 },
  { key: "bookings", label: "Expert bookings", slot: 4 },
  { key: "messages", label: "Messages", slot: 5 },
];

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const [range, setRange] = useState<Range>("30");
  const [grain, setGrain] = useState<"daily" | "weekly">("daily");
  const { data, error } = useAnalytics(range);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const daily = data.daily.map((d) => ({ ...d, ai: d.ai_document + d.ai_cv + d.ai_sop + d.ai_journey }));
    return grain === "weekly" ? toWeekly(daily, GROWTH.map((s) => s.key)) : daily;
  }, [data, grain]);

  if (error) return <p className="rounded-card bg-coral-soft p-5 text-subhead text-coral-ink">{error}</p>;

  const k = data?.kpis;
  const b = data?.breakdown;
  const topStage = b && top(b.stage);
  const topPath = b && top(b.path);
  const attention = k ? k.open_reports + k.pending_providers + k.pending_agencies : 0;
  const fallbackRate = k && k.ai_requests ? Math.round((k.ai_fallback / (k.ai_requests + k.ai_batch)) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <RangeBar range={range} setRange={setRange}>
        <Button
          size="sm"
          variant="dark"
          disabled={!data}
          icon={<FileDown className="size-4" aria-hidden />}
          onClick={() => {
            if (!data) return;
            downloadCsv("kiwipath-daily", data.daily.map((d) => ({ ...d })));
            toast("Daily report downloaded");
          }}
        >
          Daily report (CSV)
        </Button>
      </RangeBar>

      {!k ? (
        <Skeleton h="h-32" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Members" value={formatNumber(k.members)} sub={`+${formatNumber(k.new_members)} in this range`} />
          <Kpi label="Active (7 days)" value={formatNumber(k.active_7d)} sub={`${pct(k.active_7d, k.members)}% of members`} tone="muted" />
          <Kpi label="Paying" value={formatNumber(k.paying)} sub={`${k.main} Main · ${k.ultra} Ultra`} />
          <Kpi label="Monthly revenue" value={formatLkr(k.mrr_lkr)} sub="MRR from active packages" tone="blue" />
          <Kpi label="AI requests" value={formatNumber(k.ai_requests)} sub={`${formatNumber(k.ai_users)} members used AI`} tone="pink" />
          <Kpi label="Needs attention" value={formatNumber(attention)} sub={`${k.open_reports} reports · ${k.pending_providers + k.pending_agencies} approvals`} tone={attention ? "gold" : "plain"} />
        </div>
      )}

      {k && b && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Insight label="Most members are" title={topStage ? STAGE_LABEL[topStage[0]] ?? topStage[0] : "—"} value={`${pct(topStage?.[1] ?? 0, k.members)}%`} sub={`${formatNumber(topStage?.[1] ?? 0)} members at this stage`} status="info" />
          <Insight label="Most popular path" title={topPath ? PATH_LABEL[topPath[0]] ?? topPath[0] : "—"} value={`${pct(topPath?.[1] ?? 0, k.members)}%`} sub="of members chose it" status="good" />
          <Insight label="Paid conversion" title="Members on Main or Ultra" value={`${pct(k.paying, k.members)}%`} sub={`${formatNumber(k.trial)} still on the free month`} status={pct(k.paying, k.members) >= 5 ? "good" : "warn"} />
          <Insight label="AI fallback rate" title="Answered by Sonnet" value={`${fallbackRate}%`} sub={fallbackRate > 15 ? "Higher than expected: check prompts and inputs" : "Low is good: Sonnet costs more"} status={fallbackRate > 15 ? "bad" : "good"} />
          <button type="button" onClick={() => go("community")} className="text-left">
            <Insight label="To review" title="Reports and approvals" value={formatNumber(attention)} sub="Open Community to review" status={attention ? "bad" : "good"} />
          </button>
        </div>
      )}

      <Panel
        title="Is KiwiPath growing?"
        sub="Activity per day in Sri Lanka time. Tap a chip to hide or show a line."
        actions={
          <Pills
            label="Chart grain"
            dark
            value={grain}
            onChange={setGrain}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
            ]}
          />
        }
      >
        {data ? <LineChart rows={rows} series={GROWTH} label="Daily activity" weekly={grain === "weekly"} height={300} /> : <Skeleton h="h-72" />}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Member funnel" sub="Where people drop off between signing up and paying.">
          {data ? (
            <ol className="flex flex-col gap-3">
              {data.funnel.map((f, i) => {
                const prev = i ? data.funnel[i - 1].n : f.n;
                return (
                  <li key={f.step}>
                    <div className="flex items-baseline justify-between text-subhead">
                      <span className="font-semibold">{f.step}</span>
                      <span className="tabular">
                        <b>{formatNumber(f.n)}</b>
                        {i > 0 && <span className="ml-2 text-footnote text-label-2">{pct(f.n, prev)}% of previous</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-fill">
                      <div className="h-full rounded-full" style={{ width: `${pct(f.n, data.funnel[0].n)}%`, background: "var(--series-1)", minWidth: f.n ? 4 : 0 }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Skeleton />
          )}
        </Panel>
        <Panel title="Packages" sub="Every member's current plan.">
          {k ? (
            <SegmentBar
              parts={[
                { label: "Ultra", value: k.ultra, slot: 1 },
                { label: "Main", value: k.main, slot: 2 },
                { label: "Free month", value: k.trial, slot: 3 },
                { label: "Free", value: k.free, slot: 4 },
              ]}
            />
          ) : (
            <Skeleton h="h-16" />
          )}
          {k && (
            <dl className="mt-1 grid grid-cols-3 gap-3 text-subhead">
              <div className="rounded-xl bg-fill px-3 py-2">
                <dt className="text-caption text-label-2">Revenue in range</dt>
                <dd className="font-bold tabular">{formatLkr(k.revenue_lkr)}</dd>
              </div>
              <div className="rounded-xl bg-fill px-3 py-2">
                <dt className="text-caption text-label-2">Lifetime revenue</dt>
                <dd className="font-bold tabular">{formatLkr(k.revenue_all_lkr)}</dd>
              </div>
              <div className="rounded-xl bg-fill px-3 py-2">
                <dt className="text-caption text-label-2">Expert fees</dt>
                <dd className="font-bold tabular">{formatLkr(k.platform_fees_lkr)}</dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Journey stage">
          {b ? <BarList items={Object.entries(STAGE_LABEL).map(([key, label]) => ({ label, value: b.stage[key] ?? 0 }))} /> : <Skeleton />}
        </Panel>
        <Panel title="Where members are">
          {b ? (
            <BarList items={Object.entries(b.situation).map(([key, v]) => ({ label: SITUATION_LABEL[key] ?? key, value: v })).sort((a, z) => z.value - a.value)} />
          ) : (
            <Skeleton />
          )}
        </Panel>
        <Panel title="Top cities">
          {b ? <BarList items={Object.entries(b.city).map(([label, value]) => ({ label, value })).sort((a, z) => z.value - a.value)} /> : <Skeleton />}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="How new members sign in" sub="Sign-ups in this range.">
          {b ? (
            <BarList
              items={Object.entries(b.provider ?? {})
                .map(([key, value]) => ({ label: PROVIDER_LABEL[key] ?? key, value }))
                .sort((a, z) => z.value - a.value)}
            />
          ) : (
            <Skeleton />
          )}
        </Panel>
        <Panel title="Where sign-ups come from" sub="First link they arrived from: utm_source, Facebook, WhatsApp, Google.">
          {b ? (
            Object.keys(b.source ?? {}).length ? (
              <BarList items={Object.entries(b.source ?? {}).map(([label, value]) => ({ label: SOURCE_LABEL[label] ?? label, value })).sort((a, z) => z.value - a.value)} />
            ) : (
              <p className="text-subhead text-label-2">No sign-ups with a source yet. New members are tracked from now on.</p>
            )
          ) : (
            <Skeleton />
          )}
        </Panel>
        <Panel title="Best posts and campaigns" sub="From utm_campaign in your links, e.g. group1.">
          {b ? (
            Object.keys(b.campaign ?? {}).length ? (
              <BarList items={Object.entries(b.campaign ?? {}).map(([label, value]) => ({ label, value })).sort((a, z) => z.value - a.value)} />
            ) : (
              <p className="text-subhead text-label-2">Add ?utm_campaign=group1 to your links to compare posts.</p>
            )
          ) : (
            <Skeleton />
          )}
        </Panel>
      </div>
    </div>
  );
}
