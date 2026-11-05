import { useMemo, useState } from "react";
import { ArrowUpRight, Info, PiggyBank, RotateCcw } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Meter, SectionHeader } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, Select, Stepper, Switch } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { CITIES } from "@/data/places";
import { SOURCES } from "@/data/pathways";
import { cn } from "@/lib/cn";
import { formatLkr, formatNumber, formatNzd, lkrSpoken } from "@/lib/format";
import { useRate } from "@/lib/rates";
import { computeTotals, monthsToGoal, type MoneyLine } from "@/logic/money";
import { useApp } from "@/store/app";
import type { MoneyItem } from "@/types";

const GROUPS: { id: MoneyItem["group"]; label: string; color: string; swatch: string }[] = [
  { id: "before", label: "Before you fly", color: "var(--chart-1)", swatch: "bg-chart-1" },
  { id: "study", label: "Study costs", color: "var(--chart-2)", swatch: "bg-chart-2" },
  { id: "arrival", label: "On arrival", color: "var(--chart-3)", swatch: "bg-chart-3" },
];

export function MoneyPlanner() {
  const plan = useApp((s) => s.money);
  const setMoney = useApp((s) => s.setMoney);
  const savings = useApp((s) => s.savings);
  const setSavings = useApp((s) => s.setSavings);
  const toggleTask = useApp((s) => s.toggleTask);
  const pathId = useApp((s) => s.pathId);
  const rate = useRate();
  const totals = useMemo(() => computeTotals(plan, rate.lkrPerNzd), [plan, rate.lkrPerNzd]);
  const groups = GROUPS.filter((g) => totals.groups[g.id].nzd > 0);

  const setOverride = (id: string, value: number | undefined) => {
    const overrides = { ...plan.overrides };
    if (value === undefined) delete overrides[id];
    else overrides[id] = value;
    setMoney({ overrides });
  };
  const toggleIncluded = (id: string, include: boolean) => {
    setMoney({ excluded: include ? plan.excluded.filter((x) => x !== id) : [...plan.excluded, id] });
  };

  return (
    <Page title="Money Planner" back={{ to: "/tools", label: "Tools" }} lead="Estimate what the move costs, in New Zealand dollars and rupees. Every figure is an editable estimate.">
      <div className="flex flex-col gap-7">
        {/* Headline */}
        <section aria-labelledby="total" className="relative overflow-hidden rounded-[2rem] bg-night p-5 text-paper sm:p-6">
          <p id="total" className="text-footnote font-semibold tracking-wide text-paper/60 uppercase">
            Estimated total to move
          </p>
          <p className="type-display mt-2 text-[clamp(2.1rem,9vw,3rem)] leading-none tabular">{formatLkr(totals.totalLkr)}</p>
          <p className="mt-2 text-callout text-paper/75 tabular">
            {lkrSpoken(totals.totalLkr)} · {formatNzd(totals.totalNzd)}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-paper/10 px-3 py-1.5 text-footnote text-paper/80 tabular">
            <span className={cn("size-2 rounded-full", rate.live ? "bg-green" : "bg-gold")} aria-hidden />
            NZ$1 = Rs {rate.lkrPerNzd.toFixed(2)} · {rate.live ? "live" : "saved"} rate, {rate.asOf}
          </p>
        </section>

        {/* Inputs */}
        <section aria-label="Your situation" className="flex flex-col gap-4">
          <SegmentedControl
            label="Path"
            value={plan.path}
            onChange={(path) => setMoney({ path })}
            options={[
              { value: "student", label: "Student" },
              { value: "worker", label: "Worker" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="City" value={plan.city} onChange={(e) => setMoney({ city: e.target.value as typeof plan.city })}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.maori})
                </option>
              ))}
            </Select>
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-subhead font-semibold">Who's moving</span>
              <SegmentedControl
                label="Who's moving"
                value={plan.household}
                onChange={(household) => setMoney({ household })}
                options={[
                  { value: "single", label: "Just me" },
                  { value: "couple", label: "Couple" },
                  { value: "family", label: "Family" },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-subhead font-semibold">Housing</span>
            <SegmentedControl
              label="Housing"
              value={plan.housing}
              onChange={(housing) => setMoney({ housing })}
              options={[
                { value: "room", label: "Room" },
                { value: "one-bed", label: "1 bedroom" },
                { value: "two-bed", label: "2 bedrooms" },
              ]}
            />
          </div>
          {plan.path === "worker" && (
            <div className="flex items-center justify-between gap-3 rounded-tile bg-surface px-4 py-3 shadow-card">
              <div>
                <p className="text-body font-semibold">Weeks until first pay</p>
                <p className="text-footnote text-label-2">Living costs and rent while you wait</p>
              </div>
              <Stepper label="weeks until first pay" value={plan.bufferWeeks} min={1} max={12} onChange={(bufferWeeks) => setMoney({ bufferWeeks })} />
            </div>
          )}
        </section>

        {/* Breakdown chart */}
        <section aria-labelledby="breakdown" className="flex flex-col gap-3">
          <SectionHeader id="breakdown" title="Where the money goes" />
          <Card className="p-5">
            <StackedBar groups={groups.map((g) => ({ ...g, nzd: totals.groups[g.id].nzd }))} total={totals.totalNzd} />
            <table className="mt-4 w-full text-left text-subhead">
              <caption className="sr-only">Cost by stage</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} className="border-t border-sep first:border-t-0">
                    <th scope="row" className="py-2.5 font-medium">
                      <span className="flex items-center gap-2.5">
                        <span className={cn("size-3 shrink-0 rounded-[3px]", g.swatch)} aria-hidden />
                        {g.label}
                      </span>
                    </th>
                    <td className="py-2.5 text-right whitespace-nowrap tabular">
                      <span className="block font-semibold">{formatLkr(totals.groups[g.id].lkr)}</span>
                      <span className="block text-footnote text-label-2">{formatNzd(totals.groups[g.id].nzd)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* Line items */}
        {GROUPS.map((g) => {
          // Lines that don't apply (a zero estimate nobody edited) are hidden rather than shown switched off.
          const lines = totals.lines.filter((l) => l.group === g.id && (l.amount > 0 || l.edited));
          if (!lines.length) return null;
          return (
            <section key={g.id} aria-labelledby={`group-${g.id}`} className="flex flex-col gap-1.5">
              <h3 id={`group-${g.id}`} className="flex items-center gap-2 px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">
                <span className={cn("size-2.5 rounded-[3px]", g.swatch)} aria-hidden />
                {g.label}
              </h3>
              <ul className="overflow-hidden rounded-tile bg-surface shadow-card">
                {lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    rate={rate.lkrPerNzd}
                    onAmount={(v) => setOverride(line.id, v)}
                    onReset={() => setOverride(line.id, undefined)}
                    onInclude={(inc) => toggleIncluded(line.id, inc)}
                  />
                ))}
              </ul>
            </section>
          );
        })}

        <SavingsJar
          totalLkr={totals.totalLkr}
          saved={savings.savedLkr}
          monthly={savings.monthlyLkr}
          onChange={setSavings}
          onSave={() => {
            setSavings({ goalSet: true });
            toggleTask("common.budget", true);
            if (pathId === "student") toggleTask("student.money.goal", true);
            toast("Savings goal saved");
          }}
        />

        <p className="px-1 text-footnote text-label-2">
          Figures are estimates for planning, not quotes. Check visa fees with the fee finder on{" "}
          <a href={SOURCES.inz.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-teal-ink">
            immigration.govt.nz <ArrowUpRight className="size-3.5" aria-hidden />
          </a>{" "}
          and rents on Tenancy Services' market rent data.
        </p>
      </div>
    </Page>
  );
}

