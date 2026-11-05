import { useEffect } from "react";
import { useRouteError } from "react-router";
import { Mascot } from "@/components/Mascot";
import { reportError } from "@/lib/monitor";

const RELOAD_KEY = "kp-chunk-reload";

/** Shown when a screen crashes. Reports the error, and reloads once if a new version was deployed meanwhile. */
export function RouteError() {
  const error = useRouteError();
  const stale = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(String((error as Error)?.message ?? error));

  useEffect(() => {
    if (stale) {
      try {
        if (sessionStorage.getItem(RELOAD_KEY) !== location.pathname) {
          sessionStorage.setItem(RELOAD_KEY, location.pathname);
          location.reload();
          return;
        }
      } catch {
        /* storage blocked */
      }
    }
    void reportError(error, "route error");
  }, [error, stale]);

  return (
    <div className="grid min-h-dvh place-items-center gutter-x">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Mascot mood="worried" className="w-28" />
        <h1 className="type-display text-title1">Something went wrong</h1>
        <p className="text-subhead text-label-2">{stale ? "KiwiPath was just updated. Reload to get the new version." : "We've been told about it. Try again, or go back to your journey."}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => location.reload()} className="min-h-11 rounded-full bg-night px-5 text-subhead font-semibold text-paper">
            Reload
          </button>
          <a href="/" className="inline-flex min-h-11 items-center rounded-full bg-fill px-5 text-subhead font-semibold">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
