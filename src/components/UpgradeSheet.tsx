import { useEffect, useState } from "react";
import { create } from "zustand";
import { Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { AiRequestError, fetchPackages, PLAN_NAME, startCheckout, useMember, type Packages, type PaidPlan } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { formatLkr } from "@/lib/format";
import { joinWaitlistRemote } from "@/lib/remote";
import { useAuth } from "@/lib/sync";
import { useApp } from "@/store/app";
import { track } from "@/lib/track";

/** Open the packages sheet from anywhere, e.g. when an AI limit is reached. */
export const useUpgrade = create<{ open: boolean; reason: string | null; show: (reason?: string) => void; hide: () => void }>((set) => ({
  open: false,
  reason: null,
  show: (reason) => {
    track("upgrade:open", reason ? "limit" : "menu");
    set({ open: true, reason: reason ?? null });
  },
  hide: () => set({ open: false }),
}));

/** Shows an AI error, opening the packages sheet when upgrading would help. */
export function aiErrorToast(e: unknown) {
  const err = e instanceof AiRequestError ? e : null;
  toast(err?.message ?? "That didn't work. Try again.", "warn");
  if (err?.upgrade) useUpgrade.getState().show(err.message);
}

const SHARED = ["Ask KiwiPath AI assistant", "AI Document Check for passports, bank statements, letters and CVs", "AI CV polish and SOP drafts", "AI journey coach, refreshed every night", "Every free tool, guide and community feature"];

export function UpgradeSheet() {
  const { open, reason, hide } = useUpgrade();
  const user = useAuth((s) => s.user);
  const profile = useMember((s) => s.profile);
  const waitlisted = useApp((s) => s.waitlist.pro);
  const joinWaitlist = useApp((s) => s.joinWaitlist);
  const [pkgs, setPkgs] = useState<Packages | null>(null);
  const [choice, setChoice] = useState<PaidPlan>("pro");
  const [billing, setBilling] = useState<"month" | "year">("year");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (HAS_SUPABASE) fetchPackages().then(setPkgs, () => setPkgs(null));
    if (profile?.plan === "pro") setChoice("ultra");
  }, [open, profile?.plan]);

  const p = pkgs ?? { mainPrice: 1990, ultraPrice: 5990, mainYearly: 19900, ultraYearly: 59900, mainLimit: 15, ultraLimit: 60, paymentsEnabled: false };
  const yearly = billing === "year";
  const priceOf = (id: PaidPlan) => (id === "ultra" ? (yearly ? p.ultraYearly : p.ultraPrice) : yearly ? p.mainYearly : p.mainPrice);
  const saving = (id: PaidPlan) => Math.max(0, (id === "ultra" ? p.ultraPrice : p.mainPrice) * 12 - (id === "ultra" ? p.ultraYearly : p.mainYearly));
  const current = profile?.plan;
  const renews = profile?.plan_ends_at && (current === "pro" || current === "ultra") ? new Date(profile.plan_ends_at) : null;
  const canPay = HAS_SUPABASE && Boolean(user) && p.paymentsEnabled;

  const plans: { id: PaidPlan; name: string; price: number; limit: number; extra: string[] }[] = [
    { id: "pro", name: "Main", price: priceOf("pro"), limit: p.mainLimit, extra: [] },
    { id: "ultra", name: "Ultra", price: priceOf("ultra"), limit: p.ultraLimit, extra: ["4 times the daily AI requests", "Made for families, agents and repeat applications"] },
  ];

  return (
    <Sheet
      open={open}
      onClose={hide}
      title="KiwiPath packages"
      description="Your first month includes everything. Guides, paths and planners stay free forever."
      tone="night"
      size="tall"
      footer={
        canPay ? (
          <Button
            block
            disabled={busy || phone.replace(/\D/g, "").length < 9 || current === choice}
            onClick={async () => {
              setBusy(true);
              try {
                track("checkout:start", `${choice}-${billing}`);
                await startCheckout(choice, phone, city, billing);
              } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't open the payment page.", "warn");
                setBusy(false);
              }
            }}
          >
            {current === choice ? `You're on ${PLAN_NAME[choice]}` : busy ? "Opening PayHere…" : `Pay ${formatLkr(priceOf(choice))} a ${yearly ? "year" : "month"} with PayHere`}
          </Button>
        ) : waitlisted ? (
          <p className="text-center text-subhead text-paper/70">You're on the list. We'll email you when payments open.</p>
        ) : (
          <Button
            block
            disabled={!/^\S+@\S+\.\S+$/.test(email)}
            onClick={async () => {
              const res = await joinWaitlistRemote("pro", email);
              if (!res.ok) return toast(`Couldn't join: ${res.message}`, "warn");
              joinWaitlist("pro");
              toast(res.remote ? "You're on the list" : "Saved on this device");
              hide();
            }}
          >
            Tell me when payments open
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {reason && <p className="rounded-2xl bg-gold/15 px-4 py-3 text-subhead text-gold">{reason}</p>}
        {current && (
          <p className="text-subhead text-paper/75">
            Your plan: <b className="text-paper">{PLAN_NAME[current]}</b>
            {renews ? ` · renews ${renews.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : ""}
          </p>
        )}
        <SegmentedControl
          label="Billing"
          value={billing}
          onChange={setBilling}
          className="bg-paper/10"
          options={[
            { value: "month", label: "Monthly" },
            { value: "year", label: `Yearly · save ${formatLkr(saving("pro"))}` },
          ]}
        />
        <div role="radiogroup" aria-label="Package" className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={choice === plan.id}
              onClick={() => setChoice(plan.id)}
              className={cn("flex flex-col gap-2 rounded-[1.4rem] p-4 text-left ring-2 transition-colors", choice === plan.id ? "bg-paper/10 ring-gold" : "bg-paper/[0.05] ring-transparent")}
            >
              <span className="flex items-center gap-2 text-headline font-semibold">
                {plan.id === "ultra" ? <Sparkles className="size-5 text-gold" aria-hidden /> : <Crown className="size-5 text-gold" aria-hidden />}
                {plan.name}
                {current === plan.id && <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-caption font-bold text-ink">Current</span>}
              </span>
              <span className="type-display text-title2">
                {formatLkr(plan.price)}
                <span className="text-subhead font-normal text-paper/65"> /{yearly ? "year" : "month"}</span>
              </span>
              {yearly && <span className="text-footnote text-paper/70">≈ {formatLkr(Math.round(plan.price / 12))} a month · save {formatLkr(saving(plan.id))}</span>}
              <span className="text-footnote font-semibold text-gold">{plan.limit} AI requests a day</span>
              <ul className="flex flex-col gap-1.5 text-footnote text-paper/85">
                {[...SHARED, ...plan.extra].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        {canPay ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Mobile number" type="tel" autoComplete="tel" placeholder="+94 77 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-paper/10 text-paper placeholder:text-paper/45" />
            <TextField label="City" autoComplete="address-level2" placeholder="Colombo" value={city} onChange={(e) => setCity(e.target.value)} className="bg-paper/10 text-paper placeholder:text-paper/45" />
            <p className="text-footnote text-paper/65 sm:col-span-2">
              You'll pay on PayHere's secure page, so KiwiPath never sees your card. Automatic renewals (monthly or yearly) need a Visa or Mastercard. Cancel any time by contacting us.
            </p>
          </div>
        ) : (
          !waitlisted && (
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              hint={HAS_SUPABASE && !user ? "Sign in to subscribe once payments open." : "Online payments open soon. We'll email you."}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-paper/10 text-paper placeholder:text-paper/45"
            />
          )
        )}
      </div>
    </Sheet>
  );
}
