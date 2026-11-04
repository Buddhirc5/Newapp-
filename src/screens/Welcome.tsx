import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Search, X } from "lucide-react";
import { Mascot, Sparkle } from "@/components/Mascot";
import { TINT } from "@/components/tints";
import { Tag, ProgressDashes } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Slider, TextField } from "@/components/ui/Controls";
import { CITIES } from "@/data/places";
import { OCCUPATION_BY_ID, searchOccupations } from "@/data/occupations";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { formatLkr, formatNzd, lkrSpoken } from "@/lib/format";
import { tick } from "@/lib/haptics";
import { useRate } from "@/lib/rates";
import { FIT_LABEL, rankPaths, type PathFit } from "@/logic/finder";
import { DEFAULT_PROFILE, useApp } from "@/store/app";
import type { PathId, Profile } from "@/types";

type StepId = "goal" | "qualification" | "occupation" | "experience" | "english" | "savings" | "household" | "timeline" | "city" | "name";

const STEPS: StepId[] = ["goal", "qualification", "occupation", "experience", "english", "savings", "household", "timeline", "city", "name"];

interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

const GOALS: Choice<Profile["goal"]>[] = [
  { value: "study", label: "Study a Masters or postgraduate course" },
  { value: "work", label: "Work in my field" },
  { value: "family", label: "Join my partner or family" },
  { value: "business", label: "Invest or run a business" },
  { value: "explore", label: "I'm not sure yet" },
];
const QUALS: Choice<Profile["qualification"]>[] = [
  { value: "school", label: "A/Levels or a certificate" },
  { value: "diploma", label: "Diploma or trade qualification" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "postgrad", label: "Postgraduate diploma or Masters" },
  { value: "phd", label: "PhD" },
];
const EXPERIENCE: Choice<Profile["experience"]>[] = [
  { value: "0-1", label: "Less than 2 years" },
  { value: "2-3", label: "2–3 years" },
  { value: "4-5", label: "4–5 years" },
  { value: "6+", label: "6 years or more" },
];
const ENGLISH: Choice<Profile["english"]>[] = [
  { value: "not-started", label: "I haven't started preparing" },
  { value: "preparing", label: "I'm preparing for a test" },
  { value: "booked", label: "My test is booked" },
  { value: "below", label: "I have a score below IELTS 6.5", hint: "Or the PTE/TOEFL equivalent" },
  { value: "ready", label: "I have IELTS 6.5 or higher", hint: "Or the PTE/TOEFL equivalent" },
];
const HOUSEHOLD: Choice<Profile["household"]>[] = [
  { value: "single", label: "Just me" },
  { value: "couple", label: "Me and my partner" },
  { value: "family", label: "My partner and our children" },
];
const TIMELINE: Choice<Profile["timeline"]>[] = [
  { value: "6m", label: "Within 6 months" },
  { value: "12m", label: "In 6–12 months" },
  { value: "24m", label: "In 1–2 years" },
  { value: "exploring", label: "I'm just exploring" },
];

const QUESTION: Record<StepId, string> = {
  goal: "What's your main goal in New Zealand?",
  qualification: "What's your highest qualification?",
  occupation: "What work do you do?",
  experience: "How many years of experience do you have in that work?",
  english: "Where are you with English tests?",
  savings: "How much have you saved for the move?",
  household: "Who's moving with you?",
  timeline: "When would you like to move?",
  city: "Which city interests you most?",
  name: "What should we call you?",
};

