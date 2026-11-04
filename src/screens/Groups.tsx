import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowUp, BadgeCheck, CalendarPlus, ChevronRight, MapPin, Users, Video } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { RequireMember } from "@/components/RequireMember";
import { Avatar, Card, Notice } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, Switch, TextArea, TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  createMeetup,
  fetchGroup,
  fetchGroupMessages,
  fetchGroups,
  fetchMeetups,
  joinGroup,
  postGroupMessage,
  subscribeGroup,
  type Group,
  type GroupMessage,
  type Meetup,
} from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { dayIn, timeIn, ZONES } from "@/lib/format";
import { useAuth } from "@/lib/sync";

const KIND_LABEL = { city: "Cities", path: "Paths", interest: "Interests" } as const;

export function Groups() {
  return (
    <Page title="Groups" back={{ to: "/community", label: "Community" }} lead="Private groups by city, path and interest. Chat and meet up without sharing your phone number.">
      {HAS_SUPABASE ? (
        <RequireMember reason="Sign in to join groups.">
          <GroupList />
        </RequireMember>
      ) : (
        <Notice title="Groups are online only">Groups, chat and meetups work in the online version of KiwiPath.</Notice>
      )}
    </Page>
  );
}

function GroupList() {
  const [data, setData] = useState<{ groups: Group[]; joined: Set<string> } | null>(null);
  const load = () => fetchGroups().then(setData, (e: Error) => toast(e.message, "warn"));
  useEffect(() => {
    void load();
  }, []);
  if (!data) return <div className="h-60 animate-pulse rounded-card bg-fill-2" />;
  const mine = data.groups.filter((g) => data.joined.has(g.id));
  return (
    <div className="flex flex-col gap-6">
      {mine.length > 0 && (
        <section className="flex flex-col gap-1.5" aria-label="Your groups">
          <h2 className="px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">Your groups</h2>
          <ul className="overflow-hidden rounded-tile bg-surface shadow-card">
            {mine.map((g) => (
              <li key={g.id} className="border-b border-sep last:border-b-0">
                <Link to={`/groups/${g.slug}`} className="flex min-h-16 items-center gap-3 px-4 hover:bg-fill">
                  <Avatar name={g.name} size={40} tint={g.kind === "city" ? "malibu" : g.kind === "path" ? "gold" : "lavender"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-headline font-semibold">{g.name}</span>
                    <span className="block text-footnote text-label-2">{g.member_count} members</span>
                  </span>
                  <ChevronRight className="size-5 text-label-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(["city", "path", "interest"] as const).map((kind) => (
        <section key={kind} className="flex flex-col gap-1.5" aria-label={KIND_LABEL[kind]}>
          <h2 className="px-4 text-footnote font-semibold tracking-wide text-label-2 uppercase">{KIND_LABEL[kind]}</h2>
          <ul className="flex flex-col gap-2">
            {data.groups
              .filter((g) => g.kind === kind)
              .map((g) => {
                const joined = data.joined.has(g.id);
                return (
                  <li key={g.id}>
                    <Card className="flex items-center gap-3 p-4">
                      <Link to={`/groups/${g.slug}`} className="min-w-0 flex-1">
                        <span className="block text-headline font-semibold">{g.name}</span>
                        <span className="block text-subhead text-label-2">{g.description}</span>
                        <span className="mt-1 inline-flex items-center gap-1 text-footnote text-label-3">
                          <Users className="size-3.5" aria-hidden /> {g.member_count}
                        </span>
                      </Link>
                      <Button
                        size="sm"
                        variant={joined ? "tinted" : "primary"}
                        onClick={async () => {
                          try {
                            await joinGroup(g.id, !joined);
                            toast(joined ? `Left ${g.name}` : `Joined ${g.name}`);
                            void load();
                          } catch (e) {
                            toast((e as Error).message, "warn");
                          }
                        }}
                      >
                        {joined ? "Leave" : "Join"}
                      </Button>
                    </Card>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function GroupDetail() {
  const { slug = "" } = useParams();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [tab, setTab] = useState<"chat" | "meetups">("chat");
  const [member, setMember] = useState<boolean | null>(null);

  useEffect(() => {
    if (!HAS_SUPABASE) return;
    fetchGroup(slug).then(setGroup, () => setGroup(null));
  }, [slug]);
  useEffect(() => {
    if (group) fetchGroups().then((d) => setMember(d.joined.has(group.id)), () => setMember(false));
  }, [group]);

  return (
    <Page title={group?.name ?? "Group"} back={{ to: "/groups", label: "Groups" }} lead={group?.description}>
      <RequireMember reason="Sign in to see this group.">
        {group === undefined || member === null ? (
          <div className="h-60 animate-pulse rounded-card bg-fill-2" />
        ) : group === null ? (
          <Notice tone="warn">This group doesn't exist.</Notice>
        ) : !member ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="size-8 text-label-3" aria-hidden />
            <p className="text-headline font-semibold">Join to read and post</p>
            <p className="text-subhead text-label-2">{group.member_count} members. Messages are only visible to members.</p>
            <Button
              onClick={async () => {
                await joinGroup(group.id).catch((e: Error) => toast(e.message, "warn"));
                setMember(true);
              }}
            >
              Join {group.name}
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <SegmentedControl
              label="Group section"
              value={tab}
              onChange={setTab}
              options={[
                { value: "chat", label: "Chat" },
                { value: "meetups", label: "Meetups" },
              ]}
            />
            {tab === "chat" ? <GroupChat group={group} /> : <Meetups group={group} />}
          </div>
        )}
      </RequireMember>
    </Page>
  );
}

function GroupChat({ group }: { group: Group }) {
  const me = useAuth((s) => s.user?.id);
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => fetchGroupMessages(group.id).then(setMessages, (e: Error) => toast(e.message, "warn"));
    void load();
    return subscribeGroup(group.id, () => void load());
  }, [group.id]);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [messages?.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      await postGroupMessage(group.id, body);
      setMessages(await fetchGroupMessages(group.id));
    } catch (e) {
      setDraft(body);
      toast((e as Error).message, "warn");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-tile bg-green-soft px-4 py-2.5 text-footnote text-label-2">Be kind and helpful. Never post phone numbers, bank details or passport information.</p>
      <ol className="flex min-h-[40vh] flex-col gap-2.5" aria-live="polite">
        {messages?.length === 0 && <li className="py-8 text-center text-subhead text-label-2">No messages yet. Say kia ora!</li>}
        {messages?.map((m) => {
          const mine = m.sender_id === me;
          return (
            <li key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
              {!mine && <Avatar name={m.sender?.display_name ?? "Member"} size={32} tint="lavender" />}
              <div className={cn("max-w-[78%] rounded-[1.25rem] px-4 py-2.5", mine ? "rounded-br-md bg-teal-ink text-white" : "rounded-bl-md bg-surface shadow-card")}>
                {!mine && (
                  <p className="mb-0.5 flex items-center gap-1 text-caption font-semibold text-label-2">
                    {m.sender?.display_name ?? "Member"}
                    {m.sender?.verified && <BadgeCheck className="size-3 text-teal-ink" aria-label="Verified" />}
                  </p>
                )}
                <p className="text-callout whitespace-pre-wrap">{m.body}</p>
                <p className={cn("mt-0.5 text-caption", mine ? "text-white/70" : "text-label-3")}>{timeIn(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date(m.created_at))}</p>
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
        <label htmlFor="group-draft" className="sr-only">
          Message {group.name}
        </label>
        <textarea
          id="group-draft"
          rows={1}
          maxLength={2000}
          value={draft}
          placeholder={`Message ${group.name}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-body outline-none"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-ink text-white disabled:opacity-40">
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}

function Meetups({ group }: { group: Group }) {
  const [items, setItems] = useState<Meetup[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = () => fetchMeetups(group.id).then(setItems, () => setItems([]));
  useEffect(() => {
    void load();
  }, [group.id]);
  return (
    <div className="flex flex-col gap-3">
      <Button variant="dark" icon={<CalendarPlus className="size-5" aria-hidden />} onClick={() => setOpen(true)}>
        Plan a meetup
      </Button>
      {items?.length === 0 && <p className="py-6 text-center text-subhead text-label-2">No meetups planned. Start one: coffee, a study session or a video call.</p>}
      <ul className="flex flex-col gap-3">
        {items?.map((m) => {
          const when = new Date(m.starts_at);
          return (
            <li key={m.id}>
              <Card className="p-4">
                <p className="text-footnote font-semibold text-teal-ink tabular">
                  {dayIn(ZONES.auckland, when)} · {timeIn(ZONES.auckland, when)} NZ · {timeIn(ZONES.colombo, when)} Sri Lanka
                </p>
                <p className="mt-1 text-headline font-semibold">{m.title}</p>
                {m.description && <p className="mt-1 text-subhead text-label-2">{m.description}</p>}
                {m.place && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-subhead">
                    <MapPin className="size-4" aria-hidden /> {m.place}
                  </p>
                )}
                {m.online_link && (
                  <a href={m.online_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-ink px-4 text-subhead font-semibold text-white">
                    <Video className="size-4" aria-hidden /> Join video call
                  </a>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      <MeetupSheet open={open} onClose={() => setOpen(false)} groupId={group.id} onCreated={() => void load()} />
    </div>
  );
}

function MeetupSheet({ open, onClose, groupId, onCreated }: { open: boolean; onClose: () => void; groupId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await createMeetup({ group_id: groupId, title: title.trim(), description: description.trim(), starts_at: new Date(when).toISOString(), place: place.trim(), online });
      toast("Meetup planned");
      onCreated();
      onClose();
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Plan a meetup" size="tall" footer={<Button block disabled={busy || title.trim().length < 3 || !when} onClick={submit}>Create meetup</Button>}>
      <div className="flex flex-col gap-4">
        <TextField label="Title" maxLength={90} placeholder="e.g. Newcomer coffee in Mt Albert" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField label="Date and time (your local time)" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <TextField label="Place (optional)" maxLength={120} placeholder="A public café or library" value={place} onChange={(e) => setPlace(e.target.value)} />
        <div className="flex items-center justify-between gap-3 rounded-tile bg-surface px-4 py-3 shadow-card">
          <div>
            <p className="text-body font-semibold">Add a video call</p>
            <p className="text-footnote text-label-2">Free Jitsi link, no app needed</p>
          </div>
          <Switch checked={online} onChange={setOnline} label="Add a video call" />
        </div>
        <TextArea label="Details (optional)" rows={3} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
        <p className="text-footnote text-label-2">Meet in public places. Never share your home address in a group.</p>
      </div>
    </Sheet>
  );
}
