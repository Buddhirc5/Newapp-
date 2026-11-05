import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { BadgeCheck, CalendarCheck, Clock, Plus, Video } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { RequireMember } from "@/components/RequireMember";
import { SignInSheet } from "@/components/SignInSheet";
import { Avatar, Card, Notice, Tag } from "@/components/ui/Bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SegmentedControl, Select, TextArea, TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  applyAsProvider,
  bookGig,
  fetchGig,
  fetchGigs,
  fetchMyApplications,
  fetchMyGigs,
  fetchMyOrders,
  saveGig,
  setOrderStatus,
  useMember,
  type Gig,
  type GigCategory,
  type GigOrder,
  type ProviderApplication,
} from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { datePartsIn, dayIn, formatLkr, timeIn, zonedTime, ZONES } from "@/lib/format";
import { useAuth } from "@/lib/sync";
import type { Tint } from "@/types";

export const GIG_CATEGORIES: { id: GigCategory; label: string; tint: Tint; advice: boolean }[] = [
  { id: "visa", label: "Visa advice", tint: "coral", advice: true },
  { id: "legal", label: "Legal", tint: "lavender", advice: true },
  { id: "education", label: "Study & applications", tint: "malibu", advice: false },
  { id: "career", label: "Jobs & CVs", tint: "gold", advice: false },
  { id: "settling", label: "Settling in", tint: "teal", advice: false },
  { id: "mentoring", label: "Mentoring", tint: "pink", advice: false },
];
const CAT = Object.fromEntries(GIG_CATEGORIES.map((c) => [c.id, c])) as Record<GigCategory, (typeof GIG_CATEGORIES)[number]>;

const STATUS_LABEL: Record<GigOrder["status"], string> = {
  requested: "Waiting for reply",
  accepted: "Accepted, payment due",
  declined: "Declined",
  paid: "Paid, confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function Experts() {
  const navigate = useNavigate();
  return (
    <Page
      title="Experts"
      back={{ to: "/community", label: "Community" }}
      lead="Book verified lawyers and licensed advisers, or learn from Sri Lankans who've already made the move."
      actions={
        <Button size="sm" variant="tinted" onClick={() => navigate("/experts/manage")}>
          My sessions
        </Button>
      }
    >
      {HAS_SUPABASE ? <ExpertsList /> : <Notice title="Online only">Expert sessions work in the online version of KiwiPath.</Notice>}
    </Page>
  );
}

