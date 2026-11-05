import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowUp, Check, ExternalLink, Sparkles, Wand2 } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { cn } from "@/lib/cn";
import { HAS_SUPABASE } from "@/lib/env";
import type { useAssistant } from "@/lib/assistant";

export const STARTERS = [
  "Plan my timeline to arrive next year",
  "What English score do I need for a Masters?",
  "How much money should I show for a student visa?",
  "Which city is cheapest for a student?",
  "How do I find employers who can sponsor a visa?",
  "Is it safe to pay an agent for a job in NZ?",
];

type Assistant = ReturnType<typeof useAssistant>;

/** The conversation: starters, messages, suggested changes and follow-ups. */
export function ChatThread({ a, compact, onNavigate }: { a: Assistant; compact?: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [a.chat.length, a.busy]);
  const last = a.chat[a.chat.length - 1];
  const go = (to: string) => {
    onNavigate?.();
    navigate(to);
  };

  return (
    <div className="flex flex-col gap-4">
      {a.chat.length === 0 && (
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          {!compact && <Mascot mood="happy" pose="wave" className="w-28" />}
          <p className="max-w-sm text-subhead text-label-2">Ask anything, or ask me to set things up, like your arrival date or document dates.</p>
          <div className={cn("grid w-full gap-2", !compact && "sm:grid-cols-2")}>
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => void a.send(s)} className="rounded-2xl bg-surface px-4 py-3 text-left text-subhead font-medium shadow-card ring-1 ring-sep transition-transform active:scale-[0.98]">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-3" aria-live="polite">
        {a.chat.map((m, i) => (
          <li key={`${m.at}-${i}`} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] rounded-[1.4rem] px-4 py-3 text-callout", !compact && "sm:max-w-[75%]", m.role === "user" ? "rounded-br-md bg-teal-ink text-white" : "rounded-bl-md bg-surface shadow-card ring-1 ring-sep")}>
              {m.role === "assistant" && (
                <p className="mb-1 flex items-center gap-1.5 text-caption font-bold text-label-2">
                  <Sparkles className="size-3.5 text-pink" aria-hidden />
                  KIWIPATH
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {m.actions.map((x, j) => (
                    <button
                      key={`${x.type}-${j}`}
                      type="button"
                      disabled={x.done}
                      onClick={() => a.apply(i, j, go)}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-left text-subhead font-semibold transition-colors",
                        x.done ? "bg-green-soft text-green-ink" : "bg-night text-paper hover:opacity-90 dark:bg-gold dark:text-ink",
                      )}
                    >
                      {x.done ? <Check className="size-4 shrink-0" aria-hidden /> : <Wand2 className="size-4 shrink-0" aria-hidden />}
                      <span className="min-w-0">{x.done ? `Done: ${x.label}` : x.label}</span>
                    </button>
                  ))}
                </div>
              )}
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
        {a.busy && (
          <li className="flex justify-start">
            <div className="flex gap-1.5 rounded-[1.4rem] rounded-bl-md bg-surface px-4 py-4 shadow-card" aria-label="KiwiPath is typing">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-2 animate-bounce rounded-full bg-label-3" style={{ animationDelay: `${d * 120}ms` }} />
              ))}
            </div>
          </li>
        )}
      </ol>

      {!a.busy && last?.role === "assistant" && last.followUps && last.followUps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {last.followUps.map((f) => (
            <button key={f} type="button" onClick={() => void a.send(f)} className="rounded-full bg-fill px-3.5 py-2 text-footnote font-semibold">
              {f}
            </button>
          ))}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}

/** The question box with a send button. */
export function Composer({ a, autoFocus }: { a: Assistant; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  const submit = async () => {
    const q = text;
    if (!q.trim()) return;
    setText("");
    const ok = await a.send(q);
    if (!ok) setText(q);
    input.current?.focus();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-[1.6rem] bg-surface p-2 shadow-float ring-1 ring-sep">
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
              void submit();
            }
          }}
          placeholder={HAS_SUPABASE ? "Ask, or say “set my arrival to March”" : "Needs the online version"}
          aria-label="Your question"
          className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-callout text-label outline-none placeholder:text-label-3"
        />
        <button type="submit" disabled={!text.trim() || a.busy} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-ink text-white transition-opacity disabled:opacity-40">
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </div>
      <p className="mt-1 px-3 text-caption text-label-3">
        General information, not immigration advice. Changes only happen when you tap them.{a.left !== null ? ` ${a.left} AI requests left today.` : ""}
      </p>
    </form>
  );
}
