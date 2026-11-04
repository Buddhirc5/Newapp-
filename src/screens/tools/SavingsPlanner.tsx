import { useMemo, useState } from "react";
import { PiggyBank, TrendingDown } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Meter, Notice, SectionHeader } from "@/components/ui/Bits";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatLkr, formatNzd, lkrSpoken } from "@/lib/format";
import { useRate } from "@/lib/rates";
import { readJson, writeJson } from "@/lib/storage";
import { installment, monthlySurplus, payoff } from "@/logic/loan";

interface Inputs {
  loanLkr: number;
  ratePct: number;
  termMonths: number;
  incomeNzd: number;
  expensesNzd: number;
  extraShare: number;
}

const DEFAULTS: Inputs = { loanLkr: 3_000_000, ratePct: 12, termMonths: 60, incomeNzd: 4200, expensesNzd: 2600, extraShare: 50 };
const KEY = "kp-loan-v1";

/** Plans loan installments in Sri Lanka against NZ income, and shows how extra payments shorten the loan. */
export function SavingsPlanner() {
  const rate = useRate();
  const [v, setV] = useState<Inputs>(() => ({ ...DEFAULTS, ...(readJson<Inputs>(KEY) ?? {}) }));
  const set = (patch: Partial<Inputs>) => {
    const next = { ...v, ...patch };
    setV(next);
    writeJson(KEY, next);
  };

  const result = useMemo(() => {
    const emi = installment(v.loanLkr, v.ratePct, v.termMonths);
    const month = monthlySurplus({ incomeNzd: v.incomeNzd, expensesNzd: v.expensesNzd, installmentLkr: emi, lkrPerNzd: rate.lkrPerNzd });
    const extraNzd = Math.max(0, month.surplusNzd) * (v.extraShare / 100);
    const savingsNzd = Math.max(0, month.surplusNzd) - extraNzd;
    const base = payoff(v.loanLkr, v.ratePct, emi);
    const faster = payoff(v.loanLkr, v.ratePct, emi + extraNzd * rate.lkrPerNzd);
    return { emi, month, extraNzd, savingsNzd, base, faster };
  }, [v, rate.lkrPerNzd]);

  const saved = result.base && result.faster ? result.base.totalInterest - result.faster.totalInterest : 0;

  return (
    <Page title="Loan & Savings" back={{ to: "/tools", label: "Tools" }} lead="Cover your loan installments at home from your NZ income, then decide how much extra to pay and how much to save.">
      <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-night p-5 text-paper">
          <p className="text-footnote font-semibold tracking-wide text-paper/60 uppercase">Monthly installment</p>
          <p className="type-display mt-1 text-[clamp(2rem,8vw,2.6rem)] leading-none tabular">{formatLkr(result.emi)}</p>
          <p className="mt-2 text-callout text-paper/75 tabular">
            ≈ {formatNzd(result.month.installmentNzd)} a month · {Math.round(result.month.installmentShare * 100)}% of your income
          </p>
          <p className="mt-3 inline-flex rounded-full bg-paper/10 px-3 py-1.5 text-footnote text-paper/80 tabular">
            NZ$1 = Rs {rate.lkrPerNzd.toFixed(2)} · {rate.live ? "live" : "saved"} rate
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2" aria-label="Your numbers">
          <Num label="Loan balance (Rs)" value={v.loanLkr} onChange={(loanLkr) => set({ loanLkr })} hint={lkrSpoken(v.loanLkr)} />
          <Num label="Interest rate (% a year)" value={v.ratePct} step={0.25} onChange={(ratePct) => set({ ratePct })} />
          <Num label="Months left" value={v.termMonths} onChange={(termMonths) => set({ termMonths })} />
          <Num label="Take-home pay (NZ$ a month)" value={v.incomeNzd} onChange={(incomeNzd) => set({ incomeNzd })} />
          <Num label="Living costs (NZ$ a month)" value={v.expensesNzd} onChange={(expensesNzd) => set({ expensesNzd })} />
        </section>

        <Card className="p-5">
          <p className="text-headline font-semibold">Left over each month</p>
          <p className={cn("type-display mt-1 text-title1 tabular", result.month.surplusNzd < 0 && "text-coral-ink")}>{formatNzd(result.month.surplusNzd)}</p>
          {result.month.surplusNzd < 0 ? (
            <p className="mt-2 text-subhead text-coral-ink">Your costs and installment are more than your income. Look at a cheaper room, more hours, or ask your bank about a longer term.</p>
          ) : (
            <>
              <label htmlFor="extra" className="mt-4 block text-subhead font-semibold">
                Put {v.extraShare}% towards the loan, save the rest
              </label>
              <input
                id="extra"
                type="range"
                min={0}
                max={100}
                step={10}
                value={v.extraShare}
                onChange={(e) => set({ extraShare: Number(e.target.value) })}
                className="kp-range mt-1 h-11 w-full appearance-none bg-transparent"
                style={{ "--pct": `${v.extraShare}%` } as React.CSSProperties}
              />
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-teal-soft p-3">
                  <TrendingDown className="size-5 text-teal-ink" aria-hidden />
                  <p className="mt-1 text-footnote text-label-2">Extra to the loan</p>
                  <p className="text-headline font-bold tabular">{formatNzd(result.extraNzd)}</p>
                </div>
                <div className="rounded-2xl bg-gold-soft p-3">
                  <PiggyBank className="size-5" aria-hidden />
                  <p className="mt-1 text-footnote text-label-2">Into savings</p>
                  <p className="text-headline font-bold tabular">{formatNzd(result.savingsNzd)}</p>
                </div>
              </div>
            </>
          )}
        </Card>

        {result.base && result.faster && result.month.surplusNzd >= 0 && (
          <section className="flex flex-col gap-3" aria-labelledby="payoff">
            <SectionHeader id="payoff" title="Loan-free sooner" />
            <Card className="flex flex-col gap-4 p-5">
              <Bar label="Normal installments" months={result.base.months} max={result.base.months} tone="bg-fill-3" />
              <Bar label="With extra payments" months={result.faster.months} max={result.base.months} tone="bg-teal" />
              <p className="text-subhead">
                You'd finish <b>{result.base.months - result.faster.months} months earlier</b> and save about <b>{formatLkr(saved)}</b> in interest.
              </p>
              <p className="text-footnote text-label-2">In a year you'd also have about {formatNzd(result.savingsNzd * 12)} saved. Build one month of expenses as an emergency fund first.</p>
            </Card>
          </section>
        )}

        <Notice>
          Estimates only. Your bank's figures may differ, and some loans charge for early repayment. Exchange rates change, so recheck before each transfer.
        </Notice>
        <ButtonLink to="/guides/loans-and-savings" variant="tinted">
          Read the loans & savings guide
        </ButtonLink>
      </div>
    </Page>
  );
}

function Bar({ label, months, max, tone }: { label: string; months: number; max: number; tone: string }) {
  return (
    <div>
      <div className="flex justify-between text-subhead">
        <span>{label}</span>
        <span className="font-semibold tabular">
          {Math.floor(months / 12)} yr {months % 12} mo
        </span>
      </div>
      <Meter value={max ? months / max : 0} className="mt-1.5 h-3" barClass={tone} />
    </div>
  );
}

function Num({ label, value, onChange, step = 1, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-subhead font-semibold">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="min-h-12 rounded-[0.9rem] bg-fill px-4 text-body font-semibold outline-none ring-teal-ink/60 tabular focus:bg-surface focus:ring-2"
      />
      {hint && <span className="px-1 text-footnote text-label-2">{hint}</span>}
    </label>
  );
}
