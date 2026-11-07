import { useEffect, useState } from "react";
import { HAS_SUPABASE } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/sync";

/**
 * Live "who's online" using Supabase Realtime presence. Members only share a
 * random key per open app (no name or email), so admins see a count, not who.
 */
const CHANNEL = "kp-online";
const tabKey = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);

/** Joins the online channel while a member is signed in and the app is open. */
export function useOnlinePresence() {
  const userId = useAuth((s) => s.user?.id);
  useEffect(() => {
    if (!HAS_SUPABASE || !userId) return;
    let stop = () => {};
    let cancelled = false;
    void getSupabase()?.then((sb) => {
      if (!sb || cancelled) return;
      const ch = sb.channel(CHANNEL, { config: { presence: { key: tabKey } } });
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") void ch.track({ at: Date.now(), screen: location.pathname.split("/")[1] || "home" });
      });
      stop = () => void sb.removeChannel(ch);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [userId]);
}

/** Admin side: live count of open apps (and which area they're in). */
export function useOnlineCount(): { total: number; byScreen: Record<string, number> } {
  const [state, setState] = useState({ total: 0, byScreen: {} as Record<string, number> });
  useEffect(() => {
    if (!HAS_SUPABASE) return;
    let stop = () => {};
    let cancelled = false;
    void getSupabase()?.then((sb) => {
      if (!sb || cancelled) return;
      // Admins listen without being counted themselves.
      const ch = sb.channel(CHANNEL);
      const update = () => {
        const all = Object.values(ch.presenceState()).flat() as unknown as { screen?: string }[];
        const byScreen: Record<string, number> = {};
        for (const p of all) byScreen[p.screen ?? "home"] = (byScreen[p.screen ?? "home"] ?? 0) + 1;
        setState({ total: all.length, byScreen });
      };
      ch.on("presence", { event: "sync" }, update).subscribe();
      stop = () => void sb.removeChannel(ch);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return state;
}
