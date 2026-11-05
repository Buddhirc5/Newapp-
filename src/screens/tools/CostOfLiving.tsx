import { useMemo, useState } from "react";
import { Briefcase, Check, GraduationCap, Sun, Users } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Notice } from "@/components/ui/Bits";
import { SegmentedControl } from "@/components/ui/Controls";
import { NZ_CITY_LIST, CITY_BY_ID, weeklyCost, type City } from "@/data/places";
import { cn } from "@/lib/cn";
import { formatLkr, formatNzd } from "@/lib/format";
import { useRate } from "@/lib/rates";
import { readJson, writeJson } from "@/lib/storage";
import { useApp } from "@/store/app";
import type { CityId } from "@/types";

type Housing = keyof City["rent"];
const KEY = "kp-col-v1";
const WEEKS_PER_MONTH = 52 / 12;
const PARTS: { key: string; label: string; color: string; get: (c: City, h: Housing) => number }[] = [
  { key: "rent", label: "Rent", color: "bg-pink", get: (c, h) => c.rent[h] },
  { key: "groceries", label: "Groceries", color: "bg-gold", get: (c) => c.weekly.groceries },
  { key: "transport", label: "Transport", color: "bg-malibu", get: (c) => c.weekly.transport },
  { key: "power", label: "Power", color: "bg-lavender", get: (c) => c.weekly.power },
  { key: "phone", label: "Phone & internet", color: "bg-teal", get: (c) => c.weekly.phone },
];
const COMMUNITY = { large: "Large Sri Lankan community", growing: "Growing Sri Lankan community", small: "Small Sri Lankan community" };

/** Compares weekly and monthly living costs across New Zealand cities, in NZD and rupees. */
export function CostOfLiving() {
  const rate = useRate();
  const home = useApp((s) => s.profile.city);
  const [saved] = useState(() => readJson<{ picks: CityId[]; housing: Housing }>(KEY));
  const [picks, setPicks] = useState<CityId[]>(saved?.picks?.length ? saved.picks : [home !== "undecided" ? home : "auckland", "christchurch", "hamilton"].filter((v, i, a) => a.indexOf(v) === i) as CityId[]);
  const [housing, setHousing] = useState<Housing>(saved?.housing ?? "room");
  const persist = (next: { picks?: CityId[]; housing?: Housing }) => writeJson(KEY, { picks, housing, ...next });

  const toggle = (id: CityId) => {
    const next = picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id].slice(-3);
    if (!next.length) return;
    setPicks(next);
    persist({ picks: next });
  };

  const ranked = useMemo(() => [...NZ_CITY_LIST].sort((a, b) => weeklyCost(a, housing) - weeklyCost(b, housing)), [housing]);
  const max = weeklyCost(ranked[ranked.length - 1], housing);
  const chosen = picks.map((id) => CITY_BY_ID[id]).filter(Boolean);
  const cheapest = Math.min(...chosen.map((c) => weeklyCost(c, housing)));

  return (
    <Page title="Cost of living" back={{ to: "/tools", label: "Tools" }} lead="Compare what a week and a month cost in New Zealand cities, in dollars and rupees. Pick up to three.">
      <div className="flex flex-col gap-6">
        <SegmentedControl
          label="Housing"
          value={housing}
          onChange={(h) => {
            setHousing(h);
            persist({ housing: h });
          }}
          options={[
            { value: "room", label: "Room in a flat" },
            { value: "one-bed", label: "1 bedroom" },
            { value: "two-bed", label: "2 bedrooms" },
          ]}
        />

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Cities to compare">
          {NZ_CITY_LIST.map((c) => {
            const on = picks.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-subhead font-semibold transition-colors", on ? "bg-teal-ink text-white" : "bg-surface shadow-card")}
              >
                {on && <Check className="size-4" aria-hidden />}
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {chosen.map((c) => {
            const week = weeklyCost(c, housing);
            const month = week * WEEKS_PER_MONTH;
            return (
              <Card key={c.id} className="flex flex-col gap-3 p-5">
                <div>
                  <p className="text-footnote font-semibold text-label-2">
                    {c.maori} · {c.region}
                  </p>
                  <h2 className="type-display text-title2">{c.name}</h2>
                </div>
                <div>
                  <p className="type-display text-title1 tabular">
                    {formatNzd(month)}
                    <span className="text-subhead font-normal text-label-2"> /month</span>
                  </p>
                  <p className="text-subhead text-label-2 tabular">
                    ≈ {formatLkr(month * rate.lkrPerNzd)} · {formatNzd(week)} a week
                  </p>
                  {week === cheapest && chosen.length > 1 ? (
                    <span className="mt-2 inline-flex rounded-full bg-green-soft px-2.5 py-1 text-caption font-bold text-green-ink">CHEAPEST OF YOUR PICKS</span>
                  ) : chosen.length > 1 ? (
                    <span className="mt-2 inline-flex rounded-full bg-fill px-2.5 py-1 text-caption font-bold text-label-2 tabular">+{formatNzd((week - cheapest) * WEEKS_PER_MONTH)} a month</span>
                  ) : null}
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-fill" aria-hidden>
                  {PARTS.map((p) => (
                    <span key={p.key} className={p.color} style={{ width: `${(p.get(c, housing) / week) * 100}%` }} />
                  ))}
                </div>
                <dl className="grid gap-y-1 text-footnote">
                  {PARTS.map((p) => (
                    <div key={p.key} className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-label-2">
                        <span className={cn("size-2 rounded-full", p.color)} aria-hidden />
                        {p.label}
                      </dt>
                      <dd className="font-semibold tabular">{formatNzd(p.get(c, housing))}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-subhead">{c.known}</p>
                <ul className="flex flex-col gap-1.5 text-footnote text-label-2">
                  <li className="flex gap-2">
                    <Briefcase className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {c.jobs.join(", ")}
                  </li>
                  {c.study.length > 0 && (
                    <li className="flex gap-2">
                      <GraduationCap className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {c.study.join(", ")}
                    </li>
                  )}
                  <li className="flex gap-2">
                    <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {COMMUNITY[c.community]}
                  </li>
                  <li className="flex gap-2">
                    <Sun className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {c.climate}
                  </li>
                </ul>
              </Card>
            );
          })}
        </div>

        <Card className="p-5">
          <h2 className="text-headline font-semibold">Every city, cheapest first</h2>
          <p className="text-footnote text-label-2">Weekly costs for one adult, including rent.</p>
          <ol className="mt-4 flex flex-col gap-2.5">
            {ranked.map((c) => {
              const week = weeklyCost(c, housing);
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => toggle(c.id)} className="flex w-full items-center gap-3 text-left" aria-label={`${c.name}: ${formatNzd(week)} a week. ${picks.includes(c.id) ? "Remove from" : "Add to"} comparison`}>
                    <span className={cn("w-32 shrink-0 truncate text-subhead font-semibold sm:w-40", picks.includes(c.id) && "text-teal-ink")}>{c.name}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-fill">
                      <span className={cn("block h-full rounded-full", picks.includes(c.id) ? "bg-teal" : "bg-fill-3")} style={{ width: `${(week / max) * 100}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-footnote font-semibold tabular">{formatNzd(week)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <Notice title="Estimates, not quotes">
          Rents follow MBIE market rent medians and living costs follow Stats NZ spending, rounded. Check current rents on tenancy.govt.nz and Trade Me before you
          sign anything. NZ$1 = Rs {rate.lkrPerNzd.toFixed(2)} ({rate.live ? "live" : "saved"} rate).
        </Notice>
      </div>
    </Page>
  );
}
