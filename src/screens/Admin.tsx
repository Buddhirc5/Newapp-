import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Flag,
  KeyRound,
  LayoutDashboard,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Page } from "@/components/layout/Page";
import { GoogleMark } from "@/screens/Landing";
import { Card, Notice, SectionHeader, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select, Switch, TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import type { Listing } from "@/data/board";
import { mfaState, startEnrolment, verifyCode, type MfaState } from "@/lib/adminAuth";
import { cn } from "@/lib/cn";
import {
  adminMembers,
  adminOrders,
  adminStats,
  adminUpdateMember,
  fetchAgencies,
  fetchHiddenListings,
  fetchOpenReports,
  fetchPayments,
  fetchPendingApplications,
  fetchSettings,
  loadMember,
  refreshNews,
  resolveReports,
  reviewAgency,
  reviewApplication,
  setOrderStatus,
  saveSetting,
  useMember,
  type AdminMember,
  type Agency,
  type GigOrder,
  type ProviderApplication,
  type PaymentRow,
  type ReportRow,
  type Setting,
} from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { formatNumber, relativeDay } from "@/lib/format";
import { signInWithGoogle, signInWithPassword, useAuth, useGoogleEnabled } from "@/lib/sync";

type Tab = "overview" | "members" | "moderation" | "agencies" | "experts" | "payments" | "settings";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "moderation", label: "Moderation", icon: Flag },
  { id: "agencies", label: "Agencies", icon: Building2 },
  { id: "experts", label: "Experts", icon: BadgeCheck },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Admin() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const isAdmin = useMember((s) => s.isAdmin);
  const loading = useMember((s) => s.loading);
  const [mfa, setMfa] = useState<MfaState>({ kind: "loading" });

  const refreshMfa = useCallback(() => {
    mfaState().then(setMfa, () => setMfa({ kind: "none" }));
  }, []);
  useEffect(() => {
    if (user && isAdmin) refreshMfa();
  }, [user, isAdmin, refreshMfa]);

  let body: ReactNode;
  if (!HAS_SUPABASE) body = <Notice title="Online only">The admin console works in the online version.</Notice>;
  else if (!ready || loading) body = <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  else if (!user) body = <AdminLogin />;
  else if (!isAdmin) body = <Notice tone="warn" title="Admins only">This account isn't an admin. Ask the owner to add you in Supabase (public.admins).</Notice>;
  else if (mfa.kind === "loading") body = <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  else if (mfa.kind === "needs-code") body = <MfaCode factorId={mfa.factorId} onDone={refreshMfa} />;
  else body = <Console mfa={mfa} onEnrolled={refreshMfa} />;

  return (
    <Page title="Admin" back={{ to: "/me", label: "Me" }} wide>
      {body}
    </Page>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const google = useGoogleEnabled();
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-night text-paper">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-headline font-semibold">Admin sign in</p>
          <p className="text-footnote text-label-2">Protected by an authenticator app</p>
        </div>
      </div>
      {google && (
        <Button variant="outline" icon={<GoogleMark />} onClick={() => void signInWithGoogle()} block>
          Continue with Google
        </Button>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await signInWithPassword(email, password);
          setBusy(false);
          if (!res.ok) setError(res.message ?? "Couldn't sign in");
        }}
      >
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <p className="rounded-tile bg-coral-soft px-4 py-3 text-subhead text-coral-ink" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !email || !password} block>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}

function MfaCode({ factorId, onDone }: { factorId: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <KeyRound className="size-7 text-teal-ink" aria-hidden />
      <p className="text-headline font-semibold">Enter the code from your authenticator app</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await verifyCode(factorId, code);
            onDone();
          } catch (err) {
            toast((err as Error).message, "warn");
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField
          label="6-digit code"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="text-center text-title2 tracking-[0.4em] tabular"
        />
        <Button type="submit" disabled={busy || code.length !== 6} block>
          Verify
        </Button>
      </form>
    </Card>
  );
}

function Console({ mfa, onEnrolled }: { mfa: MfaState; onEnrolled: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <nav aria-label="Admin sections" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:w-52 lg:shrink-0 lg:flex-col lg:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-subhead font-semibold lg:rounded-xl",
              tab === t.id ? "bg-night text-paper" : "bg-surface shadow-card hover:bg-surface-2 lg:bg-transparent lg:shadow-none",
            )}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        {mfa.kind === "none" && <EnrolBanner onEnrolled={onEnrolled} />}
        {tab === "overview" && <Overview />}
        {tab === "members" && <Members />}
        {tab === "moderation" && <Moderation />}
        {tab === "agencies" && <AgencyReview />}
        {tab === "experts" && <ExpertsAdmin />}
        {tab === "payments" && <Payments />}
        {tab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}

