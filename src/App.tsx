import { useEffect } from "react";
import { createBrowserRouter, createMemoryRouter, Navigate, RouterProvider, type RouteObject } from "react-router";
import { MotionConfig } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { Toaster } from "@/components/ui/Toast";
import { RouteError } from "@/components/RouteError";
import { HAS_SUPABASE, IS_PREVIEW } from "@/lib/env";
import { loadRemoteContent } from "@/lib/content";
import { loadMember, useMember } from "@/lib/community";
import { Settle } from "@/screens/Settle";
import { startSync, takeSignIn, useAuth } from "@/lib/sync";
import { useApp } from "@/store/app";
import { Journey } from "@/screens/Journey";
import { NotFound } from "@/screens/NotFound";
import { Paths } from "@/screens/Paths";
import { Tools } from "@/screens/Tools";
import { Welcome } from "@/screens/Welcome";

/** Members already in New Zealand get the settling-in home; everyone else gets their journey. */
function Home() {
  const situation = useMember((s) => s.profile?.situation);
  return situation === "in_nz" ? <Settle /> : <Journey />;
}

/** The online app always needs an account; the welcome quiz is for signed-in members only. */
function WelcomeGate() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  if (HAS_SUPABASE && !user) return ready ? <Navigate to="/landing" replace /> : null;
  return <Welcome />;
}

const pages: RouteObject[] = [
  { path: "/welcome", element: <WelcomeGate /> },
  { path: "/landing", lazy: async () => ({ Component: (await import("@/screens/Landing")).Landing }) },
  // Outside the app shell, so visitors who haven't started can read it from the landing page.
  { path: "/privacy", lazy: async () => ({ Component: (await import("@/screens/Privacy")).Privacy }) },
  { path: "/terms", lazy: async () => ({ Component: (await import("@/screens/Terms")).Terms }) },
  { path: "/admin", lazy: async () => ({ Component: (await import("@/screens/Admin")).Admin }) },
  { path: "/start", lazy: async () => ({ Component: (await import("@/screens/Start")).Start }) },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: "paths", element: <Paths /> },
      { path: "paths/:id", lazy: async () => ({ Component: (await import("@/screens/PathDetail")).PathDetail }) },
      { path: "tools", element: <Tools /> },
      // Tools load on demand so the first screen stays light on slow mobile data.
      { path: "tools/scam-shield", lazy: async () => ({ Component: (await import("@/screens/tools/ScamShield")).ScamShield }) },
      { path: "tools/money", lazy: async () => ({ Component: (await import("@/screens/tools/MoneyPlanner")).MoneyPlanner }) },
      { path: "tools/cv", lazy: async () => ({ Component: (await import("@/screens/tools/CvStudio")).CvStudio }) },
      { path: "tools/english", lazy: async () => ({ Component: (await import("@/screens/tools/EnglishCoach")).EnglishCoach }) },
      { path: "tools/quiz", lazy: async () => ({ Component: (await import("@/screens/tools/KiwiQuiz")).KiwiQuiz }) },
      { path: "tools/courses", lazy: async () => ({ Component: (await import("@/screens/tools/Courses")).Courses }) },
      { path: "tools/documents", lazy: async () => ({ Component: (await import("@/screens/tools/Documents")).Documents }) },
      { path: "tools/occupations", lazy: async () => ({ Component: (await import("@/screens/tools/OccupationCheck")).OccupationCheck }) },
      { path: "community", lazy: async () => ({ Component: (await import("@/screens/Community")).Community }) },
      { path: "board", lazy: async () => ({ Component: (await import("@/screens/Board")).Board }) },
      { path: "board/new", lazy: async () => ({ Component: (await import("@/screens/PostListing")).PostListing }) },
      { path: "board/:id", lazy: async () => ({ Component: (await import("@/screens/ListingDetail")).ListingDetail }) },
      { path: "chats", lazy: async () => ({ Component: (await import("@/screens/Chats")).Chats }) },
      { path: "chats/:id", lazy: async () => ({ Component: (await import("@/screens/Chats")).ChatThread }) },
      { path: "guides", lazy: async () => ({ Component: (await import("@/screens/Guides")).Guides }) },
      { path: "guides/:slug", lazy: async () => ({ Component: (await import("@/screens/Guides")).GuideDetail }) },
      { path: "agencies", lazy: async () => ({ Component: (await import("@/screens/Agencies")).Agencies }) },
      { path: "groups", lazy: async () => ({ Component: (await import("@/screens/Groups")).Groups }) },
      { path: "groups/:slug", lazy: async () => ({ Component: (await import("@/screens/Groups")).GroupDetail }) },
      { path: "tools/sop", lazy: async () => ({ Component: (await import("@/screens/tools/SopBuilder")).SopBuilder }) },
      { path: "tools/savings", lazy: async () => ({ Component: (await import("@/screens/tools/SavingsPlanner")).SavingsPlanner }) },
      { path: "experts", lazy: async () => ({ Component: (await import("@/screens/Experts")).Experts }) },
      { path: "experts/manage", lazy: async () => ({ Component: (await import("@/screens/Experts")).ManageExperts }) },
      { path: "experts/:id", lazy: async () => ({ Component: (await import("@/screens/Experts")).ExpertDetail }) },
      { path: "tools/cost-of-living", lazy: async () => ({ Component: (await import("@/screens/tools/CostOfLiving")).CostOfLiving }) },
      { path: "tools/timeline", lazy: async () => ({ Component: (await import("@/screens/tools/Timeline")).Timeline }) },
      { path: "tools/jobs", lazy: async () => ({ Component: (await import("@/screens/tools/Jobs")).Jobs }) },
      { path: "assistant", lazy: async () => ({ Component: (await import("@/screens/tools/Assistant")).Assistant }) },
      { path: "tools/doc-check", lazy: async () => ({ Component: (await import("@/screens/tools/DocCheck")).DocCheck }) },
      { path: "me", lazy: async () => ({ Component: (await import("@/screens/Me")).Me }) },
      { path: "*", element: <NotFound /> },
    ],
  },
];

