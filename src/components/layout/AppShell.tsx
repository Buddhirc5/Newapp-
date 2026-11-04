import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { LayoutGrid, Route, Store, UserRound, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { IS_PREVIEW } from "@/lib/env";
import { tick } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { useApp } from "@/store/app";
import { Mascot } from "../Mascot";
import { SampleBanner } from "../SampleBanner";

interface Tab {
  to: string;
  key: "journey" | "board" | "tools" | "community" | "me";
  icon: LucideIcon;
  end?: boolean;
}

const TABS: Tab[] = [
  { to: "/", key: "journey", icon: Route, end: true },
  { to: "/board", key: "board", icon: Store },
  { to: "/tools", key: "tools", icon: LayoutGrid },
  { to: "/community", key: "community", icon: Users },
  { to: "/me", key: "me", icon: UserRound },
];

export function AppShell() {
  const onboarded = useApp((s) => s.onboarded);
  const markActive = useApp((s) => s.markActive);
  const location = useLocation();
  const reduce = useReducedMotion();

  useEffect(() => {
    markActive();
  }, [markActive, location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!onboarded && !IS_PREVIEW) return <Navigate to="/welcome" replace />;

  return (
    <div className="relative min-h-dvh lg:pl-72">
      <div className="topo-layer" aria-hidden />
      <a
        href="#main"
        className="sr-only z-[90] rounded-full bg-night px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" className="relative z-10">
        <SampleBanner />
        <motion.div
          key={location.pathname}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
      <TabBar />
    </div>
  );
}

/** Floating capsule tab bar for phones and small tablets. */
function TabBar() {
  const t = useT();
  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 gutter-x lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <ul className="pointer-events-auto mx-auto flex max-w-[28rem] items-stretch gap-1 rounded-full bg-night/95 p-1.5 shadow-float ring-1 ring-white/10 backdrop-blur-xl">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              onClick={() => tick()}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[0.6875rem] leading-none font-semibold transition-colors",
                  isActive ? "bg-teal-ink text-white" : "text-paper/70 hover:text-paper",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon className="size-[1.375rem]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  <span className="max-w-full truncate">{t(`tab.${tab.key}`)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Sidebar navigation for iPad landscape and desktop widths. */
function Sidebar() {
  const t = useT();
  const name = useApp((s) => s.profile.name);
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sep bg-surface-2/80 px-4 backdrop-blur-xl lg:flex"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)", paddingBottom: "1.25rem" }}
      aria-label="Sidebar"
    >
      <div className="flex items-center gap-3 px-2 pb-6">
        <Mascot className="size-12" pose="stand" animate={false} />
        <div>
          <p className="type-display text-title3 leading-none">KiwiPath</p>
          <p className="mt-1 text-footnote text-label-2">Colombo → Aotearoa</p>
        </div>
      </div>
      <nav aria-label="Main">
        <ul className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-body font-medium transition-colors",
                    isActive ? "bg-teal-ink text-white" : "text-label hover:bg-fill",
                  )
                }
              >
                <tab.icon className="size-5" aria-hidden />
                {t(`tab.${tab.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto rounded-tile bg-fill px-4 py-3 text-footnote text-label-2">
        {name ? `Hi ${name}. ` : ""}KiwiPath shares general information, not immigration advice. Check official sources before you apply.
      </div>
    </aside>
  );
}