function EnrolBanner({ onEnrolled }: { onEnrolled: () => void }) {
  const [enrol, setEnrol] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  return (
    <Card className="mb-5 flex flex-col gap-3 border-l-4 border-gold p-5">
      <p className="text-headline font-semibold">Protect the admin console with an authenticator app</p>
      {!enrol ? (
        <>
          <p className="text-subhead text-label-2">Use Google Authenticator, Microsoft Authenticator or 1Password. You'll enter a code each time you open the console.</p>
          <Button size="md" className="self-start" onClick={() => startEnrolment().then(setEnrol, (e: Error) => toast(e.message, "warn"))}>
            Set up now
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <img src={enrol.qr} alt="QR code for your authenticator app" className="size-44 rounded-xl bg-white p-2" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-subhead text-label-2">Scan the code, or enter this key manually:</p>
            <code className="rounded-lg bg-fill px-3 py-2 text-footnote break-all">{enrol.secret}</code>
            <TextField label="Code from the app" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <Button
              size="md"
              disabled={code.length !== 6}
              onClick={async () => {
                try {
                  await verifyCode(enrol.factorId, code);
                  toast("Authenticator connected");
                  onEnrolled();
                } catch (e) {
                  toast((e as Error).message, "warn");
                }
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

const STAGE_LABEL: Record<string, string> = {
  exploring: "Exploring",
  preparing: "Preparing",
  applying: "Applying",
  visa: "Visa stage",
  arrived: "Arrived",
  settled: "Settled",
};

function Overview() {
  const [stats, setStats] = useState<Record<string, number | Record<string, number>> | null>(null);
  useEffect(() => {
    adminStats().then(setStats, (e: Error) => toast(e.message, "warn"));
  }, []);
  if (!stats) return <div className="h-60 animate-pulse rounded-card bg-fill-2" />;
  const n = (k: string) => Number(stats[k] ?? 0);
  const stages = (stats.stages ?? {}) as Record<string, number>;
  const total = Object.values(stages).reduce((a, b) => a + b, 0) || 1;
  const tiles = [
    { label: "Members", value: n("members"), sub: `+${n("new_7d")} this week` },
    { label: "In Sri Lanka", value: n("in_lk"), sub: `${n("in_nz")} in New Zealand` },
    { label: "On free month", value: n("on_trial"), sub: `${n("pro")} on Pro` },
    { label: "Active listings", value: n("listings"), sub: `${n("hidden")} hidden` },
    { label: "Open reports", value: n("open_reports"), sub: `${n("pending_agencies")} agencies to review` },
    { label: "Group messages", value: n("messages_7d"), sub: "last 7 days" },
    { label: "Live sessions", value: n("gigs"), sub: `${n("pending_providers")} providers to verify` },
    { label: "Bookings", value: n("bookings_30d"), sub: "last 30 days" },
    { label: "Document checks", value: n("ai_checks_7d"), sub: "last 7 days" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Card className="p-4">
              <p className="text-footnote font-semibold text-label-2">{t.label}</p>
              <p className="type-display mt-1 text-title1 tabular">{formatNumber(t.value)}</p>
              <p className="text-footnote text-label-3">{t.sub}</p>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="p-5">
        <p className="text-headline font-semibold">Where members are</p>
        <div className="mt-3 flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Members by stage">
          {Object.entries(stages).map(([stage, count], i) => (
            <span key={stage} style={{ width: `${(count / total) * 100}%`, background: `var(--chart-${(i % 3) + 1})`, opacity: 1 - Math.floor(i / 3) * 0.35 }} />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-subhead sm:grid-cols-3">
          {Object.entries(stages).map(([stage, count], i) => (
            <li key={stage} className="flex items-center gap-2">
              <span className="size-3 rounded-[3px]" style={{ background: `var(--chart-${(i % 3) + 1})`, opacity: 1 - Math.floor(i / 3) * 0.35 }} aria-hidden />
              {STAGE_LABEL[stage] ?? stage}
              <span className="ml-auto font-semibold tabular">{count}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Button
        variant="tinted"
        className="self-start"
        icon={<Newspaper className="size-5" aria-hidden />}
        onClick={async () => {
          await refreshNews().catch(() => undefined);
          toast("News refreshed");
        }}
      >
        Fetch immigration news now
      </Button>
    </div>
  );
}

function Members() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminMember[] | null>(null);
  const [situation, setSituation] = useState("all");
  const [plan, setPlan] = useState("all");
  const [open, setOpen] = useState<AdminMember | null>(null);

  const load = useCallback((search: string) => adminMembers(search).then(setRows, (e: Error) => toast(e.message, "warn")), []);
  useEffect(() => {
    const id = window.setTimeout(() => void load(q), 300);
    return () => window.clearTimeout(id);
  }, [q, load]);

  const shown = useMemo(() => (rows ?? []).filter((r) => (situation === "all" || r.situation === situation) && (plan === "all" || r.plan === plan)), [rows, situation, plan]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-label-3" aria-hidden />
          <label htmlFor="admin-q" className="sr-only">
            Search members
          </label>
          <input
            id="admin-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email"
            className="min-h-12 w-full rounded-full bg-surface py-3 pr-4 pl-12 text-body shadow-card outline-none ring-teal-ink/60 focus:ring-2"
          />
        </div>
        <Select label="Where" value={situation} onChange={(e) => setSituation(e.target.value)} wrapClassName="md:w-44 [&>label]:sr-only">
          <option value="all">Everywhere</option>
          <option value="in_lk">In Sri Lanka</option>
          <option value="in_nz">In New Zealand</option>
          <option value="elsewhere">Elsewhere</option>
        </Select>
        <Select label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} wrapClassName="md:w-36 [&>label]:sr-only">
          <option value="all">All plans</option>
          <option value="trial">Trial</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
      </div>
      {rows === null ? (
        <div className="h-60 animate-pulse rounded-card bg-fill-2" />
      ) : (
        <>
          <p className="px-1 text-footnote text-label-2">{shown.length} members</p>
          <div className="hidden overflow-hidden rounded-tile bg-surface shadow-card md:block">
            <table className="w-full text-left text-subhead">
              <thead className="bg-fill text-footnote text-label-2">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Member</th>
                  <th className="px-3 py-2.5 font-semibold">Where</th>
                  <th className="px-3 py-2.5 font-semibold">Stage</th>
                  <th className="px-3 py-2.5 font-semibold">Plan</th>
                  <th className="px-3 py-2.5 font-semibold">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer border-t border-sep hover:bg-fill">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1 font-semibold">
                        {r.display_name} {r.verified && <BadgeCheck className="size-3.5 text-teal-ink" aria-label="Verified" />}
                      </p>
                      <p className="text-footnote text-label-2">{r.email}</p>
                    </td>
                    <td className="px-3 py-3">{r.situation === "in_nz" ? "NZ" : r.situation === "in_lk" ? "Sri Lanka" : "Other"} · {r.city || "—"}</td>
                    <td className="px-3 py-3">{STAGE_LABEL[r.stage] ?? r.stage}</td>
                    <td className="px-3 py-3">
                      <Tag tint={r.plan === "pro" ? "gold" : r.plan === "trial" ? "malibu" : "lavender"} solid={false} className="text-caption">
                        {r.plan}
                      </Tag>
                    </td>
                    <td className="px-3 py-3 text-label-2">{r.last_sign_in_at ? relativeDay(r.last_sign_in_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {shown.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r)} className="flex w-full flex-col gap-0.5 rounded-tile bg-surface p-4 text-left shadow-card">
                  <span className="text-headline font-semibold">{r.display_name}</span>
                  <span className="text-footnote text-label-2">{r.email}</span>
                  <span className="text-footnote">
                    {STAGE_LABEL[r.stage] ?? r.stage} · {r.plan} · {r.city || "no city"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <MemberSheet member={open} onClose={() => setOpen(null)} onSaved={() => void load(q)} />
    </div>
  );
}

function MemberSheet({ member, onClose, onSaved }: { member: AdminMember | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<AdminMember | null>(member);
  useEffect(() => setDraft(member), [member]);
  if (!draft) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const save = async () => {
    try {
      await adminUpdateMember(draft.id, { plan: draft.plan, verified: draft.verified, role: draft.role, stage: draft.stage, trial_ends_at: draft.trial_ends_at });
      toast("Member updated");
      onSaved();
      onClose();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };
  return (
    <Sheet open={member !== null} onClose={onClose} title={draft.display_name} description={draft.email} size="tall" footer={<Button block onClick={save}>Save changes</Button>}>
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-subhead">
          {[
            ["Joined", relativeDay(draft.created_at)],
            ["Path", draft.path],
            ["City", draft.city || "—"],
            ["Listings", String(draft.listings)],
            ["Groups", String(draft.groups)],
            ["Interests", draft.interests.join(", ") || "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-fill px-3 py-2">
              <dt className="text-caption text-label-2">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <Select label="Plan" value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })}>
          <option value="trial">Trial</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
        <div className="flex items-center justify-between gap-3">
          <p className="text-subhead">
            Trial ends <b>{new Date(draft.trial_ends_at).toLocaleDateString("en-NZ")}</b>
          </p>
          <Button size="sm" variant="tinted" onClick={() => setDraft({ ...draft, trial_ends_at: new Date(Math.max(Date.now(), Date.parse(draft.trial_ends_at)) + 30 * 86_400_000).toISOString() })}>
            +30 days
          </Button>
        </div>
        <Select label="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
          <option value="planner">Planner</option>
          <option value="newcomer">Newcomer</option>
          <option value="helper">Helper</option>
          <option value="provider">Verified provider</option>
        </Select>
        <Select label="Stage" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
          {Object.entries(STAGE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <div className="flex items-center justify-between rounded-tile bg-surface px-4 py-3 shadow-card">
          <span className="text-body font-semibold">Verified badge</span>
          <Switch checked={draft.verified} onChange={(verified) => setDraft({ ...draft, verified })} label="Verified badge" />
        </div>
      </div>
    </Sheet>
  );
}

function Moderation() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [hidden, setHidden] = useState<Listing[]>([]);
  const load = useCallback(() => {
    fetchOpenReports().then(setReports, () => undefined);
    fetchHiddenListings().then(setHidden, () => undefined);
  }, []);
  useEffect(load, [load]);
  const act = async (id: string, status?: Listing["status"]) => {
    try {
      await resolveReports(id, status);
      toast("Done");
      load();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={`Hidden listings (${hidden.length})`} />
      {hidden.length === 0 && <p className="px-1 text-subhead text-label-2">Nothing waiting for review.</p>}
      {hidden.map((l) => (
        <Card key={l.id} className="flex flex-col gap-3 p-4">
          <Link to={`/board/${l.id}`} className="text-headline font-semibold text-teal-ink">
            {l.title}
          </Link>
          <ul className="text-subhead text-label-2">
            {reports
              .filter((r) => r.target_id === l.id)
              .map((r) => (
                <li key={r.id}>• {r.reason}</li>
              ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button size="md" variant="tinted" onClick={() => act(l.id, "active")}>
              Restore
            </Button>
            <Button size="md" variant="destructive" onClick={() => act(l.id, "removed")}>
              Remove
            </Button>
          </div>
        </Card>
      ))}
      <SectionHeader title={`Open reports (${reports.length})`} />
      {reports.map((r) => (
        <Card key={r.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-callout font-semibold">{r.reason}</p>
            <p className="text-footnote text-label-2">
              {r.target_type} · {relativeDay(r.created_at)}
            </p>
          </div>
          <Button size="sm" variant="plain" onClick={() => act(r.target_id)}>
            Dismiss
          </Button>
        </Card>
      ))}
    </div>
  );
}

function AgencyReview() {
  const [items, setItems] = useState<Agency[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(() => fetchAgencies("pending").then(setItems, () => setItems([])), []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!items) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="px-1 text-subhead text-label-2">No agencies waiting for review.</p>}
      {items.map((a) => (
        <Card key={a.id} className="flex flex-col gap-3 p-4">
          <div>
            <p className="text-headline font-semibold">{a.name}</p>
            <p className="text-footnote text-label-2">
              {a.city} · {a.website ?? "no website"} · suggested {relativeDay(a.created_at)}
            </p>
          </div>
          {a.description && <p className="text-subhead">{a.description}</p>}
          {a.nz_partners.length > 0 && <p className="text-footnote">Claims to represent: {a.nz_partners.join(", ")}</p>}
          <TextField label="Verification note (shown publicly)" placeholder="e.g. Confirmed on University of Waikato's agent list, Nov 2026" value={notes[a.id] ?? ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Button size="md" onClick={() => reviewAgency(a.id, "approved", notes[a.id] ?? "").then(load, (e: Error) => toast(e.message, "warn"))}>
              Approve
            </Button>
            <Button size="md" variant="destructive" onClick={() => reviewAgency(a.id, "rejected", notes[a.id] ?? "").then(load, (e: Error) => toast(e.message, "warn"))}>
              Reject
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ExpertsAdmin() {
  const [apps, setApps] = useState<ProviderApplication[] | null>(null);
  const [orders, setOrders] = useState<GigOrder[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    fetchPendingApplications().then(setApps, () => setApps([]));
    adminOrders().then(setOrders, () => undefined);
  }, []);
  useEffect(load, [load]);
  if (!apps) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  const review = (id: string, status: "approved" | "rejected") =>
    reviewApplication(id, status, notes[id] ?? "").then(() => (toast(status === "approved" ? "Provider verified" : "Application rejected"), load()), (e: Error) => toast(e.message, "warn"));
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="apps">
        <SectionHeader id="apps" title="Provider applications" />
        {apps.length === 0 && <p className="px-1 text-subhead text-label-2">No applications waiting.</p>}
        {apps.map((a) => (
          <Card key={a.id} className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-headline font-semibold">{a.full_name}</p>
              <p className="text-footnote text-label-2">
                {a.kind} · {a.licence_body || "no issuer"} · {a.licence_number || "no number"} · {relativeDay(a.created_at)}
              </p>
              {a.website && (
                <a href={a.website} target="_blank" rel="noreferrer" className="text-footnote text-teal-ink underline">
                  {a.website}
                </a>
              )}
            </div>
            {a.bio && <p className="text-subhead">{a.bio}</p>}
            <Notice>Check the licence on the public register (for example the IAA adviser register or the NZ Law Society) before approving.</Notice>
            <TextField label="Note to applicant" value={notes[a.id] ?? ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Button size="md" onClick={() => review(a.id, "approved")}>
                Approve
              </Button>
              <Button size="md" variant="destructive" onClick={() => review(a.id, "rejected")}>
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="orders">
        <SectionHeader id="orders" title="Recent bookings" />
        {orders.length === 0 && <p className="px-1 text-subhead text-label-2">No bookings yet.</p>}
        {orders.map((o) => (
          <Card key={o.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-callout font-semibold">{o.gig?.title ?? "Session"}</p>
              <p className="text-footnote text-label-2">
                {o.buyer?.display_name ?? "Member"} → {o.provider?.display_name ?? "Provider"} · Rs {formatNumber(o.amount_lkr)} (fee Rs {formatNumber(o.platform_fee_lkr)}) · {relativeDay(o.created_at)}
              </p>
            </div>
            <Tag tint={o.status === "paid" || o.status === "completed" ? "green" : o.status === "accepted" ? "gold" : "malibu"} solid={false} className="text-caption">
              {o.status}
            </Tag>
            {o.status === "accepted" && o.amount_lkr > 0 && (
              <Button size="sm" onClick={() => setOrderStatus(o.id, "paid").then(() => (toast("Marked paid"), load()), (e: Error) => toast(e.message, "warn"))}>
                Mark paid
              </Button>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}

function Payments() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  useEffect(() => {
    fetchPayments().then(setRows, () => setRows([]));
  }, []);
  if (!rows) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <Notice title="No payments yet">
          Payments appear here once a gateway is connected. Each successful payment, renewal and refund is written to the payments table by the gateway's webhook.
        </Notice>
      ) : (
        <div className="overflow-x-auto rounded-tile bg-surface shadow-card">
          <table className="w-full min-w-[34rem] text-left text-subhead">
            <thead className="bg-fill text-footnote text-label-2">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Provider</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-sep">
                  <td className="px-4 py-3">{new Date(p.created_at).toLocaleDateString("en-NZ")}</td>
                  <td className="px-3 py-3">{p.kind}</td>
                  <td className="px-3 py-3">{p.provider}</td>
                  <td className="px-3 py-3 text-right tabular">
                    {p.currency} {formatNumber(p.amount)}
                  </td>
                  <td className="px-3 py-3">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsPanel() {
  const [rows, setRows] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchSettings().then((s) => {
      setRows(s);
      setDraft(Object.fromEntries(s.map((x) => [x.key, JSON.stringify(x.value)])));
    }, () => setRows([]));
  }, []);
  if (!rows) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((s) => (
        <Card key={s.key} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextField label={s.description || s.key} hint={s.key} value={draft[s.key] ?? ""} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />
          </div>
          <Button
            size="md"
            variant="tinted"
            onClick={async () => {
              try {
                await saveSetting(s.key, JSON.parse(draft[s.key]));
                toast("Saved");
                void loadMember();
              } catch {
                toast("Enter a number, true/false, or text in quotes", "warn");
              }
            }}
          >
            Save
          </Button>
        </Card>
      ))}
      <p className="px-1 text-footnote text-label-2">AI document review stays off until an AI API key is added to the Supabase Edge Function secrets.</p>
    </div>
  );
}