// Every screen reports crashes to the admin error log and shows a friendly page.
const routes: RouteObject[] = [{ errorElement: <RouteError />, children: pages }];

// The embedded preview can't change the page URL, so it routes in memory.
const router = IS_PREVIEW ? createMemoryRouter(routes, { initialEntries: [initialPreviewPath()] }) : createBrowserRouter(routes);

function initialPreviewPath(): string {
  // A plain #name in the preview link opens that screen, e.g. #scam-shield.
  const name = typeof location !== "undefined" ? location.hash.replace(/^#/, "") : "";
  const map: Record<string, string> = {
    welcome: "/welcome",
    paths: "/paths",
    board: "/board",
    tools: "/tools",
    "scam-shield": "/tools/scam-shield",
    money: "/tools/money",
    cv: "/tools/cv",
    english: "/tools/english",
    quiz: "/tools/quiz",
    community: "/community",
    me: "/me",
  };
  return map[name] ?? "/";
}

function useThemeAttribute() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      // In the preview the host owns the attribute; only clear one we set ourselves.
      if (root.dataset.kpTheme) {
        delete root.dataset.theme;
        delete root.dataset.kpTheme;
      }
    } else {
      root.dataset.theme = theme;
      root.dataset.kpTheme = "1";
    }
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#100F06" : "#F5F4ED");
  }, [theme]);
}

// Admins who just signed in go straight to the admin console (it still asks
// for the authenticator code). Later visits to the member app aren't redirected.
if (!IS_PREVIEW) {
  useMember.subscribe((state, prev) => {
    if (!state.userId || state.userId === prev.userId) return;
    const fresh = takeSignIn();
    if (fresh && state.isAdmin && !location.pathname.startsWith("/admin")) void router.navigate("/admin", { replace: true });
  });
}

export default function App() {
  useThemeAttribute();
  useEffect(() => startSync(), []);
  const userId = useAuth((s) => s.user?.id);
  useEffect(() => {
    void loadMember();
  }, [userId]);
  useEffect(() => {
    void loadRemoteContent();
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
      <Toaster />
      <UpgradeSheet />
    </MotionConfig>
  );
}
