import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { BadgeCheck, Briefcase, ExternalLink, MapPin, Search, ShieldAlert } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Notice } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select, Switch, TextField } from "@/components/ui/Controls";
import { fetchJobs, fetchListings, type Job } from "@/lib/community";
import { NZ_CITY_LIST, CITY_BY_ID } from "@/data/places";
import { OCCUPATIONS } from "@/data/occupations";
import type { Listing } from "@/data/board";
import { cn } from "@/lib/cn";
import { HAS_SUPABASE } from "@/lib/env";
import { formatNzd, relativeDay } from "@/lib/format";
import { useApp } from "@/store/app";

/** Prefilled searches on the main New Zealand job sites. */
function boards(what: string, where: string) {
  const w = encodeURIComponent(what || "");
  const loc = where === "anywhere" ? "" : where;
  const l = encodeURIComponent(loc);
  const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [
    { name: "Seek", desc: "New Zealand's biggest job site", href: `https://www.seek.co.nz/${slug(what) || "jobs"}-jobs${loc ? `/in-${slug(loc)}` : ""}` },
    { name: "Trade Me Jobs", desc: "Lots of regional and trade jobs", href: `https://www.trademe.co.nz/a/jobs/search?search_string=${w}` },
    { name: "LinkedIn", desc: "Professional and corporate roles", href: `https://www.linkedin.com/jobs/search/?keywords=${w}&location=${l || "New%20Zealand"}` },
    { name: "Indeed", desc: "Collects jobs from many sites", href: `https://nz.indeed.com/jobs?q=${w}&l=${l}` },
    { name: "Health jobs (Te Whatu Ora)", desc: "Nurses, doctors and allied health", href: "https://www.tewhatuora.govt.nz/careers" },
    { name: "Government jobs", desc: "Public service roles", href: "https://jobs.govt.nz" },
  ];
}

const pay = (j: Job) =>
  j.salaryMin && j.salaryMax && j.salaryMin !== j.salaryMax ? `${formatNzd(j.salaryMin)}–${formatNzd(j.salaryMax)}` : j.salaryMin ? formatNzd(j.salaryMin) : null;

