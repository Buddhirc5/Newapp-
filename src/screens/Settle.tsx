import { Link } from "react-router";
import { ArrowRight, BedDouble, Briefcase, CheckCircle2, Landmark, PiggyBank, ShoppingBag, Tag, Users, Utensils, type LucideIcon } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { TINT } from "@/components/tints";
import { Card, SectionHeader } from "@/components/ui/Bits";
import { useMember } from "@/lib/community";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { useApp } from "@/store/app";
import type { Tint } from "@/types";

const ACTIONS: { to: string; icon: LucideIcon; title: string; text: string; tint: Tint }[] = [
  { to: "/board?c=room", icon: BedDouble, title: "Find a room", text: "Rooms, flats and homestays from the community", tint: "malibu" },
  { to: "/board?c=item", icon: ShoppingBag, title: "Furniture & things", text: "Second-hand beds, heaters and kitchen gear", tint: "pink" },
  { to: "/board?c=deal", icon: Tag, title: "Best deals", text: "Supermarket specials, SIM plans and power", tint: "coral" },
  { to: "/guides/food-and-shopping", icon: Utensils, title: "Food & groceries", text: "Where to find Sri Lankan ingredients", tint: "gold" },
  { to: "/tools/savings", icon: PiggyBank, title: "Budget & loans", text: "Pay off loans at home faster", tint: "teal" },
  { to: "/board?c=job", icon: Briefcase, title: "Jobs", text: "Part-time and full-time jobs posted by members", tint: "green" },
  { to: "/groups", icon: Users, title: "Your groups", text: "Chat and meet people in your city", tint: "lavender" },
  { to: "/guides/first-30-days", icon: Landmark, title: "First 30 days", text: "IRD, bank, GP, licence and tenancy", tint: "gold" },
];

const VISA_NEXT = [
  "Check your visa expiry date and set a reminder 3 months before.",
  "Students: plan your post-study work visa before your student visa ends.",
  "Keep payslips and your employment agreement for residence later.",
];

/** Home screen for members already in New Zealand: settling in, saving and helping others. */
export function Settle() {
  const t = useT();
  const member = useMember((s) => s.profile);
  const name = member?.display_name ?? useApp.getState().profile.name;
  return (
    <Page
      title="Home"
      hero={
        <div className="flex flex-col gap-4 pt-1 pb-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-teal-ink p-5 text-white sm:p-7">
            <span className="topo-fill pointer-events-none absolute inset-0 text-white/[0.06]" aria-hidden />
            <Mascot pose="wave" mood="happy" className="pointer-events-none absolute -right-2 -bottom-4 w-28 sm:w-36" />
            <div className="relative max-w-[75%]">
              <p className="text-callout font-semibold text-white/80">
                {t("greet")}
                {name ? `, ${name}` : ""}
              </p>
              <h1 className="type-display mt-1 text-[clamp(2rem,8vw,2.75rem)] leading-[1.04]">Life in Aotearoa</h1>
              <p className="mt-2 text-subhead text-white/80">
                {member?.city ? `Your city: ${member.city}. ` : ""}Rooms, deals, money and people, all in one place.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <section aria-labelledby="quick" className="flex flex-col gap-3">
          <SectionHeader id="quick" title="What do you need today?" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACTIONS.map((a) => (
              <li key={a.title}>
                <Link to={a.to} className={cn("group relative flex h-full min-h-32 flex-col justify-between overflow-hidden rounded-tile p-4 transition-transform active:scale-[0.98]", TINT[a.tint].solid)}>
                  <span className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.06]" aria-hidden />
                  <a.icon className="relative size-6" aria-hidden />
                  <span className="relative">
                    <span className="block text-headline font-bold">{a.title}</span>
                    <span className="block text-footnote opacity-75">{a.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="visa-next" className="flex flex-col gap-3">
          <SectionHeader id="visa-next" title="Stay on top of your visa" />
          <Card className="p-4">
            <ul className="flex flex-col gap-2.5">
              {VISA_NEXT.map((v) => (
                <li key={v} className="flex gap-3 text-callout">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
                  {v}
                </li>
              ))}
            </ul>
            <Link to="/guides/post-study-work-visa" className="mt-3 inline-flex min-h-11 items-center gap-1 text-subhead font-semibold text-teal-ink">
              Post-study work visa guide <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>
        </section>

        <section className="flex items-center gap-4 rounded-[2rem] bg-gold p-5 text-ink">
          <Users className="size-8 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-headline font-semibold">Help the next person</h2>
            <p className="text-subhead opacity-80">Offer an airport pickup, a room or advice. Helpers can earn from sessions.</p>
          </div>
          <Link to="/board/new" className="inline-flex min-h-11 items-center rounded-full bg-night px-4 text-subhead font-semibold text-paper">
            Offer help
          </Link>
        </section>
      </div>
    </Page>
  );
}
