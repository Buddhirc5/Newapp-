import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarCheck, Flag, Globe2, MapPin, MessageCircle, Newspaper, ShieldAlert, UserPlus, Users } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Avatar, Card, Notice, SectionHeader, Tag } from "@/components/ui/Bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SegmentedControl, TextArea, TextField } from "@/components/ui/Controls";
import { AlertDialog, Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { MENTOR_HOURS_NZ, SAMPLE_MENTORS, type Mentor } from "@/data/mentors";
import { cn } from "@/lib/cn";
import { datePartsIn, dayIn, formatLkr, relativeDay, timeIn, zonedTime, ZONES } from "@/lib/format";
import { usePathways } from "@/lib/content";
import { useT } from "@/lib/i18n";
import { fetchNews, type NewsItem } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { joinWaitlistRemote, requestBooking } from "@/lib/remote";
import { useApp } from "@/store/app";
import type { PathId } from "@/types";

const PATTERNS = [
  {
    title: "Pay a 'processing fee' for a farm or factory job",
    channel: "WhatsApp and Facebook groups",
    detail: "Promises high pay for unskilled work, then asks for Rs 300,000–600,000 to 'reserve' a place. The job doesn't exist.",
  },
  {
    title: "Fake offer letter with a real company's logo",
    channel: "Email from a free address",
    detail: "Copies a real NZ employer's branding, then asks you to pay the 'visa fee' to an agent instead of applying with Immigration NZ.",
  },
  {
    title: "Come on a visitor visa and we'll convert it",
    channel: "Agents and social media",
    detail: "Visitor visas don't allow work. People who follow this advice risk deportation and future visa refusals.",
  },
  {
    title: "Calls claiming you owe Immigration NZ a fine",
    channel: "Phone",
    detail: "The caller threatens deportation unless you pay immediately by transfer or gift cards. Immigration NZ doesn't collect payments this way.",
  },
];

export function Community() {
  const t = useT();
  const [tab, setTab] = useState<"news" | "mentors" | "alerts">("news");
  return (
    <Page title={t("community.title")} lead="Learn from Sri Lankans who've made the move, and help others avoid scams.">
      <div className="flex flex-col gap-6">
        <SegmentedControl
          label="Community section"
          value={tab}
          onChange={setTab}
          options={[
            { value: "news", label: "News" },
            { value: "mentors", label: "Mentors" },
            { value: "alerts", label: "Scam alerts" },
          ]}
        />
        <ButtonLink to="/groups" variant="dark" icon={<Users className="size-5" aria-hidden />}>
          Your groups: chat and meetups
        </ButtonLink>
        {tab === "news" ? <News /> : tab === "mentors" ? <Mentors /> : <Alerts />}
      </div>
    </Page>
  );
}

function Mentors() {
  const bookings = useApp((s) => s.bookings);
  const cancelBooking = useApp((s) => s.cancelBooking);
  const [filter, setFilter] = useState<PathId | "all">("all");
  const [booking, setBooking] = useState<Mentor | null>(null);
  const [joining, setJoining] = useState(false);
  const [cancel, setCancel] = useState<string | null>(null);
  const pathways = usePathways();
  const mentors = SAMPLE_MENTORS.filter((m) => filter === "all" || m.path === filter);

  return (
    <div className="flex flex-col gap-5">
      <Notice title="Sample profiles">
        These mentors are examples to show how booking works. Real mentors are identity-checked before they're listed, and sessions are general
        guidance, not immigration advice.
      </Notice>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Filter mentors by path">
        {(["all", "student", "worker", "registered", "family"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={filter === p}
            onClick={() => setFilter(p)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-subhead font-semibold transition-colors",
              filter === p ? "bg-night text-paper" : "bg-surface text-label shadow-card hover:bg-surface-2",
            )}
          >
            {p === "all" ? "All" : pathways[p].name}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {mentors.map((m) => (
          <li key={m.id}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={m.role} tint={m.tint} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-semibold tracking-wide text-label-2 uppercase">Sample profile</p>
                  <p className="text-headline font-semibold">{m.role}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-footnote text-label-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden /> {m.city}
                    </span>
                    <span>{m.yearsInNz} years in NZ</span>
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="size-3.5" aria-hidden /> {m.languages.join(", ")}
                    </span>
                  </p>
                </div>
              </div>
              <p className="mt-3 text-subhead text-label-2">{m.bio}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
                {m.topics.map((topic) => (
                  <li key={topic} className="rounded-full bg-fill-2 px-2.5 py-1 text-footnote font-medium">
                    {topic}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-subhead whitespace-nowrap tabular">
                  <span className="font-bold">{formatLkr(m.priceLkr)}</span>
                  <span className="text-label-2"> / 30 min</span>
                </p>
                <Button size="md" className="whitespace-nowrap" onClick={() => setBooking(m)} icon={<MessageCircle className="size-4" aria-hidden />} aria-label={`Request a session with the ${m.role.toLowerCase()} mentor`}>
                  Request
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {bookings.length > 0 && (
        <section aria-labelledby="my-requests" className="flex flex-col gap-3">
          <SectionHeader id="my-requests" title="Your requests" />
          <Card className="divide-y divide-sep">
            {bookings.map((b) => {
              const mentor = SAMPLE_MENTORS.find((m) => m.id === b.mentorId);
              const when = new Date(b.slotIso);
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <CalendarCheck className="size-5 shrink-0 text-teal" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-callout font-semibold">{mentor?.role ?? "Mentor"}</p>
                    <p className="text-footnote text-label-2 tabular">
                      {dayIn(ZONES.colombo, when)}, {timeIn(ZONES.colombo, when)} Sri Lanka · {timeIn(ZONES.auckland, when)} NZ · requested {relativeDay(b.createdAt).toLowerCase()}
                    </p>
                  </div>
                  <Button size="sm" variant="plain" className="text-coral-ink" onClick={() => setCancel(b.id)}>
                    Cancel
                  </Button>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      <section className="flex items-center gap-4 rounded-[2rem] bg-teal-ink p-5 text-white">
        <UserPlus className="size-8 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-headline font-semibold">Living in NZ already?</h2>
          <p className="text-subhead text-white/80">Become a mentor and earn by helping people from home.</p>
        </div>
        <Button variant="light" size="sm" onClick={() => setJoining(true)}>
          Apply
        </Button>
      </section>

      <BookingSheet mentor={booking} onClose={() => setBooking(null)} />
      <MentorWaitlistSheet open={joining} onClose={() => setJoining(false)} />
      <AlertDialog
        open={cancel !== null}
        title="Cancel this request?"
        message="The mentor will be told you no longer need the session."
        confirmLabel="Cancel request"
        cancelLabel="Keep"
        destructive
        onCancel={() => setCancel(null)}
        onConfirm={() => {
          if (cancel) cancelBooking(cancel);
          setCancel(null);
          toast("Request cancelled", "info");
        }}
      />
    </div>
  );
}

function BookingSheet({ mentor, onClose }: { mentor: Mentor | null; onClose: () => void }) {
  const addBooking = useApp((s) => s.addBooking);
  const days = useMemo(() => {
    const today = datePartsIn(ZONES.auckland, new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.UTC(today.y, today.m - 1, today.d + i + 1));
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth() + 1;
      const d = date.getUTCDate();
      return { key: `${y}-${m}-${d}`, slots: MENTOR_HOURS_NZ.map((h) => zonedTime(ZONES.auckland, y, m, d, h)) };
    });
  }, []);
  const [dayKey, setDayKey] = useState(days[0].key);
  const [slot, setSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const day = days.find((d) => d.key === dayKey) ?? days[0];

  const submit = async () => {
    if (!mentor || !slot) return;
    setBusy(true);
    const res = await requestBooking({ mentorId: mentor.id, slotIso: slot, topic });
    setBusy(false);
    if (!res.ok) {
      toast(`Couldn't send: ${res.message}`, "warn");
      return;
    }
    addBooking({ mentorId: mentor.id, slotIso: slot, topic });
    toast(res.remote ? "Request sent to the mentor" : "Request saved on this device");
    setSlot(null);
    setTopic("");
    onClose();
  };

  return (
    <Sheet
      open={mentor !== null}
      onClose={onClose}
      title="Request a session"
      description={mentor ? `${mentor.role} · ${formatLkr(mentor.priceLkr)} for 30 minutes. You only pay once the mentor confirms.` : undefined}
      size="tall"
      footer={
        <Button block disabled={!slot || busy} onClick={submit}>
          {busy ? "Sending…" : slot ? `Request ${timeIn(ZONES.colombo, new Date(slot))} Sri Lanka time` : "Choose a time"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="px-1 text-subhead font-semibold">Day</p>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5" role="radiogroup" aria-label="Day">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                role="radio"
                aria-checked={d.key === dayKey}
                onClick={() => {
                  setDayKey(d.key);
                  setSlot(null);
                }}
                className={cn(
                  "min-h-16 min-w-16 shrink-0 rounded-2xl px-3 text-center text-footnote font-semibold",
                  d.key === dayKey ? "bg-teal-ink text-white" : "bg-surface shadow-card",
                )}
              >
                {dayIn(ZONES.colombo, d.slots[0]).split(" ").map((part, i) => (
                  <span key={i} className={cn("block", i === 1 && "text-title3 font-bold")}>
                    {part.replace(",", "")}
                  </span>
                ))}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="px-1 text-subhead font-semibold">Time</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Time">
            {day.slots.map((s) => {
              const iso = s.toISOString();
              const selected = slot === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSlot(iso)}
                  className={cn("flex min-h-16 flex-col items-center justify-center rounded-2xl px-2 text-center", selected ? "bg-teal-ink text-white" : "bg-surface shadow-card")}
                >
                  <span className="text-callout font-bold tabular">{timeIn(ZONES.colombo, s)}</span>
                  <span className={cn("text-caption tabular", selected ? "text-white/80" : "text-label-2")}>
                    Sri Lanka · {timeIn(ZONES.auckland, s)} NZ
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <TextArea label="What would you like to talk about?" rows={3} placeholder="e.g. Which nursing bridging programme should I choose?" value={topic} onChange={(e) => setTopic(e.target.value.slice(0, 400))} />
      </div>
    </Sheet>
  );
}

function MentorWaitlistSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const joinWaitlist = useApp((s) => s.joinWaitlist);
  const [email, setEmail] = useState("");
  const submit = async () => {
    const res = await joinWaitlistRemote("mentor", email);
    if (!res.ok) {
      toast(`Couldn't send: ${res.message}`, "warn");
      return;
    }
    joinWaitlist("mentor");
    toast(res.remote ? "Thanks! We'll be in touch" : "Saved on this device");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Become a mentor"
      description="Mentors set their own price and hours. KiwiPath keeps a 20% platform fee."
      footer={
        <Button block disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={submit}>
          Apply to mentor
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} data-autofocus />
      </form>
    </Sheet>
  );
}

function Alerts() {
  const reports = useApp((s) => s.reports);
  return (
    <div className="flex flex-col gap-5">
      <ButtonLink to="/tools/scam-shield" variant="dark" icon={<ShieldAlert className="size-5" aria-hidden />}>
        Check a message with Scam Shield
      </ButtonLink>
      <section aria-labelledby="patterns" className="flex flex-col gap-3">
        <SectionHeader id="patterns" title="Common scam patterns" />
        <ul className="flex flex-col gap-2.5">
          {PATTERNS.map((p) => (
            <li key={p.title} className="rounded-tile bg-coral-soft p-4">
              <p className="text-headline font-semibold">{p.title}</p>
              <p className="mt-0.5 text-footnote font-semibold text-coral-ink">{p.channel}</p>
              <p className="mt-1.5 text-subhead text-label-2">{p.detail}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="my-reports" className="flex flex-col gap-3">
        <SectionHeader id="my-reports" title="Your reports" />
        {reports.length === 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <Flag className="size-5 shrink-0 text-label-3" aria-hidden />
            <p className="text-subhead text-label-2">You haven't reported anything. Use Scam Shield's report button to warn others.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-sep">
            {reports.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-callout font-semibold">{r.channel}</p>
                  <Tag tint="gold" solid={false} className="text-caption">
                    Awaiting review
                  </Tag>
                </div>
                <p className="mt-1 line-clamp-2 text-subhead text-label-2">{r.summary}</p>
                <p className="mt-1 text-footnote text-label-3">
                  {relativeDay(r.createdAt)}
                  {r.amountLkr ? ` · asked for ${formatLkr(r.amountLkr)}` : ""}
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

const NEWS_TAGS = [
  { id: "all", label: "All" },
  { id: "student", label: "Students" },
  { id: "work", label: "Work" },
  { id: "residence", label: "Residence" },
  { id: "family", label: "Family" },
  { id: "policy", label: "Policy" },
];

function News() {
  const [tag, setTag] = useState("all");
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!HAS_SUPABASE) return;
    let active = true;
    setItems(null);
    fetchNews(tag).then(
      (rows) => active && setItems(rows),
      (e: Error) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [tag]);

  if (!HAS_SUPABASE)
    return (
      <Notice title="Live news is online only">
        The online version collects New Zealand immigration news every few hours from the NZ Government, RNZ and Stuff.
      </Notice>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Topic">
        {NEWS_TAGS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tag === t.id}
            onClick={() => setTag(t.id)}
            className={cn("min-h-10 shrink-0 rounded-full px-4 text-subhead font-semibold", tag === t.id ? "bg-night text-paper" : "bg-surface shadow-card")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <Notice tone="warn" title="Couldn't load news">{error}</Notice>}
      {items === null && !error && <div className="h-48 animate-pulse rounded-card bg-fill-2" />}
      {items?.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Newspaper className="size-8 text-label-3" aria-hidden />
          <p className="text-headline font-semibold">No stories on this topic yet</p>
          <p className="text-subhead text-label-2">New stories are checked every three hours.</p>
        </Card>
      )}
      <ul className="flex flex-col gap-3">
        {items?.map((n) => (
          <li key={n.id}>
            <a href={n.url} target="_blank" rel="noreferrer" className="block rounded-tile bg-surface p-4 shadow-card hover:bg-surface-2">
              <p className="flex items-center justify-between gap-2 text-footnote font-semibold text-label-2">
                <span>
                  {n.source} · {relativeDay(n.published_at)}
                </span>
                <ArrowUpRight className="size-4 shrink-0" aria-hidden />
              </p>
              <p className="mt-1 text-headline font-semibold">{n.title}</p>
              {n.summary && <p className="mt-1 line-clamp-3 text-subhead text-label-2">{n.summary}</p>}
              {n.tags.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-fill-2 px-2.5 py-0.5 text-caption font-medium">
                      {t}
                    </span>
                  ))}
                </p>
              )}
            </a>
          </li>
        ))}
      </ul>
      <p className="px-1 text-footnote text-label-2">
        Headlines link to the original publisher. News isn't advice: check immigration.govt.nz before acting on a change.
      </p>
    </div>
  );
}
