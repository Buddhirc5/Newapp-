import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/Controls";
import { formatLkr, formatNumber } from "@/lib/format";
import { forecast, monthsToTarget } from "@/logic/forecast";
import type { Analytics } from "./api";
import { Insight, LineChart, Panel, type Series } from "./charts";

const SERIES: Series[] = [
  { key: "base", label: "Expected", slot: 1 },
  { key: "high", label: "Good case", slot: 3 },
  { key: "low", label: "Slow case", slot: 2 },
];

/** 12-month revenue forecast from current members, signups, conversion and churn, with editable assumptions. */
export function Forecast({ k, days }: { k: Analytics["kpis"]; days: number }) {
  const arpu = k.paying ? k.mrr_lkr / k.paying : k.main_price;
  const monthlySignups = Math.round((k.new_members / Math.max(1, days)) * 30);
  // Paying share of members past their free month, a fair first guess at conversion.
  const pastTrial = Math.max(1, k.members - k.trial);
  const guessConv = Math.min(30, Math.max(2, Math.round((k.paying / pastTrial) * 100)));

  const [signups, setSignups] = useState(monthlySignups);
  const [conv, setConv] = useState(k.paying ? guessConv : 5);
  const [churn, setChurn] = useState(8);
  useEffect(() => setSignups(monthlySignups), [monthlySignups]);

  const { rows, base } = useMemo(() => {
    const run = (s: number, c: number, ch: number) => forecast({ paying: k.paying, arpu, signups: s, conversion: c / 100, churn: ch / 100 });
    const base = run(signups, conv, churn);
    const high = run(signups * 1.3, conv * 1.3, churn * 0.7);
    const low = run(signups * 0.7, conv * 0.7, churn * 1.3);
    return { base, rows: base.map((b, i) => ({ day: b.month, base: b.mrr, high: high[i].mrr, low: low[i].mrr })) };
  }, [k.paying, arpu, signups, conv, churn]);

  const yearRevenue = base.reduce((s, r) => s + r.revenue, 0);
  const target = 1_000_000;
  const toMillion = monthsToTarget(base, target);

  return (
    <Panel title="Revenue forecast" sub="Next 12 months of monthly revenue. Adjust the assumptions to see what moves it." className="lg:col-span-3">
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <LineChart rows={rows} series={SERIES} label="Forecast monthly revenue" format={(n) => formatNumber(n)} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Assumption label="New members a month" value={signups} min={0} max={Math.max(500, monthlySignups * 3)} step={5} text={formatNumber(signups)} onChange={setSignups} />
          <Assumption label="Start paying after the free month" value={conv} min={0} max={50} step={1} text={`${conv}%`} onChange={setConv} />
          <Assumption label="Paying members who stop each month" value={churn} min={0} max={40} step={1} text={`${churn}%`} onChange={setChurn} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Insight label="In 12 months" title="Monthly revenue" value={formatLkr(base[11]?.mrr ?? 0)} sub={`${formatNumber(base[11]?.paying ?? 0)} paying`} status="info" />
            <Insight label="Next 12 months" title="Total revenue" value={formatLkr(yearRevenue)} sub={`at ${formatLkr(arpu)} per payer`} status="good" />
          </div>
          <p className="text-footnote text-label-2">
            {toMillion ? `Reaches ${formatLkr(target)} a month in about ${toMillion} months.` : `Doesn't reach ${formatLkr(target)} a month within a year at these rates.`} Each 1% less churn
            keeps about {formatNumber(Math.round(k.paying * 0.01 * 12))} more members over a year.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function Assumption({ label, value, min, max, step, text, onChange }: { label: string; value: number; min: number; max: number; step: number; text: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-subhead font-semibold">{label}</span>
        <span className="text-subhead font-bold tabular">{text}</span>
      </div>
      <Slider label={label} value={value} min={min} max={max} step={step} valueText={text} onChange={onChange} />
    </div>
  );
}
