import { Link } from "react-router";
import { ArrowRight, BadgeCheck, Clock, Search } from "lucide-react";
import { ICONS } from "@/components/icons";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { TINT } from "@/components/tints";
import { IconTile, Notice, Tag } from "@/components/ui/Bits";
import { ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/List";
import { SOURCES } from "@/data/pathways";
import { cn } from "@/lib/cn";
import { usePathwayList, usePathways } from "@/lib/content";
import { useT } from "@/lib/i18n";
import { FIT_LABEL } from "@/logic/finder";
import { useApp } from "@/store/app";

const FIT_TINT = { strong: "green", possible: "gold", stretch: "coral" } as const;

export function Paths() {
  const t = useT();
  const finder = useApp((s) => s.finder);
  const pathId = useApp((s) => s.pathId);
  const fits = Object.fromEntries((finder?.ranking ?? []).map((r) => [r.id, r.fit]));
  const pathways = usePathways();
  const list = usePathwayList();
  const best = finder?.ranking[0] ? pathways[finder.ranking[0].id] : null;

  return (
    <Page title={t("paths.title")} lead="The main ways Sri Lankans move to New Zealand. Compare them, then choose the one that fits your life.">
      <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-lavender p-5 text-ink sm:p-6">
          <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
          <Mascot mood="thinking" pose="stand" tint="malibu" className="pointer-events-none absolute -right-4 -bottom-6 w-32 sm:w-36" />
          <div className="relative max-w-[70%]">
            <p className="text-footnote font-semibold tracking-wide uppercase opacity-70">Pathway Finder</p>
            <h2 className="type-display mt-1 text-title2 leading-tight">{best ? `Best match: ${best.name}` : "Not sure where to start?"}</h2>
            <p className="mt-2 text-subhead opacity-80">Ten quick questions about your goal, qualifications, English and savings.</p>
            <ButtonLink to="/welcome" variant="dark" size="md" className="mt-4" iconAfter={<ArrowRight className="size-4" aria-hidden />}>
              {finder ? "Retake" : "Start"}
            </ButtonLink>
          </div>
        </section>

        <ul className="flex flex-col gap-4">
          {list.map((p) => {
            const Icon = ICONS[p.icon];
            const fit = fits[p.id] as keyof typeof FIT_TINT | undefined;
            return (
              <li key={p.id}>
                <Link
                  to={`/paths/${p.id}`}
                  className={cn("group relative block overflow-hidden rounded-[2rem] p-5 transition-transform active:scale-[0.99] sm:p-6", TINT[p.tint].solid)}
                >
                  <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.06]" aria-hidden />
                  <div className="relative flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/70">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {pathId === p.id && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-night px-2.5 py-0.5 text-caption font-semibold text-paper">
                            <BadgeCheck className="size-3.5" aria-hidden /> Your journey
                          </span>
                        )}
                        {fit && <Tag tint={FIT_TINT[fit]} className="bg-white/80! text-ink!">{FIT_LABEL[fit]}</Tag>}
                      </div>
                      <h2 className="type-display mt-2 text-title2 leading-tight">{p.name}</h2>
                      <p className="mt-1.5 text-subhead opacity-80">{p.summary}</p>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-footnote font-semibold opacity-75">
                        <Clock className="size-4" aria-hidden />
                        {p.timeline}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <ListGroup header="Check your job">
          <ListRow
            icon={
              <IconTile tint="teal">
                <Search className="size-5" aria-hidden />
              </IconTile>
            }
            title="Occupation Check"
            subtitle="Is your job regulated in NZ, and who registers it?"
            accessory="chevron"
            to="/tools/occupations"
          />
          <ListRow
            icon={
              <IconTile tint="gold">
                <BadgeCheck className="size-5" aria-hidden />
              </IconTile>
            }
            title="Find a licensed adviser"
            subtitle="Immigration Advisers Authority register"
            accessory="external"
            href={SOURCES.iaa.href}
          />
        </ListGroup>

        <Notice title="General information, not advice">
          Pathway summaries were checked against Immigration New Zealand's public information in November 2026. Visa rules change often, so confirm
          details on immigration.govt.nz or with a licensed immigration adviser before you apply.
        </Notice>
      </div>
    </Page>
  );
}
