import { useEffect } from "react";
import { createBrowserRouter, createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { MotionConfig } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/Toast";
import { IS_PREVIEW } from "@/lib/env";
import { loadRemoteContent } from "@/lib/content";
import { startSync } from "@/lib/sync";
import { useApp } from "@/store/app";
import { Journey } from "@/screens/Journey";
import { NotFound } from "@/screens/NotFound";
import { Paths } from "@/screens/Paths";
import { Tools } from "@/screens/Tools";
import { Welcome } from "@/screens/Welcome";

const routes: RouteObject[] = [
  { path: "/welcome", element: <Welcome /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Journey /> },
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
      { path: "me", lazy: async () => ({ Component: (await import("@/screens/Me")).Me }) },
      { path: "*", element: <NotFound /> },
    ],
  },
];

// The embedded preview can't change the page URL, so it routes in memory.
const router = IS_PREVIEW ? createMemoryRouter(routes, { initialEntries: [initialPreviewPath()] }) : createBrowserRouter(routes);

function initialPreviewPath(): string {
  // A plain #name in the preview link opens that screen, e.g. #scam-shield.
  const name = typeof location !== "undefined" ? location.hash.replace(/^#/, "") : "";
  const map: Record<string, string> = {
    welcome: "/welcome",
    paths: "/paths",
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

export default function App() {
  useThemeAttribute();
  useEffect(() => startSync(), []);
  useEffect(() => {
    void loadRemoteContent();
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>
  );
}