export function ExpertsList() {
  const [cat, setCat] = useState<GigCategory | "all">("all");
  const [gigs, setGigs] = useState<Gig[] | null>(null);
  useEffect(() => {
    let live = true;
    setGigs(null);
    fetchGigs(cat).then(
      (g) => live && setGigs(g),
      () => live && setGigs([]),
    );
    return () => {
      live = false;
    };
  }, [cat]);

  return (
    <div className="flex flex-col gap-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Category">
        {[{ id: "all" as const, label: "All" }, ...GIG_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn("min-h-10 shrink-0 rounded-full px-4 text-subhead font-semibold", cat === c.id ? "bg-night text-paper" : "bg-surface shadow-card")}
          >
            {c.label}
          </button>
        ))}
      </div>
      {gigs === null && <div className="h-48 animate-pulse rounded-card bg-fill-2" />}
      {gigs?.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-headline font-semibold">No sessions here yet</p>
          <p className="max-w-sm text-subhead text-label-2">Living in NZ? Offer a mentoring session and earn by helping people from home.</p>
          <ButtonLink to="/experts/manage" icon={<Plus className="size-5" aria-hidden />}>
            Offer a session
          </ButtonLink>
        </Card>
      )}
      <ul className="flex flex-col gap-3">
        {gigs?.map((g) => (
          <li key={g.id}>
            <Link to={`/experts/${g.id}`} className="block rounded-card bg-surface p-4 shadow-card transition-transform active:scale-[0.99]">
              <div className="flex items-start gap-3">
                <Avatar name={g.provider?.display_name ?? "Expert"} size={48} tint={CAT[g.category].tint} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tint={CAT[g.category].tint} solid={false} className="text-caption">
                      {CAT[g.category].label}
                    </Tag>
                    {g.provider?.verified && (
                      <span className="inline-flex items-center gap-1 text-caption font-semibold text-teal-ink">
                        <BadgeCheck className="size-3.5" aria-hidden /> Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-headline font-semibold">{g.title}</p>
                  <p className="text-footnote text-label-2">
                    {g.provider?.display_name} {g.provider?.city ? `· ${g.provider.city}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-subhead">
                <span className="inline-flex items-center gap-1.5 text-label-2">
                  <Clock className="size-4" aria-hidden /> {g.duration_min} min · {g.mode === "video" ? "Video" : g.mode === "chat" ? "Chat" : "In person"}
                </span>
                <span className="font-bold tabular">{g.price_lkr ? formatLkr(g.price_lkr) : "Free"}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Notice>
        Only verified lawyers and licensed immigration advisers can offer visa or legal advice here. Mentors share their own experience, which isn't immigration
        advice.
      </Notice>
    </div>
  );
}

export function ExpertDetail() {
  const { id = "" } = useParams();
  const user = useAuth((s) => s.user);
  const [gig, setGig] = useState<Gig | null | undefined>(undefined);
  const [booking, setBooking] = useState(false);
  const [signIn, setSignIn] = useState(false);
  useEffect(() => {
    fetchGig(id).then(setGig, () => setGig(null));
  }, [id]);
  if (gig === undefined) return <Page title="Session" back={{ to: "/experts", label: "Experts" }}><div className="h-60 animate-pulse rounded-card bg-fill-2" /></Page>;
  if (gig === null) return <Page title="Session" back={{ to: "/experts", label: "Experts" }}><Notice tone="warn">This session isn't offered any more.</Notice></Page>;
  const mine = user?.id === gig.provider_id;
  return (
    <Page title={gig.title} back={{ to: "/experts", label: "Experts" }} lead={`${CAT[gig.category].label} · ${gig.duration_min} minutes`}>
      <div className="flex flex-col gap-5">
        <Card className="flex items-center gap-3 p-4">
          <Avatar name={gig.provider?.display_name ?? "Expert"} size={56} tint={CAT[gig.category].tint} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-headline font-semibold">
              {gig.provider?.display_name}
              {gig.provider?.verified && <BadgeCheck className="size-4 text-teal-ink" aria-label="Verified" />}
            </p>
            <p className="text-subhead text-label-2">{gig.provider?.role === "provider" ? "Verified provider" : "Community mentor"} {gig.provider?.city ? `· ${gig.provider.city}` : ""}</p>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-body whitespace-pre-wrap">{gig.description}</p>
          {gig.provider?.bio && <p className="mt-3 text-subhead text-label-2">{gig.provider.bio}</p>}
        </Card>
        <div className="flex items-center justify-between rounded-tile bg-gold p-4 text-ink">
          <div>
            <p className="text-footnote font-semibold opacity-70">Price</p>
            <p className="type-display text-title2 tabular">{gig.price_lkr ? formatLkr(gig.price_lkr) : "Free"}</p>
          </div>
          {!mine && (
            <Button variant="dark" onClick={() => (user ? setBooking(true) : setSignIn(true))} icon={<CalendarCheck className="size-5" aria-hidden />}>
              Request a time
            </Button>
          )}
        </div>
        <Notice>You only pay after the expert accepts. Payment details appear in My sessions once online payments are switched on.</Notice>
      </div>
      <BookSheet gig={gig} open={booking} onClose={() => setBooking(false)} />
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </Page>
  );
}

function BookSheet({ gig, open, onClose }: { gig: Gig; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const days = useMemo(() => {
    const today = datePartsIn(ZONES.colombo, new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(today.y, today.m - 1, today.d + i + 1));
      return [9, 12, 16, 19].map((h) => zonedTime(ZONES.colombo, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h));
    });
  }, []);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Request a time"
      description="Times show Sri Lanka and New Zealand side by side."
      size="tall"
      footer={
        <Button
          block
          disabled={!slot || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await bookGig(gig.id, slot!, note.trim());
              toast("Request sent");
              navigate("/experts/manage");
            } catch (e) {
              toast((e as Error).message, "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Sending…" : "Send request"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {days.map((slots, i) => (
            <button key={i} type="button" onClick={() => (setDay(i), setSlot(null))} className={cn("min-h-14 shrink-0 rounded-2xl px-4 text-footnote font-semibold", i === day ? "bg-teal-ink text-white" : "bg-surface shadow-card")}>
              {dayIn(ZONES.colombo, slots[0])}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {days[day].map((s) => {
            const iso = s.toISOString();
            return (
              <button key={iso} type="button" onClick={() => setSlot(iso)} className={cn("flex min-h-16 flex-col items-center justify-center rounded-2xl", slot === iso ? "bg-teal-ink text-white" : "bg-surface shadow-card")}>
                <span className="text-callout font-bold tabular">{timeIn(ZONES.colombo, s)} LK</span>
                <span className={cn("text-caption tabular", slot === iso ? "text-white/80" : "text-label-2")}>{timeIn(ZONES.auckland, s)} NZ</span>
              </button>
            );
          })}
        </div>
        <TextArea label="What do you need help with?" rows={4} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Sheet>
  );
}

export function ManageExperts() {
  return (
    <Page title="My sessions" back={{ to: "/experts", label: "Experts" }}>
      <RequireMember reason="Sign in to manage your sessions.">
        <ManageBody />
      </RequireMember>
    </Page>
  );
}

function ManageBody() {
  const profile = useMember((s) => s.profile);
  const [tab, setTab] = useState<"booked" | "requests" | "offer">("booked");
  const [orders, setOrders] = useState<{ buying: GigOrder[]; selling: GigOrder[] } | null>(null);
  const [mine, setMine] = useState<Gig[]>([]);
  const [apps, setApps] = useState<ProviderApplication[]>([]);
  const [editing, setEditing] = useState(false);
  const [applying, setApplying] = useState(false);
  const load = () => {
    fetchMyOrders().then(setOrders, () => setOrders({ buying: [], selling: [] }));
    fetchMyGigs().then(setMine, () => undefined);
    fetchMyApplications().then(setApps, () => undefined);
  };
  useEffect(load, []);
  const act = async (id: string, status: GigOrder["status"]) => {
    try {
      await setOrderStatus(id, status);
      toast("Updated");
      load();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        label="Section"
        value={tab}
        onChange={setTab}
        options={[
          { value: "booked", label: "Booked" },
          { value: "requests", label: `Requests${orders?.selling.filter((o) => o.status === "requested").length ? ` (${orders.selling.filter((o) => o.status === "requested").length})` : ""}` },
          { value: "offer", label: "I offer" },
        ]}
      />
      {tab === "booked" && <OrderList orders={orders?.buying} side="buyer" onAct={act} />}
      {tab === "requests" && <OrderList orders={orders?.selling} side="provider" onAct={act} />}
      {tab === "offer" && (
        <div className="flex flex-col gap-3">
          <Button onClick={() => setEditing(true)} icon={<Plus className="size-5" aria-hidden />}>
            Offer a session
          </Button>
          {mine.map((g) => (
            <Card key={g.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-headline font-semibold">{g.title}</p>
                <p className="text-footnote text-label-2">
                  {CAT[g.category].label} · {g.price_lkr ? formatLkr(g.price_lkr) : "Free"} · {g.active ? "Live" : "Paused"}
                </p>
              </div>
              <Button size="sm" variant="tinted" onClick={() => saveGig({ ...g, active: !g.active }).then(load, (e: Error) => toast(e.message, "warn"))}>
                {g.active ? "Pause" : "Resume"}
              </Button>
            </Card>
          ))}
          {profile?.role !== "provider" && (
            <Card className="p-5">
              <p className="text-headline font-semibold">Are you a lawyer or licensed adviser?</p>
              <p className="mt-1 text-subhead text-label-2">Get verified to offer visa and legal advice. We check your licence before approving.</p>
              {apps[0] && (
                <p className="mt-2 text-footnote">
                  Your application: <b>{apps[0].status}</b>
                  {apps[0].review_note ? ` (${apps[0].review_note})` : ""}
                </p>
              )}
              {(!apps[0] || apps[0].status === "rejected") && (
                <Button size="md" variant="dark" className="mt-3" onClick={() => setApplying(true)}>
                  Apply for verification
                </Button>
              )}
            </Card>
          )}
        </div>
      )}
      <GigSheet open={editing} onClose={() => setEditing(false)} onSaved={load} verified={profile?.role === "provider" && Boolean(profile?.verified)} />
      <ApplySheet open={applying} onClose={() => setApplying(false)} onSaved={load} />
    </div>
  );
}

function OrderList({ orders, side, onAct }: { orders?: GigOrder[]; side: "buyer" | "provider"; onAct: (id: string, s: GigOrder["status"]) => void }) {
  if (!orders) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  if (!orders.length) return <p className="py-6 text-center text-subhead text-label-2">{side === "buyer" ? "You haven't booked a session yet." : "No requests yet."}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {orders.map((o) => {
        const when = new Date(o.slot);
        return (
          <li key={o.id}>
            <Card className="flex flex-col gap-2 p-4">
              <p className="text-footnote font-semibold text-teal-ink tabular">
                {dayIn(ZONES.colombo, when)} · {timeIn(ZONES.colombo, when)} LK · {timeIn(ZONES.auckland, when)} NZ
              </p>
              <p className="text-headline font-semibold">{o.gig?.title}</p>
              <p className="text-subhead text-label-2">
                {side === "buyer" ? `With ${o.provider?.display_name ?? "expert"}` : `From ${o.buyer?.display_name ?? "member"}`} · {o.amount_lkr ? formatLkr(o.amount_lkr) : "Free"}
              </p>
              {o.note && <p className="rounded-xl bg-fill px-3 py-2 text-subhead">{o.note}</p>}
              <Tag tint={o.status === "declined" || o.status === "cancelled" ? "coral" : o.status === "requested" ? "gold" : "green"} solid={false} className="self-start text-caption">
                {STATUS_LABEL[o.status]}
              </Tag>
              {o.meeting_link && (o.status === "paid" || (o.status === "accepted" && o.amount_lkr === 0)) && (
                <a href={o.meeting_link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-teal-ink px-4 text-subhead font-semibold text-white">
                  <Video className="size-4" aria-hidden /> Join call
                </a>
              )}
              <div className="flex flex-wrap gap-2">
                {side === "provider" && o.status === "requested" && (
                  <>
                    <Button size="sm" onClick={() => onAct(o.id, "accepted")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onAct(o.id, "declined")}>
                      Decline
                    </Button>
                  </>
                )}
                {side === "provider" && (o.status === "paid" || (o.status === "accepted" && o.amount_lkr === 0)) && (
                  <Button size="sm" variant="tinted" onClick={() => onAct(o.id, "completed")}>
                    Mark completed
                  </Button>
                )}
                {side === "buyer" && (o.status === "requested" || o.status === "accepted") && (
                  <Button size="sm" variant="plain" className="text-coral-ink" onClick={() => onAct(o.id, "cancelled")}>
                    Cancel
                  </Button>
                )}
              </div>
              {side === "buyer" && o.status === "accepted" && o.amount_lkr > 0 && (
                <p className="text-footnote text-label-2">Online payment is coming soon. The KiwiPath team will contact you to confirm payment.</p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function GigSheet({ open, onClose, onSaved, verified }: { open: boolean; onClose: () => void; onSaved: () => void; verified: boolean }) {
  const [category, setCategory] = useState<GigCategory>("mentoring");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("5000");
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState<Gig["mode"]>("video");
  const [busy, setBusy] = useState(false);
  const options = GIG_CATEGORIES.filter((c) => verified || !c.advice);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Offer a session"
      size="tall"
      footer={
        <Button
          block
          disabled={busy || title.trim().length < 5 || description.trim().length < 20}
          onClick={async () => {
            setBusy(true);
            try {
              await saveGig({ category, title: title.trim(), description: description.trim(), price_lkr: Math.max(0, Number(price) || 0), duration_min: duration, mode });
              toast("Session published");
              onSaved();
              onClose();
            } catch (e) {
              toast((e as Error).message, "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          Publish
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Type" value={category} onChange={(e) => setCategory(e.target.value as GigCategory)}>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        {!verified && <p className="text-footnote text-label-2">Visa and legal advice need a verified licence. Share your own experience under Mentoring or Settling in.</p>}
        <TextField label="Title" maxLength={90} placeholder="e.g. My first year as a nurse in Auckland" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextArea label="What you'll cover" rows={5} maxLength={1500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Price (Rs)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} hint="0 for free" />
          <Select label="Length" value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))}>
            {[15, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </div>
        <Select label="How" value={mode} onChange={(e) => setMode(e.target.value as Gig["mode"])}>
          <option value="video">Video call</option>
          <option value="chat">Chat</option>
          <option value="in_person">In person</option>
        </Select>
        <p className="text-footnote text-label-2">KiwiPath keeps a platform fee from paid sessions (currently 20%).</p>
      </div>
    </Sheet>
  );
}

function ApplySheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<ProviderApplication["kind"]>("adviser");
  const [fullName, setFullName] = useState("");
  const [licence, setLicence] = useState("");
  const [body, setBody] = useState("Immigration Advisers Authority");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Apply for verification"
      description="We check your licence on the public register before approving."
      size="tall"
      footer={
        <Button
          block
          disabled={fullName.trim().length < 3}
          onClick={async () => {
            try {
              await applyAsProvider({ kind, full_name: fullName.trim(), licence_number: licence.trim(), licence_body: body.trim(), website: website.trim() ? (/^https?:\/\//.test(website) ? website.trim() : `https://${website.trim()}`) : null, bio: bio.trim() });
              toast("Application sent");
              onSaved();
              onClose();
            } catch (e) {
              toast((e as Error).message, "warn");
            }
          }}
        >
          Send application
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="I am a" value={kind} onChange={(e) => setKind(e.target.value as ProviderApplication["kind"])}>
          <option value="adviser">Licensed immigration adviser</option>
          <option value="lawyer">Lawyer</option>
          <option value="agent">Education agent</option>
          <option value="consultant">Consultant</option>
        </Select>
        <TextField label="Full name (as on your licence)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Licence or registration number" value={licence} onChange={(e) => setLicence(e.target.value)} />
        <TextField label="Issued by" value={body} onChange={(e) => setBody(e.target.value)} />
        <TextField label="Website (optional)" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <TextArea label="About your practice" rows={4} maxLength={800} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
    </Sheet>
  );
}
