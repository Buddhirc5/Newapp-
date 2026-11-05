import { useEffect, useRef, useState } from "react";
import { ArrowUp, ExternalLink, RotateCcw, Sparkles } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { aiErrorToast } from "@/components/UpgradeSheet";
import { cn } from "@/lib/cn";
import { askAssistant } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { useApp, type ChatMessage } from "@/store/app";

const STARTERS = [
  "What English score do I need for a Masters student visa?",
  "How much money should I show for a student visa?",
  "Can my partner work if I come on a student visa?",
  "How do I find employers who can sponsor a work visa?",
  "Is it safe to pay an agent for a job in New Zealand?",
  "What should I do in my first week in New Zealand?",
];

/** Ask KiwiPath's AI assistant about moving to New Zealand. Uses the member's daily AI limit. */
export function Assistant() {
  const chat = useApp((s) => s.chat);
  const setChat = useApp((s) => s.setChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, busy]);

  const send = async (question: string) => {
    const q = question.trim().slice(0, 1500);
    if (!q || busy) return;
    const next: ChatMessage[] = [...chat, { role: "user", text: q, at: new Date().toISOString() }];
    setChat(next);
    setText("");
    setBusy(true);
    try {
      const res = await askAssistant(next.slice(-10).map((m) => ({ role: m.role, text: m.text })));
      setLeft(res.remaining);
      setChat([...next, { role: "assistant", text: res.result.answer, links: res.result.links, followUps: res.result.follow_ups, at: new Date().toISOString() }]);
    } catch (e) {
      aiErrorToast(e);
      // Put the question back so it can be sent again.
      setChat(chat);
      setText(q);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  };

  const last = chat[chat.length - 1];

  return (
    <Page
      title="Ask KiwiPath"
      back={{ to: "/tools", label: "Tools" }}
      lead="Questions about visas, study, jobs, money or settling in. Answers use your saved journey and point to official pages."
      actions={
        chat.length > 0 ? (
          <button type="button" onClick={() => setChat([])} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-subhead font-semibold text-teal-ink" aria-label="Start a new chat">
            <RotateCcw className="size-4" aria-hidden />
            New
          </button>
        ) : undefined
      }
    >
      <div className="flex min-h-[55dvh] flex-col gap-4 pb-32 lg:pb-24">
        {chat.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <Mascot mood="happy" pose="wave" className="w-28" />
            <p className="max-w-sm text-subhead text-label-2">Try one of these, or ask your own question.</p>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)} className="rounded-2xl bg-surface px-4 py-3 text-left text-subhead font-medium shadow-card transition-transform active:scale-[0.98]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <ol className="flex flex-col gap-3" aria-live="polite">
          {chat.map((m, i) => (
            <li key={`${m.at}-${i}`} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%] rounded-[1.4rem] px-4 py-3 text-callout sm:max-w-[75%]", m.role === "user" ? "rounded-br-md bg-teal-ink text-white" : "rounded-bl-md bg-surface shadow-card")}>
                {m.role === "assistant" && (
                  <p className="mb-1 flex items-center gap-1.5 text-caption font-bold text-label-2">
                    <Sparkles className="size-3.5 text-pink" aria-hidden />
                    KIWIPATH
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.links && m.links.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {m.links.map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-subhead font-semibold text-teal-ink underline-offset-2 hover:underline">
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                          {l.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className="flex justify-start">
              <div className="flex gap-1.5 rounded-[1.4rem] rounded-bl-md bg-surface px-4 py-4 shadow-card" aria-label="KiwiPath is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-2 animate-bounce rounded-full bg-label-3" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            </li>
          )}
        </ol>

        {!busy && last?.role === "assistant" && last.followUps && last.followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {last.followUps.map((f) => (
              <button key={f} type="button" onClick={() => void send(f)} className="rounded-full bg-fill px-3.5 py-2 text-footnote font-semibold">
                {f}
              </button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 gutter-x pb-2 lg:bottom-4 lg:left-72"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[1.6rem] bg-surface p-2 shadow-float ring-1 ring-sep">
          <textarea
            ref={input}
            rows={1}
            value={text}
            maxLength={1500}
            disabled={!HAS_SUPABASE}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder={HAS_SUPABASE ? "Ask about visas, jobs, money…" : "The assistant needs the online version"}
            aria-label="Your question"
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-callout outline-none placeholder:text-label-3"
          />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-ink text-white transition-opacity disabled:opacity-40">
            <ArrowUp className="size-5" aria-hidden />
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-3xl px-3 text-caption text-label-3">
          General information, not immigration advice.{left !== null ? ` ${left} AI requests left today.` : ""}
        </p>
      </form>
    </Page>
  );
}