/** Live NZ jobs for the member's occupation and city, plus member-posted jobs and prefilled searches. */
export function Jobs() {
  const profile = useApp((s) => s.profile);
  const occupation = OCCUPATIONS.find((o) => o.id === profile.occupationId)?.title ?? profile.occupationOther ?? "";
  const [what, setWhat] = useState(occupation);
  const [where, setWhere] = useState(profile.city === "undecided" ? "anywhere" : CITY_BY_ID[profile.city]?.name ?? "anywhere");
  const [sponsor, setSponsor] = useState(false);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<Listing[]>([]);

  const search = async (p = 1) => {
    if (!HAS_SUPABASE) return setConfigured(false);
    setBusy(true);
    setError("");
    try {
      const res = await fetchJobs(what, where, sponsor, p);
      setConfigured(res.configured);
      setError(res.error ?? "");
      setJobs((prev) => (p > 1 && prev ? [...prev, ...res.jobs] : res.jobs));
      setPage(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void search(1);
    if (HAS_SUPABASE) fetchListings({ category: "job", limit: 6 }).then(setMembers, () => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const links = useMemo(() => boards(what, where), [what, where]);

  return (
    <Page title="Jobs" back={{ to: "/tools", label: "Tools" }} lead="Recent New Zealand jobs for your field, and searches on every major job site in one place.">
      <div className="flex flex-col gap-6">
        <Card className="p-4 sm:p-5">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void search(1);
            }}
          >
            <TextField label="Job title or skill" placeholder="e.g. software engineer, nurse, chef" value={what} maxLength={80} onChange={(e) => setWhat(e.target.value)} />
            <Select label="Where" value={where} onChange={(e) => setWhere(e.target.value)}>
              <option value="anywhere">Anywhere in NZ</option>
              {NZ_CITY_LIST.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={busy} icon={<Search className="size-5" aria-hidden />}>
              {busy && page === 1 ? "Searching…" : "Search"}
            </Button>
          </form>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-fill px-4 py-3">
            <span className="text-subhead">
              <b>Mentions visa sponsorship</b>
              <span className="block text-footnote text-label-2">Jobs that talk about sponsorship or accredited employers</span>
            </span>
            <Switch checked={sponsor} onChange={setSponsor} label="Only jobs that mention sponsorship" />
          </div>
        </Card>

        {configured ? (
          <section aria-label="Live jobs" className="flex flex-col gap-3">
            {error && <Notice tone="warn">{error}</Notice>}
            {jobs === null ? (
              [0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-tile bg-fill" />)
            ) : jobs.length === 0 ? (
              <p className="py-6 text-center text-subhead text-label-2">No recent jobs for that search. Try a broader title or “Anywhere in NZ”.</p>
            ) : (
              jobs.map((j) => (
                <a key={j.id} href={j.url} target="_blank" rel="noopener noreferrer nofollow" className="group rounded-tile bg-surface p-4 shadow-card transition-transform active:scale-[0.99]">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-soft text-green-ink">
                      <Briefcase className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-headline font-semibold group-hover:underline">{j.title}</p>
                      <p className="text-subhead text-label-2">
                        {j.company || "Employer not named"} · <MapPin className="inline size-3.5" aria-hidden /> {j.location}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-footnote text-label-2">{j.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-caption font-bold">
                        {pay(j) && <span className="rounded-full bg-fill px-2 py-0.5">{pay(j)}</span>}
                        {j.contract && <span className="rounded-full bg-fill px-2 py-0.5">{j.contract.replace("_", " ")}</span>}
                        {j.sponsor && <span className="rounded-full bg-gold/25 px-2 py-0.5">Mentions sponsorship</span>}
                        {j.created && <span className="rounded-full bg-fill px-2 py-0.5 font-semibold text-label-2">{relativeDay(j.created)}</span>}
                      </div>
                    </div>
                    <ExternalLink className="mt-1 size-4 shrink-0 text-label-3" aria-hidden />
                  </div>
                </a>
              ))
            )}
            {jobs && jobs.length >= 20 * page && page < 5 && (
              <Button variant="tinted" disabled={busy} onClick={() => void search(page + 1)}>
                {busy ? "Loading…" : "Show more jobs"}
              </Button>
            )}
          </section>
        ) : (
          <Notice title="Search the job sites below">The live job feed isn't switched on yet. These searches are already filled in with your job title and city.</Notice>
        )}

        <section aria-label="Job sites">
          <h2 className="mb-3 text-title3 font-semibold">Search on job sites</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((b) => (
              <a key={b.name} href={b.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-tile bg-surface p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <p className="text-callout font-semibold">{b.name}</p>
                  <p className="truncate text-footnote text-label-2">{b.desc}</p>
                </div>
                <ExternalLink className="size-4 shrink-0 text-label-3" aria-hidden />
              </a>
            ))}
          </div>
        </section>

        {members.length > 0 && (
          <section aria-label="Jobs from members">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-title3 font-semibold">From KiwiPath members</h2>
              <Link to="/board" className="text-subhead font-semibold text-teal-ink">
                See all
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {members.map((l) => (
                <li key={l.id}>
                  <Link to={`/board/${l.id}`} className="flex items-center justify-between gap-3 rounded-tile bg-surface p-4 shadow-card">
                    <span className="min-w-0">
                      <span className="block truncate text-callout font-semibold">{l.title}</span>
                      <span className="text-footnote text-label-2">
                        {l.city} · {relativeDay(l.created_at)}
                      </span>
                    </span>
                    {l.owner?.verified && <BadgeCheck className="size-5 shrink-0 text-teal" aria-label="Verified member" />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Notice title="Accredited employers">
            Most work visas need a job with an accredited employer. Check any employer on{" "}
            <a className="font-semibold underline" href="https://www.immigration.govt.nz/employ-migrants/explore-your-options/accredited-employers-list" target="_blank" rel="noopener noreferrer">
              Immigration NZ's accredited employer list
            </a>
            .
          </Notice>
          <div className={cn("flex gap-3 rounded-tile bg-coral-soft p-4 text-coral-ink")}>
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-subhead">
              Real NZ employers never charge you for a job or a Job Check. Paste any offer into{" "}
              <Link to="/tools/scam-shield" className="font-semibold underline">
                Scam Shield
              </Link>{" "}
              before you pay anything.
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
