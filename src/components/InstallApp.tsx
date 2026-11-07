import { useState } from "react";
import { create } from "zustand";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { track } from "@/lib/track";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "kp-install-dismissed";

/** Holds the browser's install prompt (Android / desktop Chrome) once it fires. */
const useInstall = create<{ prompt: InstallPrompt | null; installed: boolean }>(() => ({
  prompt: null,
  installed: typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true),
}));

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    useInstall.setState({ prompt: e as InstallPrompt });
  });
  window.addEventListener("appinstalled", () => useInstall.setState({ installed: true, prompt: null }));
}

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** True when installing is possible here (or the iPhone steps apply). */
export function useCanInstall() {
  const { prompt, installed } = useInstall();
  return !installed && (Boolean(prompt) || isIos());
}

/** Starts installing: the browser's own prompt, or the iPhone steps. */
export function useInstallAction() {
  const prompt = useInstall((s) => s.prompt);
  const [iosOpen, setIosOpen] = useState(false);
  const run = async () => {
    track("install:tap", prompt ? "prompt" : "ios-steps");
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") useInstall.setState({ installed: true, prompt: null });
      return;
    }
    if (isIos()) setIosOpen(true);
  };
  const sheet = (
    <Sheet open={iosOpen} onClose={() => setIosOpen(false)} title="Add KiwiPath to your home screen" description="It opens like an app, full screen, and loads faster.">
      <ol className="flex flex-col gap-4 text-callout">
        <li className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill">
            <Share className="size-5" aria-hidden />
          </span>
          <span>
            Tap <b>Share</b> at the bottom of Safari (or the ••• menu in Chrome).
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill">
            <PlusSquare className="size-5" aria-hidden />
          </span>
          <span>
            Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.
          </span>
        </li>
      </ol>
    </Sheet>
  );
  return { run, sheet };
}

/** A dismissible card on the home screen inviting people to install the app. */
export function InstallCard({ className }: { className?: string }) {
  const can = useCanInstall();
  const { run, sheet } = useInstallAction();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!can || hidden) return sheet;
  return (
    <>
      <div className={cn("flex items-center gap-3 rounded-[1.4rem] bg-surface p-3 pr-2 shadow-card", className)}>
        <img src="/pwa-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-subhead font-semibold">Install KiwiPath</p>
          <p className="text-footnote text-label-2">Open it from your home screen like an app</p>
        </div>
        <button type="button" onClick={() => void run()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-teal-ink px-4 text-subhead font-semibold text-white">
          <Download className="size-4" aria-hidden />
          Install
        </button>
        <button
          type="button"
          aria-label="Not now"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* private mode */
            }
            setHidden(true);
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full text-label-2 hover:bg-fill"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {sheet}
    </>
  );
}
