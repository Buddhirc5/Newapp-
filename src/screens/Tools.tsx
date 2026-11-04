import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Compass, FileText, Files, Mic, School, Search, ShieldCheck, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot, Sparkle, type Mood, type Pose } from "@/components/Mascot";
import { TINT } from "@/components/tints";
import { IconTile } from "@/components/ui/Bits";
import { ListGroup, ListRow } from "@/components/ui/List";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import type { Tint } from "@/types";

interface ToolInfo {
  to: string;
  title: [string, string];
  desc: string;
  tint: Tint;
  icon: LucideIcon;
  mood: Mood;
  pose: Pose;
  mascotTint: Tint;
}

export const TOOLS: ToolInfo[] = [
  { to: "/tools/scam-shield", title: ["Scam", "Shield"], desc: "Check job offers and agents for warning signs", tint: "coral", icon: ShieldCheck, mood: "worried", pose: "stand", mascotTint: "malibu" },
  { to: "/tools/money", title: ["Money", "Planner"], desc: "Costs in NZD and rupees, plus a savings goal", tint: "gold", icon: Wallet, mood: "happy", pose: "suitcase", mascotTint: "malibu" },
  { to: "/tools/english", title: ["English", "Coach"], desc: "Timed speaking practice with feedback", tint: "lavender", icon: Mic, mood: "wow", pose: "wave", mascotTint: "gold" },
  { to: "/tools/cv", title: ["CV", "Studio"], desc: "Make your CV ready for NZ employers", tint: "pink", icon: FileText, mood: "smile", pose: "stand", mascotTint: "malibu" },
  { to: "/tools/quiz", title: ["Kiwi", "Life"], desc: "Slang, road rules, renting and work", tint: "malibu", icon: Sparkles, mood: "happy", pose: "cheer", mascotTint: "lavender" },
];

const MORE = [
  { to: "/paths", title: "Visa paths", desc: "Compare the ways to move to New Zealand", tint: "malibu" as Tint, icon: Compass },
  { to: "/tools/courses", title: "Course Shortlist", desc: "Compare Masters programmes side by side", tint: "teal" as Tint, icon: School },
  { to: "/tools/documents", title: "Documents", desc: "Track every certificate and translation", tint: "green" as Tint, icon: Files },
  { to: "/tools/occupations", title: "Occupation Check", desc: "Is your job regulated in NZ?", tint: "gold" as Tint, icon: Search },
];

export function Tools() {
  const t = useT();
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("li").forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);

  return (
    <Page title={t("tools.title")} lead="Everything you need between deciding to move and your first week in New Zealand.">
      <div className="flex flex-col gap-7">
        <section aria-label="Featured tools" className="-mx-4 sm:mx-0">
          <ul ref={track} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pt-6 pb-2 sm:scroll-px-0 sm:px-0">
            {TOOLS.map((tool, i) => (
              <li key={tool.to} data-index={i} className="w-[82%] max-w-[22rem] shrink-0 snap-start sm:w-[22rem]">
                <Link
                  to={tool.to}
                  className={cn("group relative flex h-[25rem] flex-col overflow-hidden rounded-[2.25rem] p-5 transition-transform active:scale-[0.985]", TINT[tool.tint].solid)}
                >
                  <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
                  <div className="relative flex flex-col items-center pt-2">
                    <span className="type-display rounded-[1.4rem] bg-white px-5 pt-2 pb-1 text-[2rem] leading-none text-ink">{tool.title[0]}</span>
                    <span className="type-display -mt-1 rounded-[1.4rem] bg-white px-5 pt-1 pb-2.5 text-[2rem] leading-none text-ink">{tool.title[1]}</span>
                    <p className="mt-3 max-w-[16rem] text-center text-subhead font-semibold opacity-80">{tool.desc}</p>
                  </div>
                  <div className="relative mt-auto flex justify-center">
                    <Mascot mood={tool.mood} pose={tool.pose} tint={tool.mascotTint} className="w-40" />
                    <Sparkle className="absolute top-2 left-8 size-5 text-white" />
                    <Sparkle className="absolute top-10 right-10 size-3.5 text-white" delay={1} />
                  </div>
                  <span className="relative -mb-1 inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-night text-headline font-semibold text-paper">
                    Open
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
            {TOOLS.map((tool, i) => (
              <span key={tool.to} className={cn("h-2 rounded-full transition-all duration-300", i === active ? "w-6 bg-pink" : "w-2 bg-fill-3")} />
            ))}
          </div>
        </section>

        <ListGroup header="All tools">
          {[...TOOLS.map((tool) => ({ to: tool.to, title: tool.title.join(" "), desc: tool.desc, tint: tool.tint, icon: tool.icon })), ...MORE].map((tool) => (
            <ListRow
              key={tool.to}
              to={tool.to}
              icon={
                <IconTile tint={tool.tint}>
                  <tool.icon className="size-5" aria-hidden />
                </IconTile>
              }
              title={tool.title === "Kiwi Life" ? "Kiwi Life quiz" : tool.title}
              subtitle={tool.desc}
              accessory="chevron"
            />
          ))}
        </ListGroup>
      </div>
    </Page>
  );
}
