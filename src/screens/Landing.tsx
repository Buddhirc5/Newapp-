import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  BookOpenCheck,
  Building2,
  ChevronDown,
  HandCoins,
  Lock,
  Mail,
  MessagesSquare,
  Newspaper,
  PiggyBank,
  Route,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Mascot, Sparkle } from "@/components/Mascot";
import { SignInSheet } from "@/components/SignInSheet";
import { TINT } from "@/components/tints";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { HAS_SUPABASE } from "@/lib/env";
import { signInWithGoogle, useGoogleEnabled } from "@/lib/sync";
import type { Tint } from "@/types";

const FEATURES: { icon: LucideIcon; title: string; text: string; tint: Tint }[] = [
  { icon: Route, title: "Your step-by-step path", text: "Study, work, partner or family visas, from first idea to residence.", tint: "malibu" },
  { icon: BookOpenCheck, title: "Guides that answer the real questions", text: "How much money to show, proof of relationship, work experience letters, SOPs.", tint: "gold" },
  { icon: ShieldCheck, title: "Scam Shield", text: "Check any agent message or job offer before you pay anyone.", tint: "coral" },
  { icon: Users, title: "Private groups", text: "City and path groups with chat and meetups. Your phone number stays private.", tint: "lavender" },
  { icon: Store, title: "Board", text: "Rooms, airport pickups, furniture, jobs and deals from the community.", tint: "teal" },
  { icon: PiggyBank, title: "Money & loans", text: "Budgets in rupees and dollars, savings goals and loan repayment plans.", tint: "pink" },
  { icon: Building2, title: "Checked agencies", text: "Find education agencies other members recommend, reviewed by our team.", tint: "green" },
  { icon: Newspaper, title: "Live immigration news", text: "Rule changes from official and trusted NZ sources, updated every few hours.", tint: "gold" },
];

const STAGES = [
  { n: "0 → 100", title: "Get there", text: "Choose a path, prepare funds and documents, apply to universities or employers, and get your visa.", tint: "malibu" as Tint },
  { n: "100 → 200", title: "Land well", text: "Find a room, get an IRD number, open a bank account and meet people in your city.", tint: "gold" as Tint },
  { n: "200 → 300", title: "Thrive", text: "Manage your budget, repay loans faster, move to a post-study work visa and plan residence.", tint: "teal" as Tint },
];

const FAQ = [
  {
    q: "Is KiwiPath an immigration agency?",
    a: "No. KiwiPath explains the process and connects you with people. For advice on your own case, use a licensed immigration adviser; we show you how to check one.",
  },
  { q: "What does it cost?", a: "Every feature is free for your first month. Core tools stay free after that. Paid sessions with mentors and advisers are charged separately." },
  { q: "Who can see my information?", a: "Your plans, documents and budgets are private to you. Groups never show phone numbers, and you choose what goes on your public profile." },
];

