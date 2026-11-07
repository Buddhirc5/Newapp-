import { HAS_SUPABASE } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/sync";

/**
 * Feature usage tracking: which screens and actions members use, so admins can
 * see what's useful. Only event names and screen paths are sent (ids are
 * replaced with ":id"); never anything a member typed.
 */
type Ev = { event: string; detail?: string };
let queue: Ev[] = [];
let timer = 0;

/** "/board/8f2c…" → "/board/:id", "/groups/auckland" stays (it's a public name). */
export function screenName(path: string): string {
  return (
    path
      .split("?")[0]
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id")
      .replace(/\/\d+(?=\/|$)/g, "/:id")
      .replace(/\/$/, "") || "/"
  );
}

async function flush() {
  window.clearTimeout(timer);
  timer = 0;
  if (!queue.length || !useAuth.getState().user) {
    queue = [];
    return;
  }
  const batch = queue.splice(0, 40);
  try {
    const sb = await getSupabase();
    await sb?.rpc("track_events", { p_events: batch });
  } catch {
    /* tracking must never get in the way */
  }
}

/** Records one event (sent in small batches). */
export function track(event: string, detail = "") {
  if (!HAS_SUPABASE || typeof window === "undefined") return;
  queue.push({ event: event.toLowerCase().slice(0, 60), detail: detail.slice(0, 120) });
  if (queue.length >= 20) void flush();
  else if (!timer) timer = window.setTimeout(() => void flush(), 4000);
}

let lastView = "";
/** Records a screen view, once per change of screen. */
export function trackView(path: string) {
  const name = screenName(path);
  if (name === lastView) return;
  lastView = name;
  track("view", name);
}

if (typeof window !== "undefined") {
  // Send what's queued when the member leaves or switches app.
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && void flush());
}