export function Welcome() {
  const navigate = useNavigate();
  const onboarded = useApp((s) => s.onboarded);
  const isSample = useApp((s) => s.isSample);
  const existing = useApp((s) => s.profile);
  const loadSample = useApp((s) => s.loadSample);
  const completeOnboarding = useApp((s) => s.completeOnboarding);
  const rate = useRate();
  const reduce = useReducedMotion();

  const [stage, setStage] = useState<"intro" | number | "result">("intro");
  const [profile, setProfile] = useState<Profile>(() => (onboarded && !isSample ? existing : DEFAULT_PROFILE));
  const [direction, setDirection] = useState(1);

  const ranking = useMemo(() => (stage === "result" ? rankPaths(profile, rate.lkrPerNzd) : []), [stage, profile, rate.lkrPerNzd]);

  const go = (next: typeof stage, dir = 1) => {
    setDirection(dir);
    setStage(next);
  };
  const advance = () => {
    if (typeof stage !== "number") return;
    if (stage >= STEPS.length - 1) go("result");
    else go(stage + 1);
  };
  const update = (patch: Partial<Profile>, auto = false) => {
    setProfile((p) => ({ ...p, ...patch }));
    if (auto) window.setTimeout(advance, reduce ? 0 : 220);
  };

  const finish = (pathId: PathId) => {
    completeOnboarding(
      profile,
      { at: new Date().toISOString(), ranking: ranking.map(({ id, score, fit }) => ({ id, score, fit })) },
      pathId,
    );
    navigate("/", { replace: true });
  };

  const close = onboarded ? () => navigate(-1) : undefined;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="topo-layer" aria-hidden />
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={String(stage)}
          custom={direction}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -28 * direction }}
          transition={{ duration: reduce ? 0.1 : 0.24, ease: [0.32, 0.72, 0, 1] }}
          className="relative z-10"
        >
          {stage === "intro" && (
            <Intro
              onStart={() => go(0)}
              onSample={() => {
                loadSample();
                navigate("/", { replace: true });
              }}
              onClose={close}
              returning={onboarded && !isSample}
            />
          )}
          {typeof stage === "number" && (
            <StepFrame
              index={stage}
              onBack={() => (stage === 0 ? go("intro", -1) : go(stage - 1, -1))}
              onNext={advance}
            >
              <StepBody step={STEPS[stage]} profile={profile} update={update} onNext={advance} rate={rate.lkrPerNzd} />
            </StepFrame>
          )}
          {stage === "result" && <Result ranking={ranking} name={profile.name} onPick={finish} onBack={() => go(STEPS.length - 1, -1)} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Intro({ onStart, onSample, onClose, returning }: { onStart: () => void; onSample: () => void; onClose?: () => void; returning: boolean }) {
  return (
    <div className="gutter-x">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col pt-4 pb-8">
        <div className="flex h-14 items-center justify-between">
          <p className="type-display text-title3">KiwiPath</p>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-full bg-surface shadow-card">
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>
        <div className="relative mx-auto mt-2 w-56 sm:w-64">
          <Mascot pose="wave" mood="happy" label="Kiri, the KiwiPath guide, waving hello" />
          <Sparkle className="absolute top-4 -left-4 size-6 text-gold" />
          <Sparkle className="absolute top-16 -right-6 size-4 text-lavender" delay={0.8} />
          <Sparkle className="absolute bottom-10 -left-8 size-3.5 text-teal" delay={1.4} />
        </div>
        <h1 className="type-display mt-4 text-hero">From Colombo to Aotearoa, one step at a time.</h1>
        <p className="mt-4 text-body text-label-2">
          KiwiPath turns the move to New Zealand into a clear journey: the right pathway for you, scam checks, budgets in rupees, and practice for
          your CV and English test.
        </p>
        <ul className="mt-6 grid grid-cols-3 gap-2.5" aria-label="What you get">
          {[
            { t: "Pathway Finder", c: "malibu" as const },
            { t: "Scam Shield", c: "coral" as const },
            { t: "Rupee budgets", c: "gold" as const },
          ].map((f) => (
            <li key={f.t} className={cn("rounded-tile px-3 py-3 text-subhead leading-tight font-semibold", TINT[f.c].solid)}>
              {f.t}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button onClick={onStart} iconAfter={<ArrowRight className="size-5" aria-hidden />} block>
            {returning ? "Retake the Pathway Finder" : "Find my path"}
          </Button>
          {!returning && (
            <Button variant="tinted" onClick={onSample} block>
              Explore a sample journey
            </Button>
          )}
          <p className="px-2 text-center text-footnote text-label-2">
            Free. Your answers stay on this device. KiwiPath shares general information, not immigration advice.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepFrame({ index, onBack, onNext, children }: { index: number; onBack: () => void; onNext: () => void; children: ReactNode }) {
  return (
    <div className="gutter-x">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col pt-4 pb-8">
        <div className="flex h-14 items-center gap-4">
          <ProgressDashes total={STEPS.length} done={index} current={index} className="flex-1" label={`Question ${index + 1} of ${STEPS.length}`} />
          <div className="flex gap-2">
            <button type="button" onClick={onBack} aria-label="Previous question" className="grid size-11 place-items-center rounded-full bg-surface shadow-card">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={onNext} aria-label="Next question" className="grid size-11 place-items-center rounded-full bg-surface shadow-card">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <p className="mt-6 text-footnote font-semibold tracking-wide text-label-2 uppercase">
          Pathway Finder · {index + 1} of {STEPS.length}
        </p>
        <h1 className="type-display mt-2 text-[clamp(2rem,8vw,2.75rem)] leading-[1.06]">{QUESTION[STEPS[index]]}</h1>
        <div className="mt-6 flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

function ChoiceCard<T extends string>({ choices, value, onPick, label }: { choices: Choice<T>[]; value: T | null; onPick: (v: T) => void; label: string }) {
  const letters = "ABCDEFGH";
  return (
    <div className="rounded-[2rem] bg-gold p-3 sm:p-4" role="radiogroup" aria-label={label}>
      <div className="flex flex-col gap-2.5">
        {choices.map((c, i) => {
          const selected = c.value === value;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                tick();
                onPick(c.value);
              }}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-full py-2 pr-4 pl-2 text-left transition-[background-color,transform] active:scale-[0.99]",
                selected ? "bg-teal-ink text-white" : "bg-white text-ink hover:bg-white/85",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full text-subhead font-bold",
                  selected ? "bg-white/20 text-white" : "bg-[#dcf5de] text-[#00765f]",
                )}
                aria-hidden
              >
                {selected ? <Check className="size-5" strokeWidth={3} /> : letters[i]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-callout font-semibold">{c.label}</span>
                {c.hint && <span className={cn("block text-footnote", selected ? "text-white/80" : "text-ink/60")}>{c.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepBody({ step, profile, update, onNext, rate }: { step: StepId; profile: Profile; update: (p: Partial<Profile>, auto?: boolean) => void; onNext: () => void; rate: number }) {
  switch (step) {
    case "goal":
      return <ChoiceCard label={QUESTION.goal} choices={GOALS} value={profile.goal} onPick={(goal) => update({ goal }, true)} />;
    case "qualification":
      return <ChoiceCard label={QUESTION.qualification} choices={QUALS} value={profile.qualification} onPick={(qualification) => update({ qualification }, true)} />;
    case "experience":
      return <ChoiceCard label={QUESTION.experience} choices={EXPERIENCE} value={profile.experience} onPick={(experience) => update({ experience }, true)} />;
    case "english":
      return <ChoiceCard label={QUESTION.english} choices={ENGLISH} value={profile.english} onPick={(english) => update({ english }, true)} />;
    case "household":
      return <ChoiceCard label={QUESTION.household} choices={HOUSEHOLD} value={profile.household} onPick={(household) => update({ household }, true)} />;
    case "timeline":
      return <ChoiceCard label={QUESTION.timeline} choices={TIMELINE} value={profile.timeline} onPick={(timeline) => update({ timeline }, true)} />;
    case "city":
      return (
        <ChoiceCard
          label={QUESTION.city}
          choices={CITIES.map((c) => ({ value: c.id, label: c.name, hint: c.maori }))}
          value={profile.city}
          onPick={(city) => update({ city }, true)}
        />
      );
    case "occupation":
      return <OccupationStep profile={profile} update={update} onNext={onNext} />;
    case "savings":
      return (
        <div className="flex flex-1 flex-col">
          <div className="rounded-[2rem] bg-gold p-5 text-ink">
            <p className="type-display text-[clamp(1.9rem,8vw,2.6rem)] leading-none tabular">{formatLkr(profile.savingsLkr)}</p>
            <p className="mt-2 text-callout font-semibold opacity-75 tabular">
              {lkrSpoken(profile.savingsLkr) || "Under 1 lakh"} · about {formatNzd(profile.savingsLkr / rate)}
            </p>
            <div className="mt-4 rounded-full bg-white/60 px-3">
              <Slider
                label="Savings in rupees"
                min={0}
                max={30_000_000}
                step={250_000}
                value={profile.savingsLkr}
                onChange={(savingsLkr) => update({ savingsLkr })}
                valueText={`${formatLkr(profile.savingsLkr)}`}
              />
            </div>
            <div className="mt-1 flex justify-between px-1 text-caption font-semibold opacity-60">
              <span>Rs 0</span>
              <span>Rs 30 million+</span>
            </div>
          </div>
          <p className="mt-3 px-1 text-footnote text-label-2">Include family support you can rely on. You can change this any time.</p>
          <Button className="mt-auto" block onClick={onNext} iconAfter={<ArrowRight className="size-5" aria-hidden />}>
            Continue
          </Button>
        </div>
      );
    case "name":
      return (
        <div className="flex flex-1 flex-col gap-4">
          <TextField
            label="First name (optional)"
            placeholder="e.g. Nimali"
            autoComplete="given-name"
            value={profile.name}
            onChange={(e) => update({ name: e.target.value.slice(0, 40) })}
            onKeyDown={(e) => e.key === "Enter" && onNext()}
          />
          <Button className="mt-auto" block onClick={onNext} iconAfter={<ArrowRight className="size-5" aria-hidden />}>
            See my paths
          </Button>
        </div>
      );
  }
}

function OccupationStep({ profile, update, onNext }: { profile: Profile; update: (p: Partial<Profile>, auto?: boolean) => void; onNext: () => void }) {
  const [query, setQuery] = useState(profile.occupationId ? OCCUPATION_BY_ID[profile.occupationId]?.title ?? "" : profile.occupationOther);
  const results = searchOccupations(query).slice(0, 6);
  const selected = profile.occupationId ? OCCUPATION_BY_ID[profile.occupationId] : null;
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-label-3" aria-hidden />
        <label htmlFor="occ-search" className="sr-only">
          Search occupations
        </label>
        <input
          id="occ-search"
          type="search"
          value={query}
          placeholder="Search, e.g. nurse, accountant, developer"
          onChange={(e) => {
            setQuery(e.target.value);
            update({ occupationId: null, occupationOther: e.target.value });
          }}
          className="min-h-13 w-full rounded-full bg-surface py-3 pr-4 pl-12 text-body shadow-card outline-none ring-teal-ink/60 focus:ring-2"
        />
      </div>
      <div className="rounded-[2rem] bg-gold p-3">
        <ul className="flex flex-col gap-2" aria-label="Matching occupations">
          {results.map((o) => {
            const isSel = selected?.id === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => {
                    tick();
                    setQuery(o.title);
                    update({ occupationId: o.id, occupationOther: "" }, true);
                  }}
                  className={cn("flex min-h-13 w-full items-center gap-3 rounded-full px-4 py-2 text-left", isSel ? "bg-teal-ink text-white" : "bg-white text-ink hover:bg-white/85")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-callout font-semibold">{o.title}</span>
                    <span className={cn("block text-footnote", isSel ? "text-white/80" : "text-ink/60")}>
                      {o.regulator ? "Regulated in NZ" : "No NZ registration needed"} · {o.group}
                    </span>
                  </span>
                  {isSel && <Check className="size-5" aria-hidden />}
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="rounded-full bg-white px-4 py-3 text-callout text-ink">We'll note "{query}" as your occupation.</li>
          )}
        </ul>
      </div>
      <Button variant="tinted" className="mt-auto" block onClick={onNext}>
        {selected || query.trim() ? "Continue" : "Skip this question"}
      </Button>
    </div>
  );
}

function Result({ ranking, name, onPick, onBack }: { ranking: PathFit[]; name: string; onPick: (id: PathId) => void; onBack: () => void }) {
  const pathways = usePathways();
  const [top, ...rest] = ranking;
  const best = pathways[top.id];
  const fitTint = { strong: "green", possible: "gold", stretch: "coral" } as const;
  return (
    <div className="min-h-dvh bg-night text-paper">
      <div className="gutter-x">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col pt-4 pb-8">
          <div className="flex h-14 items-center justify-between">
            <button type="button" onClick={onBack} aria-label="Back to questions" className="grid size-11 place-items-center rounded-full bg-paper/10 hover:bg-paper/20">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-subhead font-bold text-ink">
              +40 <span className="text-teal-ink">PTS</span>
            </span>
          </div>
          <div className="relative mx-auto mt-2 w-56">
            <div className="absolute inset-x-6 top-0 h-56 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)]" aria-hidden />
            <Mascot pose="cheer" mood="happy" tint={best.tint} label="Kiri celebrating your result" />
            <Sparkle className="absolute top-2 -left-6 size-6 text-paper" />
            <Sparkle className="absolute top-24 -right-8 size-5 text-paper" delay={0.6} />
            <Sparkle className="absolute bottom-6 -left-10 size-4 text-paper" delay={1.2} />
          </div>
          <p className="mt-6 text-center text-callout font-semibold text-paper/70">{name ? `${name}, your best match is` : "Your best match is"}</p>
          <h1 className="type-display mt-2 text-center text-[clamp(2.1rem,9vw,3rem)] leading-[1.04]">{best.name}</h1>
          <div className="mt-3 flex justify-center">
            <Tag tint={fitTint[top.fit]} tilt={-4}>
              {FIT_LABEL[top.fit]}
            </Tag>
          </div>

          <ul className="mt-6 flex flex-col gap-2.5" aria-label="Why this path">
            {top.reasons.map((r) => (
              <li key={r.text} className="flex gap-3 rounded-tile bg-paper/[0.07] px-4 py-3 text-subhead">
                {r.good ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-green" aria-hidden /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />}
                <span>{r.text}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-7 text-footnote font-semibold tracking-wide text-paper/60 uppercase">Other options</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {rest.slice(0, 3).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r.id)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-tile bg-paper/[0.07] px-4 text-left hover:bg-paper/[0.12]"
                >
                  <span className={cn("size-3 rounded-full", TINT[pathways[r.id].tint].dot)} aria-hidden />
                  <span className="min-w-0 flex-1 text-callout font-semibold">{pathways[r.id].name}</span>
                  <span className="text-footnote text-paper/60">{FIT_LABEL[r.fit]}</span>
                  <ChevronRight className="size-4 text-paper/50" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={() => onPick(top.id)} block iconAfter={<ArrowRight className="size-5" aria-hidden />}>
              Start my journey
            </Button>
            <p className="text-center text-footnote text-paper/60">
              A starting point, not a visa decision. Every answer can be changed later in Me → Profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
