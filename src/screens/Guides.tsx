import { Link, Navigate, useParams } from "react-router";
import { ArrowRight, Clock, TriangleAlert } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { TINT } from "@/components/tints";
import { Card, Notice } from "@/components/ui/Bits";
import { ButtonLink } from "@/components/ui/Button";
import { GUIDE_BY_SLUG, GUIDES, STAGE_LABEL, type Guide } from "@/data/guides";
import { cn } from "@/lib/cn";

const ORDER: Guide["stage"][] = ["prepare", "apply", "arrive", "thrive"];

export function Guides() {
  return (
    <Page title="Guides" back={{ to: "/tools", label: "Tools" }} lead="The questions everyone asks, answered step by step: funds, relationship proof, experience letters, SOPs and life in NZ.">
      <div className="flex flex-col gap-7">
        {ORDER.map((stage) => (
          <section key={stage} className="flex flex-col gap-3" aria-labelledby={`g-${stage}`}>
            <h2 id={`g-${stage}`} className="px-1 text-footnote font-semibold tracking-wide text-label-2 uppercase">
              {STAGE_LABEL[stage]}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {GUIDES.filter((g) => g.stage === stage).map((g) => (
                <li key={g.slug}>
                  <Link to={`/guides/${g.slug}`} className="group flex h-full flex-col gap-2 rounded-tile bg-surface p-4 shadow-card transition-transform active:scale-[0.99]">
                    <span className={cn("h-1.5 w-10 rounded-full", TINT[g.tint].dot)} aria-hidden />
                    <span className="text-headline font-semibold">{g.title}</span>
                    <span className="text-subhead text-label-2">{g.summary}</span>
                    <span className="mt-auto flex items-center justify-between pt-1 text-footnote text-label-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden /> {g.minutes} min read
                      </span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}

export function GuideDetail() {
  const { slug = "" } = useParams();
  const guide = GUIDE_BY_SLUG[slug];
  if (!guide) return <Navigate to="/guides" replace />;
  return (
    <Page
      title={guide.title}
      back={{ to: "/guides", label: "Guides" }}
      hero={
        <div className={cn("relative mb-6 overflow-hidden rounded-[2rem] p-5 sm:p-7", TINT[guide.tint].solid)}>
          <span className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
          <p className="relative text-footnote font-semibold tracking-wide uppercase opacity-70">
            {STAGE_LABEL[guide.stage]} · {guide.minutes} min read
          </p>
          <h1 className="type-display relative mt-2 text-[clamp(1.9rem,7vw,2.5rem)] leading-[1.06]">{guide.title}</h1>
          <p className="relative mt-2 text-callout opacity-80">{guide.summary}</p>
        </div>
      }
    >
      <article className="flex flex-col gap-5">
        {guide.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2">
            <h2 className="text-title3 font-bold">{s.heading}</h2>
            {s.body && <p className="text-body text-label-2">{s.body}</p>}
            {s.bullets && (
              <Card className="p-4">
                <ul className="flex flex-col gap-2.5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-callout">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {s.warn && (
              <p className="flex gap-3 rounded-tile bg-coral-soft p-4 text-callout" role="note">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-coral-ink" aria-hidden />
                {s.warn}
              </p>
            )}
          </section>
        ))}
        {guide.tool && (
          <ButtonLink to={guide.tool.to} iconAfter={<ArrowRight className="size-5" aria-hidden />}>
            {guide.tool.label}
          </ButtonLink>
        )}
        <Notice title="General information">
          Checked against public information in November 2026. Rules and amounts change, so confirm on immigration.govt.nz or with a licensed immigration
          adviser before you apply.
        </Notice>
      </article>
    </Page>
  );
}