function StackedBar({ groups, total }: { groups: { id: string; label: string; color: string; nzd: number }[]; total: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const active = groups.find((g) => g.id === hover);
  return (
    <div className="relative">
      <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={groups.map((g) => `${g.label} ${Math.round((g.nzd / total) * 100)}%`).join(", ")}>
        {groups.map((g, i) => (
          <button
            key={g.id}
            type="button"
            className={cn(
              "h-full min-w-[6px] transition-opacity focus-visible:outline-offset-2",
              i === 0 && "rounded-l-[6px]",
              i === groups.length - 1 && "rounded-r-[6px]",
              hover && hover !== g.id && "opacity-50",
            )}
            style={{ width: `${(g.nzd / total) * 100}%`, background: g.color }}
            onMouseEnter={() => setHover(g.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(g.id)}
            onBlur={() => setHover(null)}
            aria-label={`${g.label}: ${formatNzd(g.nzd)}, ${Math.round((g.nzd / total) * 100)}% of the total`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-caption text-label-2 tabular" aria-hidden>
        <span>0%</span>
        <span>100%</span>
      </div>
      {active && (
        <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 rounded-xl bg-night px-3 py-1.5 text-footnote whitespace-nowrap text-paper shadow-float" role="tooltip">
          <span className="font-semibold">{active.label}</span> · {formatNzd(active.nzd)} · {Math.round((active.nzd / total) * 100)}%
        </div>
      )}
    </div>
  );
}

function LineRow({ line, rate, onAmount, onReset, onInclude }: { line: MoneyLine; rate: number; onAmount: (v: number) => void; onReset: () => void; onInclude: (v: boolean) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const other = line.currency === "NZD" ? formatLkr(line.amount * rate) : formatNzd(line.amount / rate);
  return (
    <li className="group">
      <div className="flex flex-col gap-2 border-b border-sep px-4 py-3 group-last:border-b-0">
        <div className="flex items-start gap-3">
          <div className={cn("min-w-0 flex-1", !line.included && "opacity-50")}>
            <p className="text-body">{line.label}</p>
            {line.note && (
              <p className="mt-0.5 flex gap-1 text-footnote text-label-2">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {line.note}
              </p>
            )}
          </div>
          <Switch checked={line.included} onChange={onInclude} label={`Include ${line.label}`} />
        </div>
        <div className={cn("flex items-center gap-3", !line.included && "opacity-50")}>
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[0.8rem] bg-fill px-3 focus-within:ring-2 focus-within:ring-teal-ink/60">
            <span className="text-subhead font-semibold text-label-2">{line.currency === "NZD" ? "NZ$" : "Rs"}</span>
            <input
              inputMode="numeric"
              aria-label={`${line.label} amount in ${line.currency === "NZD" ? "NZ dollars" : "rupees"}`}
              className="min-w-0 flex-1 bg-transparent text-body font-semibold outline-none tabular"
              value={draft ?? formatNumber(line.amount)}
              onFocus={() => setDraft(String(line.amount))}
              onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
              onBlur={() => {
                if (draft !== null && draft !== "") onAmount(Number(draft));
                setDraft(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              disabled={!line.included}
            />
          </label>
          <span className="max-w-[45%] shrink-0 text-right text-footnote text-label-2 tabular">≈ {other}</span>
          {line.edited && (
            <button type="button" onClick={onReset} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-fill" aria-label={`Reset ${line.label} to the estimate`}>
              <RotateCcw className="size-4 text-label-2" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function SavingsJar({ totalLkr, saved, monthly, onChange, onSave }: { totalLkr: number; saved: number; monthly: number; onChange: (p: { savedLkr?: number; monthlyLkr?: number }) => void; onSave: () => void }) {
  const share = totalLkr > 0 ? Math.min(1, saved / totalLkr) : 0;
  const gap = Math.max(0, totalLkr - saved);
  const months = monthsToGoal(gap, monthly);
  const eta = months !== null && months > 0 ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : null;

  return (
    <section aria-labelledby="jar" className="relative overflow-hidden rounded-[2rem] bg-gold p-5 text-ink sm:p-6">
      <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.06]" aria-hidden />
      <div className="relative flex gap-5">
        <Jar share={share} />
        <div className="min-w-0 flex-1">
          <h2 id="jar" className="type-display text-title2 leading-tight">
            Savings jar
          </h2>
          <p className="mt-1 text-subhead opacity-80 tabular">
            {Math.round(share * 100)}% of your goal saved
            {gap > 0 ? ` · ${formatLkr(gap)} to go` : " · goal reached!"}
          </p>
          <Meter value={share} className="mt-3 bg-ink/10" barClass="bg-teal-ink" />
          <p className="mt-3 text-subhead font-semibold">
            {gap === 0 ? "You have enough for this plan." : months === null ? "Add a monthly amount to see when you'll get there." : `About ${months} month${months === 1 ? "" : "s"}, around ${eta}.`}
          </p>
        </div>
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <AmountField label="Saved so far" value={saved} onChange={(v) => onChange({ savedLkr: v })} />
        <AmountField label="Saving each month" value={monthly} onChange={(v) => onChange({ monthlyLkr: v })} />
      </div>
      <Button variant="dark" block className="relative mt-4" onClick={onSave} icon={<PiggyBank className="size-5" aria-hidden />}>
        Save my plan and goal
      </Button>
    </section>
  );
}

function AmountField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="flex flex-col gap-1">
      <span className="px-1 text-footnote font-semibold opacity-80">{label}</span>
      <span className="flex min-h-12 items-center gap-2 rounded-[0.9rem] bg-white/75 px-3 focus-within:ring-2 focus-within:ring-ink/40">
        <span className="text-subhead font-semibold opacity-60">Rs</span>
        <input
          inputMode="numeric"
          className="min-w-0 flex-1 bg-transparent text-body font-semibold outline-none tabular"
          value={draft ?? formatNumber(value)}
          onFocus={() => setDraft(value ? String(value) : "")}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
          onBlur={() => {
            onChange(Number(draft || 0));
            setDraft(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </span>
    </label>
  );
}

function Jar({ share }: { share: number }) {
  const h = 88 * share;
  return (
    <svg viewBox="0 0 80 112" className="w-20 shrink-0 sm:w-24" aria-hidden>
      <defs>
        <clipPath id="jar-clip">
          <path d="M14 26h52c4 0 7 3 7 7v66c0 6-5 11-11 11H18c-6 0-11-5-11-11V33c0-4 3-7 7-7z" />
        </clipPath>
      </defs>
      <rect x="18" y="8" width="44" height="14" rx="5" fill="#100F06" />
      <path d="M14 26h52c4 0 7 3 7 7v66c0 6-5 11-11 11H18c-6 0-11-5-11-11V33c0-4 3-7 7-7z" fill="#ffffff" opacity="0.7" />
      <g clipPath="url(#jar-clip)">
        <rect x="0" y={110 - h} width="80" height={h} fill="#00917A" className="transition-all duration-700 motion-reduce:transition-none" />
        {share > 0.15 && <circle cx="28" cy={Math.max(40, 104 - h * 0.4)} r="7" fill="#FFDA57" stroke="#100F06" strokeWidth="2" />}
        {share > 0.35 && <circle cx="50" cy={Math.max(46, 100 - h * 0.6)} r="7" fill="#FFDA57" stroke="#100F06" strokeWidth="2" />}
      </g>
      <path d="M14 26h52c4 0 7 3 7 7v66c0 6-5 11-11 11H18c-6 0-11-5-11-11V33c0-4 3-7 7-7z" fill="none" stroke="#100F06" strokeWidth="3" />
      <path d="M17 40v40" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
