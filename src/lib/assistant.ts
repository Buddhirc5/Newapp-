import { useState } from "react";
import { aiErrorToast } from "@/components/UpgradeSheet";
import { toast } from "@/components/ui/Toast";
import { DOCUMENT_BY_ID } from "@/data/documents";
import { CITIES, CITY_BY_ID } from "@/data/places";
import { askAssistant, updateMember, type AssistantAction } from "@/lib/community";
import { useContent } from "@/lib/content";
import { HAS_SUPABASE } from "@/lib/env";
import { useAuth } from "@/lib/sync";
import { useApp, type ChatMessage } from "@/store/app";
import type { CityId, DocStatus, PathId } from "@/types";

/** Screens the assistant may open. */
export const APP_PATHS: Record<string, string> = {
  "/": "Journey home",
  "/tools/timeline": "My Timeline",
  "/tools/documents": "Visa documents tracker",
  "/tools/money": "Money Planner",
  "/tools/cost-of-living": "Cost of living by city",
  "/tools/jobs": "Live jobs",
  "/tools/cv": "CV Studio",
  "/tools/sop": "SOP Builder",
  "/tools/english": "English Coach",
  "/tools/scam-shield": "Scam Shield",
  "/tools/doc-check": "AI Document Check",
  "/tools/courses": "Course shortlist",
  "/tools/savings": "Loan & savings planner",
  "/tools/occupations": "Occupation check",
  "/paths": "Visa paths",
  "/guides": "Guides",
  "/experts": "Book an expert",
  "/agencies": "Checked agencies",
  "/community": "Community groups",
  "/board": "Board (rooms, pickups, jobs)",
};
const PATH_IDS: PathId[] = ["student", "worker", "registered", "family", "business"];

/** A compact list of what the assistant is allowed to change, with real IDs. */
function appContext(): Record<string, string> {
  const s = useApp.getState();
  const pathway = useContent.getState().pathways[s.pathId];
  const tasks = (pathway?.levels ?? []).flatMap((l) => l.tasks).filter((t) => !s.tasks[t.id]).slice(0, 14);
  return {
    path: s.pathId,
    city: s.profile.city,
    target: s.targetMonth ?? "",
    cities: CITIES.map((c) => c.id).join(", "),
    docs: (pathway?.documents ?? []).map((id) => `${id} (${s.docs[id] ?? "todo"}${s.docDates[id]?.issued ? `, issued ${s.docDates[id].issued}` : ""}${s.docDates[id]?.expires ? `, expires ${s.docDates[id].expires}` : ""})`).join("; "),
    tasks: tasks.map((t) => `${t.id} = ${t.title}`).join("; "),
    paths: Object.keys(APP_PATHS).join(", "),
  };
}

/** Applies one suggested change after the member taps it. Returns false if it isn't valid. */
export function applyAction(a: AssistantAction, navigate: (to: string) => void): boolean {
  const s = useApp.getState();
  const date = /^\d{4}-\d{2}-\d{2}$/;
  switch (a.type) {
    case "set_target_month":
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(a.target)) return false;
      s.setTargetMonth(a.target);
      return true;
    case "set_city": {
      const city = CITY_BY_ID[a.target as CityId];
      if (!city) return false;
      s.setProfile({ city: city.id });
      s.setMoney({ city: city.id });
      if (HAS_SUPABASE && useAuth.getState().user) void updateMember({ city: city.id === "undecided" ? "" : city.name }).catch(() => undefined);
      return true;
    }
    case "set_path":
      if (!PATH_IDS.includes(a.target as PathId)) return false;
      s.setPath(a.target as PathId);
      return true;
    case "set_doc_status":
      if (!DOCUMENT_BY_ID[a.target] || !["todo", "doing", "done"].includes(a.value)) return false;
      s.setDoc(a.target, a.value as DocStatus);
      return true;
    case "set_doc_date": {
      const [field, value] = a.value.split("=");
      if (!DOCUMENT_BY_ID[a.target] || !["issued", "expires"].includes(field) || !date.test(value ?? "")) return false;
      s.setDocDates(a.target, { [field]: value });
      return true;
    }
    case "complete_task": {
      const exists = Object.values(useContent.getState().pathways).some((p) => p.levels.some((l) => l.tasks.some((t) => t.id === a.target)));
      if (!exists) return false;
      s.toggleTask(a.target, true);
      return true;
    }
    case "open":
      if (!APP_PATHS[a.target]) return false;
      navigate(a.target);
      return true;
    default:
      return false;
  }
}

/** Shared chat state for the assistant page and the floating button. */
export function useAssistant() {
  const chat = useApp((s) => s.chat);
  const setChat = useApp((s) => s.setChat);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  const send = async (question: string) => {
    const q = question.trim().slice(0, 1500);
    if (!q || busy) return false;
    const before = useApp.getState().chat;
    const next: ChatMessage[] = [...before, { role: "user", text: q, at: new Date().toISOString() }];
    setChat(next);
    setBusy(true);
    try {
      const res = await askAssistant(
        next.slice(-10).map((m) => ({ role: m.role, text: m.text })),
        appContext(),
      );
      setLeft(res.remaining);
      setChat([
        ...next,
        { role: "assistant", text: res.result.answer, links: res.result.links, followUps: res.result.follow_ups, actions: res.result.actions ?? [], at: new Date().toISOString() },
      ]);
      return true;
    } catch (e) {
      aiErrorToast(e);
      setChat(before);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const apply = (msgIndex: number, actionIndex: number, navigate: (to: string) => void) => {
    const msg = useApp.getState().chat[msgIndex];
    const a = msg?.actions?.[actionIndex];
    if (!a || a.done) return;
    const ok = applyAction(a as AssistantAction, navigate);
    if (!ok) return toast("That change isn't available. Try asking again.", "warn");
    if (a.type !== "open") toast(`Done: ${a.label}`);
    const chatNow = useApp.getState().chat.map((m, i) => (i === msgIndex ? { ...m, actions: m.actions?.map((x, j) => (j === actionIndex ? { ...x, done: true } : x)) } : m));
    setChat(chatNow);
  };

  return { chat, busy, left, send, apply, clear: () => setChat([]) };
}
