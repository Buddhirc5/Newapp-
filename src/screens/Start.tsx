import { useEffect, useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { ProgressDashes } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { joinGroupsBySlug, loadMember, updateMember, useMember, type MemberProfile } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { tick } from "@/lib/haptics";
import { useAuth } from "@/lib/sync";
import { useApp } from "@/store/app";
import type { CityId, PathId } from "@/types";
import { CITIES } from "@/data/places";
import { saveSignupSource } from "@/lib/attribution";
import { track } from "@/lib/track";

type Situation = MemberProfile["situation"];
type Stage = MemberProfile["stage"];

const INTERESTS = [
  { id: "housing", label: "Rooms & housing" },
  { id: "jobs", label: "Jobs" },
  { id: "money", label: "Money, savings & loans" },
  { id: "study", label: "Universities & courses" },
  { id: "english", label: "IELTS & PTE" },
  { id: "deals", label: "Deals & things to buy" },
  { id: "events", label: "Meetups & events" },
];

const CITY_OPTIONS: { id: CityId; label: string; hint: string }[] = CITIES.map((c) => ({ id: c.id, label: c.name, hint: c.id === "undecided" ? "Compare cities later in Tools" : c.region }));

const PATH_GROUP: Record<PathId, string | null> = {
  student: "masters-students",
  worker: "skilled-workers",
  registered: "nurses-health",
  family: "partners-families",
  business: null,
};

const INTEREST_GROUP: Record<string, string> = { housing: "housing-flatmates", money: "money-and-loans", english: "ielts-pte-prep" };

/** First-run questions after sign-up. Answers personalise the home screen and join matching groups. */
export function Start() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const member = useMember((s) => s.profile);
  const loading = useMember((s) => s.loading);
  const local = useApp();

  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<Situation>("in_lk");
  const [path, setPath] = useState<PathId>("student");
  const [stage, setStage] = useState<Stage>("exploring");
  const [city, setCity] = useState<CityId>("auckland");
  const [interests, setInterests] = useState<string[]>(["housing", "money"]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const onboardSeen = useRef("");

  useEffect(() => {
    if (member?.display_name && !name) setName(member.display_name === "New member" ? "" : member.display_name);
  }, [member, name]);

  if (!HAS_SUPABASE) return <Navigate to="/welcome" replace />;
  if (ready && !user) return <Navigate to="/landing" replace />;
  if (!ready || loading || (user && !member)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Mascot className="w-28" label="Loading your account" />
      </div>
    );
  }
  if (member?.onboarded) return <Navigate to="/" replace />;

  const inNz = situation === "in_nz";
  const steps = ["situation", inNz ? "nz-stage" : "path", inNz ? null : "stage", "city", "interests", "name"].filter(Boolean) as string[];
  const current = steps[step];
  if (onboardSeen.current !== current) {
    onboardSeen.current = current;
    track(`onboard:${step + 1}-${current}`);
  }
  const next = () => (step < steps.length - 1 ? setStep(step + 1) : void finish());
  const pick = <T,>(set: (v: T) => void, v: T) => {
    tick();
    set(v);
    window.setTimeout(() => setStep((s) => Math.min(s + 1, steps.length - 1)), reduce ? 0 : 180);
  };

  const finish = async () => {
    setBusy(true);
    try {
      const finalStage: Stage = inNz ? (stage === "settled" ? "settled" : "arrived") : stage;
      await updateMember({
        display_name: name.trim() || member?.display_name || "Member",
        situation,
        path,
        stage: finalStage,
        city: city === "undecided" ? "" : (CITY_OPTIONS.find((c) => c.id === city)?.label ?? ""),
        country: inNz ? "nz" : "lk",
        role: inNz ? (finalStage === "settled" ? "helper" : "newcomer") : "planner",
        interests,
        onboarded: true,
      });
      const slugs = [city, PATH_GROUP[path], ...interests.map((i) => INTEREST_GROUP[i])].filter(Boolean) as string[];
      await joinGroupsBySlug(slugs).catch(() => undefined);
      await saveSignupSource();
      track("onboard:done");
      // Keep the on-device journey in step with the account.
      local.completeOnboarding({ ...local.profile, name: name.trim(), city, goal: path === "student" ? "study" : path === "family" ? "family" : path === "business" ? "business" : "work" }, { at: new Date().toISOString(), ranking: [] }, path);
      await loadMember();
      toast("You're all set. Welcome to KiwiPath!");
      navigate("/", { replace: true });
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<string, string> = {
    situation: "Where are you right now?",
    path: "Which way are you hoping to come?",
    stage: "How far along are you?",
    "nz-stage": "How long have you been in New Zealand?",
    city: inNz ? "Which city do you live in?" : "Which city are you most interested in?",
    interests: "What would help you most?",
    name: "What should the community call you?",
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="topo-layer" aria-hidden />
      <div className="relative z-10 gutter-x">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col pt-4 pb-8">
          <div className="flex h-14 items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-surface shadow-card">
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            )}
            <ProgressDashes total={steps.length} done={step} current={step} className="flex-1" label={`Step ${step + 1} of ${steps.length}`} />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="type-display mt-6 text-[clamp(2rem,8vw,2.6rem)] leading-[1.06]">{titles[current]}</h1>
              <div className="mt-6 flex flex-1 flex-col">
                {current === "situation" && (
                  <Choices
                    value={situation}
                    onPick={(v) => pick(setSituation, v)}
                    options={[
                      { value: "in_lk", label: "In Sri Lanka, planning to move", hint: "Study, work or join family" },
                      { value: "in_nz", label: "Already in New Zealand", hint: "Settle in and help others" },
                      { value: "elsewhere", label: "In another country", hint: "Planning a move to NZ" },
                    ]}
                  />
                )}
                {current === "path" && (
                  <Choices
                    value={path}
                    onPick={(v) => pick(setPath, v)}
                    options={[
                      { value: "student", label: "Study a Masters or postgraduate course" },
                      { value: "worker", label: "Work in my field" },
                      { value: "registered", label: "Nursing, medicine, teaching or another registered job" },
                      { value: "family", label: "Join my partner or family" },
                      { value: "business", label: "Invest or start a business" },
                    ]}
                  />
                )}
                {current === "stage" && (
                  <Choices
                    value={stage}
                    onPick={(v) => pick(setStage, v)}
                    options={[
                      { value: "exploring", label: "Just exploring my options" },
                      { value: "preparing", label: "Preparing: English test, funds, documents" },
                      { value: "applying", label: "Applying to universities or employers" },
                      { value: "visa", label: "Applying for my visa, or already approved" },
                    ]}
                  />
                )}
                {current === "nz-stage" && (
                  <Choices
                    value={stage === "settled" ? "settled" : "arrived"}
                    onPick={(v) => pick(setStage, v as Stage)}
                    options={[
                      { value: "arrived", label: "Less than a year", hint: "Still settling in" },
                      { value: "settled", label: "More than a year", hint: "Happy to help newcomers" },
                    ]}
                  />
                )}
                {current === "city" && <Choices value={city} onPick={(v) => pick(setCity, v)} options={CITY_OPTIONS.filter((c) => !(inNz && c.id === "undecided")).map((c) => ({ value: c.id, label: c.label, hint: c.hint }))} />}
                {current === "interests" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-wrap gap-2.5">
                      {INTERESTS.map((i) => {
                        const on = interests.includes(i.id);
                        return (
                          <button
                            key={i.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              tick();
                              setInterests(on ? interests.filter((x) => x !== i.id) : [...interests, i.id]);
                            }}
                            className={cn("inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-callout font-semibold transition-colors", on ? "bg-teal-ink text-white" : "bg-surface shadow-card")}
                          >
                            {on && <Check className="size-4" aria-hidden />}
                            {i.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-footnote text-label-2">We'll add you to matching groups. You can leave or join others any time.</p>
                    <Button className="mt-auto" block onClick={next} iconAfter={<ArrowRight className="size-5" aria-hidden />}>
                      Continue
                    </Button>
                  </div>
                )}
                {current === "name" && (
                  <div className="flex flex-1 flex-col gap-4">
                    <TextField label="Display name" maxLength={40} placeholder="e.g. Nimali P." value={name} onChange={(e) => setName(e.target.value)} />
                    <p className="text-footnote text-label-2">Shown in groups and on your posts. Use a nickname if you prefer.</p>
                    <Button className="mt-auto" block onClick={() => void finish()} disabled={busy} iconAfter={<ArrowRight className="size-5" aria-hidden />}>
                      {busy ? "Setting up…" : "Finish"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Choices<T extends string>({ value, onPick, options }: { value: T; onPick: (v: T) => void; options: { value: T; label: string; hint?: string }[] }) {
  return (
    <div className="rounded-[2rem] bg-gold p-3" role="radiogroup">
      <div className={cn("grid gap-2.5", options.length > 6 && "sm:grid-cols-2")}>
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(o.value)}
              className={cn("flex min-h-14 items-center gap-3 rounded-full py-2 pr-4 pl-2 text-left", selected ? "bg-teal-ink text-white" : "bg-white text-ink hover:bg-white/85")}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-subhead font-bold", selected ? "bg-white/20" : "bg-[#dcf5de] text-[#00765f]")} aria-hidden>
                {selected ? <Check className="size-5" strokeWidth={3} /> : String.fromCharCode(65 + i)}
              </span>
              <span>
                <span className="block text-callout font-semibold">{o.label}</span>
                {o.hint && <span className={cn("block text-footnote", selected ? "text-white/80" : "text-ink/60")}>{o.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
