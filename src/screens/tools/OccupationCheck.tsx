import { useState } from "react";
import { ArrowUpRight, BadgeCheck, CircleCheck, Search } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Notice } from "@/components/ui/Bits";
import { OCCUPATIONS, searchOccupations } from "@/data/occupations";
import { SOURCES } from "@/data/pathways";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app";

export function OccupationCheck() {
  const occupationId = useApp((s) => s.profile.occupationId);
  const [query, setQuery] = useState("");
  const results = searchOccupations(query);
  const groups = [...new Set(OCCUPATIONS.map((o) => o.group))];

  return (
    <Page title="Occupation Check" back={{ to: "/tools", label: "Tools" }} lead="Find out whether your job is regulated in New Zealand and who registers it.">
      <div className="flex flex-col gap-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-label-3" aria-hidden />
          <label htmlFor="occ-q" className="sr-only">
            Search occupations
          </label>
          <input
            id="occ-q"
            type="search"
            placeholder="Search, e.g. nurse, electrician, accountant"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full rounded-full bg-surface py-3 pr-4 pl-12 text-body shadow-card outline-none ring-teal-ink/60 focus:ring-2"
          />
        </div>

        {groups.map((group) => {
          const items = results.filter((o) => o.group === group);
          if (!items.length) return null;
          return (
            <section key={group} className="flex flex-col gap-1.5" aria-label={group}>
              <h2 className="px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">{group}</h2>
              <ul className="overflow-hidden rounded-tile bg-surface shadow-card">
                {items.map((o) => (
                  <li key={o.id} className={cn("border-b border-sep px-4 py-3.5 last:border-b-0", o.id === occupationId && "bg-teal-soft")}>
                    <div className="flex items-start gap-3">
                      {o.regulator ? <BadgeCheck className="mt-0.5 size-5 shrink-0 text-coral-ink" aria-hidden /> : <CircleCheck className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <p className="text-headline font-semibold">
                          {o.title}
                          {o.id === occupationId && <span className="ml-2 text-footnote font-semibold text-teal-ink">Your job</span>}
                        </p>
                        <p className={cn("mt-0.5 text-subhead font-medium", o.regulator ? "text-coral-ink" : "text-teal-ink")}>
                          {o.regulator ? "Regulated: registration needed" : "Not regulated"}
                        </p>
                        {o.regulator && (
                          <p className="mt-1 text-subhead">
                            {o.regulator.href ? (
                              <a href={o.regulator.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-ink">
                                {o.regulator.name}
                                <ArrowUpRight className="size-3.5" aria-hidden />
                              </a>
                            ) : (
                              <span className="font-semibold">{o.regulator.name}</span>
                            )}
                          </p>
                        )}
                        <p className="mt-1 text-subhead text-label-2">{o.note}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {results.length === 0 && <p className="px-1 text-subhead text-label-2">No match. Search Careers New Zealand for your job title.</p>}

        <Notice title="Is my job on the Green List?">
          The Green List changes over time, so check the current list on{" "}
          <a href={SOURCES.inz.href} target="_blank" rel="noreferrer" className="font-semibold text-teal-ink">
            immigration.govt.nz
          </a>
          . Jobs on it can have faster routes to residence.
        </Notice>
      </div>
    </Page>
  );
}