export function Landing() {
  const reduce = useReducedMotion();
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const google = useGoogleEnabled();

  const startGoogle = async () => {
    setBusy(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      toast(res.message ?? "Google sign-in didn't start", "warn");
      setBusy(false);
    }
  };

  const fade = (delay = 0) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.45, delay } };

  const signInButtons = (dark = false) => (
    <div className="flex flex-col gap-3">
      {HAS_SUPABASE ? (
        <>
          {google && (
            <Button variant={dark ? "light" : "dark"} onClick={startGoogle} disabled={busy} icon={<GoogleMark />} block>
              {busy ? "Opening Google…" : "Continue with Google"}
            </Button>
          )}
          <Button variant={google ? (dark ? "tinted" : "outline") : dark ? "light" : "dark"} className={dark && google ? "bg-white/15 text-white hover:bg-white/25" : ""} onClick={() => setEmailOpen(true)} icon={<Mail className="size-5" aria-hidden />} block>
            {google ? "Use my email instead" : "Continue with email"}
          </Button>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="topo-layer" aria-hidden />
      <header className="relative z-10 gutter-x">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between">
          <p className="type-display text-title3">KiwiPath</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {HAS_SUPABASE && (
              <Button size="sm" variant="tinted" onClick={() => setEmailOpen(true)}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="gutter-x">
          <div className="mx-auto grid max-w-5xl items-center gap-6 pt-2 pb-10 md:grid-cols-[1.1fr_0.9fr] md:pt-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-footnote font-semibold shadow-card">
                <span className="size-2 rounded-full bg-teal" aria-hidden /> For Sri Lankans moving to New Zealand
              </p>
              <h1 className="type-display mt-4 text-[clamp(2.4rem,10vw,4rem)] leading-[1.02]">From Colombo to Aotearoa, and every step after.</h1>
              <p className="mt-4 max-w-xl text-body text-label-2">
                The right way to study, work or join family in New Zealand, explained clearly. Then a trusted community to help you find a room, save
                money and settle in.
              </p>
              <div className="mt-6 max-w-sm">{signInButtons()}</div>
              <p className="mt-3 text-footnote text-label-2">First month free, every feature. No card needed.</p>
            </div>
            <div className="relative mx-auto w-60 md:w-80">
              <div className="absolute inset-6 rounded-full bg-gold/60 blur-2xl" aria-hidden />
              <Mascot pose="suitcase" mood="happy" label="Kiri, the KiwiPath guide, carrying a suitcase" className="relative" />
              <Sparkle className="absolute top-2 -left-3 size-6 text-gold" />
              <Sparkle className="absolute top-20 -right-4 size-4 text-lavender" delay={0.7} />
            </div>
          </div>
        </section>

        <section className="gutter-x pb-12" aria-labelledby="stages">
          <div className="mx-auto max-w-5xl">
            <h2 id="stages" className="type-display text-title1">
              0 to 100. Then all the way to 300.
            </h2>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {STAGES.map((s, i) => (
                <motion.li key={s.n} {...fade(i * 0.08)} className={cn("relative overflow-hidden rounded-card p-5", TINT[s.tint].solid)}>
                  <span className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
                  <p className="relative text-footnote font-bold tracking-wide uppercase opacity-70 tabular">{s.n}</p>
                  <h3 className="type-display relative mt-1 text-title2">{s.title}</h3>
                  <p className="relative mt-2 text-subhead opacity-80">{s.text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section className="gutter-x pb-12" aria-labelledby="features">
          <div className="mx-auto max-w-5xl">
            <h2 id="features" className="type-display text-title1">
              Everything in one place
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <motion.li key={f.title} {...fade((i % 4) * 0.05)} className="flex gap-3 rounded-tile bg-surface p-4 shadow-card sm:flex-col">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", TINT[f.tint].solid)}>
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-headline font-semibold">{f.title}</span>
                    <span className="mt-0.5 block text-subhead text-label-2">{f.text}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="gutter-x pb-12" aria-labelledby="safe">
          <div className="mx-auto grid max-w-5xl gap-4 rounded-[2rem] bg-night p-6 text-paper md:grid-cols-3 md:p-8">
            <div className="md:col-span-1">
              <h2 id="safe" className="type-display text-title1">
                Safer than a WhatsApp group
              </h2>
              <p className="mt-2 text-subhead text-paper/75">Facebook and WhatsApp groups expose your number to scammers and spread rumours. KiwiPath is built differently.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 md:col-span-2">
              {[
                { icon: Lock, t: "Your number stays private", d: "Members chat inside the app. No phone numbers shown." },
                { icon: ShieldCheck, t: "Scam checks on every post", d: "Listings that ask for money upfront are stopped before they go live." },
                { icon: MessagesSquare, t: "Moderated groups", d: "Reported posts are hidden and reviewed by our team." },
                { icon: HandCoins, t: "Verified helpers and agencies", d: "Badges only after we check who someone is." },
              ].map((x) => (
                <li key={x.t} className="flex gap-3 rounded-tile bg-paper/[0.07] p-4">
                  <x.icon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
                  <span>
                    <span className="block text-callout font-semibold">{x.t}</span>
                    <span className="block text-footnote text-paper/70">{x.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="gutter-x pb-12" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq" className="type-display text-title1">
              Questions
            </h2>
            <div className="mt-4 flex flex-col gap-2.5">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-tile bg-surface p-4 shadow-card">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-headline font-semibold">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-subhead text-label-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="gutter-x pb-16">
          <div className="mx-auto max-w-md rounded-[2rem] bg-teal-ink p-6 text-center text-white">
            <h2 className="type-display text-title1">Start your path today</h2>
            <p className="mt-2 text-subhead text-white/80">Free for your first month. Leave whenever you like.</p>
            <div className="mt-5">{signInButtons(true)}</div>
          </div>
          <nav aria-label="Free guides" className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2">
            {[
              { href: "/learn", label: "Free moving guides" },
              { href: "/visa", label: "Visa paths compared" },
              { href: "/cities", label: "Cost of living by city" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-subhead font-semibold shadow-card">
                {l.label}
              </a>
            ))}
          </nav>
          <p className="mx-auto mt-6 max-w-xl text-center text-footnote text-label-2">
            KiwiPath shares general information, not immigration advice. Always confirm rules on immigration.govt.nz or with a licensed adviser.{" "}
            <a href="/privacy" className="underline underline-offset-2">
              Privacy
            </a>
            {" · "}
            <a href="/terms" className="underline underline-offset-2">
              Terms
            </a>
          </p>
        </section>
      </main>
      <SignInSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
