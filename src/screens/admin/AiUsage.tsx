import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchSettings, type Setting } from "@/lib/community";
import { formatLkr, formatNumber } from "@/lib/format";
import { useRate } from "@/lib/rates";
import { AI_COST_USD, AI_KIND_LABEL, downloadCsv, PLAN_LABEL } from "./api";
import { BarList, Insight, Kpi, LineChart, Panel, Pills, SegmentBar, toWeekly, type Row, type Series } from "./charts";
import { RangeBar, Skeleton, useAnalytics, type Range } from "./Dashboard";

const KINDS: Series[] = [
  { key: "ai_document", label: "Document check", slot: 1 },
  { key: "ai_cv", label: "CV polish", slot: 2 },
  { key: "ai_sop", label: "SOP draft", slot: 3 },
  { key: "ai_journey", label: "Journey coach", slot: 4 },
  { key: "ai_batch", label: "Nightly review", slot: 5 },
];

export function AiUsage({ go }: { go: (tab: string) => void }) {
  const [range, setRange] = useState<Range>("30");
  const [grain, setGrain] = useState<"daily" | "weekly">("daily");
  const { data, error } = useAnalytics(range);
  const [settings, setSettings] = useState<Setting[]>([]);
  const rate = useRate();
  useEffect(() => {
    fetchSettings().then(setSettings, () => undefined);
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    return grain === "weekly" ? toWeekly(data.daily, KINDS.map((s) => s.key)) : data.daily;
  }, [data, grain]);

  if (error) return <p className="rounded-card bg-coral-soft p-5 text-subhead text-coral-ink">{error}</p>;
  const k = data?.kpis;
  const models = data?.breakdown.ai_model ?? {};
  const sonnet = Object.entries(models).filter(([m]) => m.includes("sonnet")).reduce((a, [, n]) => a + n, 0);
  const haiku = Object.entries(models).filter(([m]) => m.includes("haiku")).reduce((a, [, n]) => a + n, 0);
  const batchUses = k?.ai_batch ?? 0;
  const liveHaiku = Math.max(0, haiku - batchUses);
  const costUsd = liveHaiku * AI_COST_USD.haiku + sonnet * AI_COST_USD.sonnet + batchUses * AI_COST_USD.batch;
  // Approximate when the live feed has no US dollar rate.
  const costLkr = costUsd * (rate.lkrPerUsd ?? 300);
  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const enabled = setting("ai_enabled") === true;
  const total = (k?.ai_requests ?? 0) + batchUses;
  const fallbackRate = total ? Math.round((sonnet / total) * 100) : 0;
  const perPaying = k && k.paying ? costLkr / k.paying : 0;

  return (
    <div className="flex flex-col gap-5">
      <RangeBar range={range} setRange={setRange}>
        <Button
          size="sm"
          variant="dark"
          disabled={!data}
          icon={<FileDown className="size-4" aria-hidden />}
          onClick={() =>
            data &&
            downloadCsv(
              "kiwipath-ai-usage",
              data.daily.map((d) => ({ day: d.day, document: d.ai_document, cv: d.ai_cv, sop: d.ai_sop, journey: d.ai_journey, nightly: d.ai_batch, sonnet_fallback: d.ai_fallback })),
            )
          }
        >
          AI usage (CSV)
        </Button>
      </RangeBar>

      {!enabled && settings.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border-l-4 border-gold bg-surface p-4 shadow-card">
          <p className="min-w-0 flex-1 text-subhead">
            <b>AI is switched off.</b> Add the ANTHROPIC_API_KEY secret in Supabase, then turn on AI in Settings.
          </p>
          <Button size="sm" variant="tinted" onClick={() => go("settings")}>
            Open Settings
          </Button>
        </div>
      )}

      {!k ? (
        <Skeleton h="h-32" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="AI requests" value={formatNumber(k.ai_requests)} sub="members, in range" />
          <Kpi label="Nightly reviews" value={formatNumber(batchUses)} sub="batch, half price" tone="muted" />
          <Kpi label="Members using AI" value={formatNumber(k.ai_users)} sub={`of ${formatNumber(k.members)} members`} />
          <Kpi label="Sonnet fallback" value={`${fallbackRate}%`} sub={`${formatNumber(sonnet)} of ${formatNumber(total)} uses`} tone={fallbackRate > 15 ? "pink" : "green"} />
          <Kpi label="Est. AI cost" value={`US$${costUsd.toFixed(2)}`} sub={`≈ ${formatLkr(costLkr)}`} tone="blue" />
          <Kpi label="Cost per paying member" value={formatLkr(perPaying)} sub={k.paying ? `vs ${formatLkr(k.main_price)} Main price` : "No paying members yet"} tone="gold" />
        </div>
      )}

      <Panel
        title="AI requests by feature"
        sub="Successful requests only. Failed requests are refunded and not counted."
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
        {data ? <LineChart rows={rows} series={KINDS} label="AI requests per day by feature" weekly={grain === "weekly"} height={300} /> : <Skeleton h="h-72" />}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Which model answered" sub="Haiku 5.5 runs first at low effort; Sonnet 5.5 only steps in when Haiku can't.">
          {data ? (
            <>
              <SegmentBar
                parts={[
                  { label: "Haiku 5.5", value: haiku, slot: 1 },
                  { label: "Sonnet 5.5 (fallback)", value: sonnet, slot: 2 },
                ]}
              />
              {k && k.ai_requests > 0 && (
                <Insight
                  label="Fallback health"
                  title={fallbackRate > 15 ? "More fallbacks than expected" : "Haiku is handling almost everything"}
                  value={`${fallbackRate}%`}
                  sub={fallbackRate > 15 ? "Often caused by blurry document photos" : "Target: under 15%"}
                  status={fallbackRate > 15 ? "bad" : "good"}
                />
              )}
            </>
          ) : (
            <Skeleton />
          )}
        </Panel>
        <Panel title="By feature" sub="In this range.">
          {data ? <BarList items={Object.entries(data.breakdown.ai_kind).map(([key, value]) => ({ label: AI_KIND_LABEL[key] ?? key, value })).sort((a, z) => z.value - a.value)} /> : <Skeleton />}
        </Panel>
        <Panel title="Daily limits" sub="AI requests each member can make per day.">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Free month", "ai_daily_limit_trial"],
              ["Main", "ai_daily_limit_pro"],
              ["Ultra", "ai_daily_limit_ultra"],
            ].map(([label, key]) => (
              <div key={key} className="rounded-xl bg-fill px-2 py-3">
                <dt className="text-caption text-label-2">{label}</dt>
                <dd className="type-display text-title2 tabular">{String(setting(key) ?? "—")}</dd>
              </div>
            ))}
          </dl>
          <Button size="sm" variant="tinted" onClick={() => go("settings")}>
            Change limits
          </Button>
          <p className="text-footnote text-label-2">Cost estimates assume about US$0.002 per Haiku request, US$0.04 per Sonnet request and US$0.001 per nightly review. Your Anthropic console shows the exact bill.</p>
        </Panel>
      </div>

      <Panel title="Top AI users" sub="Members who used AI the most in this range.">
        {!data ? (
          <Skeleton />
        ) : data.top_ai_users.length === 0 ? (
          <p className="text-subhead text-label-2">No AI requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-subhead">
              <thead className="text-caption font-bold tracking-wide text-label-2 uppercase">
                <tr>
                  <th className="py-2 pr-3">Member</th>
                  <th className="px-3 py-2">Package</th>
                  <th className="px-3 py-2 text-right">Requests</th>
                  <th className="py-2 pl-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.top_ai_users.map((u) => (
                  <tr key={u.id} className="border-t border-sep">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-footnote text-label-2">{u.email ?? "no email"}</p>
                    </td>
                    <td className="px-3 py-2.5">{PLAN_LABEL[u.plan] ?? u.plan}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular">{formatNumber(u.uses)}</td>
                    <td className="py-2.5 pl-3 text-right text-label-2 tabular">{k && k.ai_requests ? Math.round((u.uses / k.ai_requests) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
