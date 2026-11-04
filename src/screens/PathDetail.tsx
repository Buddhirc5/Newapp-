import { Navigate, useNavigate, useParams } from "react-router";
import { ArrowRight, BadgeCheck, CircleCheck, Clock, Home, TriangleAlert, Wallet } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { TINT } from "@/components/tints";
import { Card, Notice, SectionHeader, Tag } from "@/components/ui/Bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/List";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { FIT_LABEL } from "@/logic/finder";
import { useApp } from "@/store/app";
import type { PathId } from "@/types";

const FIT_TINT = { strong: "green", possible: "gold", stretch: "coral" } as const;

export function PathDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pathId = useApp((s) => s.pathId);
  const setPath = useApp((s) => s.setPath);
  const setMoney = useApp((s) => s.setMoney);
  const finder = useApp((s) => s.finder);
  const pathways = usePathways();
  const pathway = id && id in pathways ? pathways[id as PathId] : null;
  if (!pathway) return <Navigate to="/paths" replace />;

  const fit = finder?.ranking.find((r) => r.id === pathway.id)?.fit;
  const isMine = pathId === pathway.id;

  return (
    <Page
      title={pathway.name}
      back={{ to: "/paths", label: "Paths" }}
      hero={
        <div className={cn("relative mb-6 overflow-hidden rounded-[2rem] p-5 pt-6 sm:p-7", TINT[pathway.tint].solid)}>
          <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
          <Mascot pose="suitcase" mood="smile" tint={pathway.tint === "malibu" ? "lavender" : "malibu"} className="pointer-events-none absolute -right-2 -bottom-4 w-28 sm:w-36" />
          <div className="relative pr-24 sm:pr-32">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-3 py-1 text-footnote font-semibold">{pathway.short}</span>
              {fit && <Tag tint={FIT_TINT[fit]} tilt={-3}>{FIT_LABEL[fit]}</Tag>}
            </div>
            <h1 className="type-display mt-3 text-[clamp(2rem,8vw,2.6rem)] leading-[1.05]">{pathway.name}</h1>
            <p className="mt-3 text-callout opacity-80">{pathway.summary}</p>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2.5">
            {isMine ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-night px-5 text-callout font-semibold text-paper">
                <BadgeCheck className="size-5" aria-hidden /> This is your journey
              </span>
            ) : (
              <Button
                variant="dark"
                size="md"
                onClick={() => {
                  setPath(pathway.id);
                  if (pathway.id === "student" || pathway.id === "worker") setMoney({ path: pathway.id });
                  toast(`Journey switched to ${pathway.name}`);
                  navigate("/");
                }}
              >
                Make this my journey
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3" aria-labelledby="for-you">
          <SectionHeader id="for-you" title="Is it for you?" />
          <Card className="p-2">
            <ul>
              {pathway.whoFor.map((w) => (
                <li key={w} className="flex gap-3 px-3 py-2.5 text-callout">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="how">
          <SectionHeader id="how" title="How it works" />
          <ol className="relative flex flex-col gap-3">
            {pathway.steps.map((step, i) => (
              <li key={step.title} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-subhead font-bold", TINT[pathway.tint].solid)}>{i + 1}</span>
                  {i < pathway.steps.length - 1 && <span className="mt-1 w-0.5 flex-1 rounded-full bg-fill-3" aria-hidden />}
                </div>
                <div className="pb-3">
                  <h3 className="text-headline font-semibold">{step.title}</h3>
                  <p className="mt-1 text-subhead text-label-2">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-3 sm:grid-cols-2" aria-label="Timing and residence">
          <Card className="flex flex-col gap-2 p-5">
            <Clock className="size-6 text-teal-ink" aria-hidden />
            <h3 className="text-headline font-semibold">Typical timing</h3>
            <p className="text-subhead text-label-2">{pathway.timeline}</p>
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <Home className="size-6 text-teal-ink" aria-hidden />
            <h3 className="text-headline font-semibold">Route to residence</h3>
            <p className="text-subhead text-label-2">{pathway.residence}</p>
          </Card>
        </section>

        <ListGroup header="Key requirements">
          {pathway.requirements.map((r) => (
            <ListRow key={r} title={<span className="text-callout">{r}</span>} />
          ))}
        </ListGroup>

        <section className="flex flex-col gap-3" aria-labelledby="watch">
          <SectionHeader id="watch" title="Watch out for" />
          <ul className="flex flex-col gap-2.5">
            {pathway.watchOuts.map((w) => (
              <li key={w} className="flex gap-3 rounded-tile bg-coral-soft px-4 py-3 text-callout">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-coral-ink" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </section>

        {(pathway.id === "student" || pathway.id === "worker") && (
          <section className="flex items-center gap-4 rounded-[2rem] bg-gold p-5 text-ink">
            <Wallet className="size-8 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="text-headline font-semibold">What will it cost?</h3>
              <p className="text-subhead opacity-80">See this path's costs in NZD and rupees.</p>
            </div>
            <ButtonLink
              to="/tools/money"
              variant="dark"
              size="sm"
              onClick={() => setMoney({ path: pathway.id === "student" ? "student" : "worker" })}
              iconAfter={<ArrowRight className="size-4" aria-hidden />}
            >
              Plan
            </ButtonLink>
          </section>
        )}

        <ListGroup header="Official sources" footer={`Summary checked ${pathway.checked}.`}>
          {pathway.sources.map((s) => (
            <ListRow key={s.href} title={s.label} subtitle={new URL(s.href).hostname.replace(/^www\./, "")} accessory="external" href={s.href} />
          ))}
        </ListGroup>

        <Notice tone="warn" title="Get advice before you apply">
          KiwiPath gives general information. For advice on your own situation, use a licensed immigration adviser or a lawyer. Anyone advising
          you on NZ immigration, in New Zealand or overseas, must be licensed unless exempt.
        </Notice>
      </div>
    </Page>
  );
}
