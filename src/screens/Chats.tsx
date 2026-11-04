import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowUp, ChevronRight, MessageCircle } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { RequireMember } from "@/components/RequireMember";
import { Avatar, Card } from "@/components/ui/Bits";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { fetchConversations, fetchMessages, sendMessage, subscribeMessages, type Conversation, type Message } from "@/lib/community";
import { relativeDay } from "@/lib/format";
import { useAuth } from "@/lib/sync";

export function Chats() {
  return (
    <Page title="Messages" back={{ to: "/board", label: "Board" }}>
      <RequireMember reason="Sign in to message other members.">
        <ConversationList />
      </RequireMember>
    </Page>
  );
}

function ConversationList() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  useEffect(() => {
    fetchConversations().then(setItems, (e: Error) => {
      toast(e.message, "warn");
      setItems([]);
    });
  }, []);
  if (!items) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  if (!items.length)
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <MessageCircle className="size-8 text-label-3" aria-hidden />
        <p className="text-headline font-semibold">No messages yet</p>
        <p className="text-subhead text-label-2">Message someone from a Board listing and your chat will appear here.</p>
      </Card>
    );
  return (
    <ul className="overflow-hidden rounded-tile bg-surface shadow-card">
      {items.map((c) => (
        <li key={c.id} className="border-b border-sep last:border-b-0">
          <Link to={`/chats/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-fill">
            <Avatar name={c.other?.display_name ?? "Member"} size={44} tint="lavender" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-headline font-semibold">{c.other?.display_name ?? "Member"}</span>
              <span className="block truncate text-subhead text-label-2">{c.listing?.title ?? "Direct message"}</span>
            </span>
            <span className="shrink-0 text-footnote text-label-3">{relativeDay(c.last_message_at)}</span>
            <ChevronRight className="size-5 shrink-0 text-label-3" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ChatThread() {
  const { id = "" } = useParams();
  return (
    <Page title="Chat" back={{ to: "/chats", label: "Messages" }} hero={<div className="pb-2" />}>
      <RequireMember reason="Sign in to read your messages.">
        <Thread conversationId={id} />
      </RequireMember>
    </Page>
  );
}

function Thread({ conversationId }: { conversationId: string }) {
  const me = useAuth((s) => s.user?.id);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchMessages(conversationId).then((m) => active && setMessages(m), (e: Error) => toast(e.message, "warn"));
    const stop = subscribeMessages(conversationId, (m) => setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev)));
    return () => {
      active = false;
      stop();
    };
  }, [conversationId]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage(conversationId, body);
      setDraft("");
      const fresh = await fetchMessages(conversationId);
      setMessages(fresh);
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-tile bg-green-soft px-4 py-2.5 text-footnote text-label-2">
        Keep chats here until you trust someone. Never send a bond or deposit before viewing.
      </p>
      <ol className="flex min-h-[40vh] flex-col gap-2" aria-live="polite">
        {messages === null && <li className="h-24 animate-pulse rounded-tile bg-fill-2" />}
        {messages?.map((m) => {
          const mine = m.sender_id === me;
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-[1.25rem] px-4 py-2.5", mine ? "rounded-br-md bg-teal-ink text-white" : "rounded-bl-md bg-surface shadow-card")}>
                <p className="text-callout whitespace-pre-wrap">{m.body}</p>
                <p className={cn("mt-0.5 text-caption", mine ? "text-white/70" : "text-label-3")}>
                  {new Date(m.created_at).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={end} />
      <form
        className="sticky bottom-28 flex items-end gap-2 rounded-[1.6rem] bg-surface p-2 shadow-float lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="chat-draft" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-draft"
          rows={1}
          value={draft}
          maxLength={2000}
          placeholder="Write a message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-body outline-none"
        />
        <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-ink text-white disabled:opacity-40">
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
