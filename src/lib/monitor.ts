import { HAS_SUPABASE } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

/** Build identifier shown next to each error, so admins can tell old builds from new. */
export const RELEASE = (import.meta.env.VITE_RELEASE as string | undefined) ?? __BUILD_ID__;

const seen = new Map<string, number>();
let sent = 0;

/** Sends one error to the admin error log. Repeats and noise are dropped; never throws. */
export async function reportError(error: unknown, extra = ""): Promise<void> {
  if (!HAS_SUPABASE) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const message = `${err.name}: ${err.message}`.slice(0, 500);
  // Browser extensions and lost connections aren't app bugs.
  if (/ResizeObserver loop|Failed to fetch|Load failed|NetworkError|chrome-extension:|moz-extension:|AbortError/i.test(`${message} ${err.stack ?? ""}`)) return;
  const key = message + (err.stack ?? "").split("\n")[1];
  const now = Date.now();
  if ((seen.get(key) ?? 0) > now - 60_000 || sent >= 20) return;
  seen.set(key, now);
  sent += 1;
  try {
    const sb = await getSupabase();
    await sb?.rpc("log_client_error", {
      p_message: message,
      p_stack: `${extra ? `${extra}\n` : ""}${err.stack ?? ""}`.slice(0, 4000),
      p_url: location.pathname.slice(0, 300),
      p_release: RELEASE,
      p_user_agent: navigator.userAgent.slice(0, 300),
    });
  } catch {
    /* monitoring must never break the app */
  }
}

/** Catches uncaught errors and unhandled promise rejections. */
export function startMonitoring() {
  if (!HAS_SUPABASE || typeof window === "undefined") return;
  window.addEventListener("error", (e) => void reportError(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => void reportError(e.reason, "unhandled promise"));
}

export interface ClientError {
  id: number;
  user_id: string | null;
  message: string;
  stack: string;
  url: string;
  release: string;
  user_agent: string;
  created_at: string;
}

export async function fetchErrors(): Promise<ClientError[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("client_errors").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []) as ClientError[];
}

export async function clearErrors(): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.from("client_errors").delete().gt("id", 0);
  if (error) throw error;
}
