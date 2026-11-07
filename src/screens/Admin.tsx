import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Activity,
  CreditCard,
  Flag,
  KeyRound,
  LogOut,
  Maximize2,
  Minimize2,
  LayoutDashboard,
  Newspaper,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/Logo";
import { AiUsage } from "@/screens/admin/AiUsage";
import { Pills } from "@/screens/admin/charts";
import { Dashboard } from "@/screens/admin/Dashboard";
import { Members } from "@/screens/admin/Members";
import { Usage } from "@/screens/admin/Usage";
import { Revenue } from "@/screens/admin/Revenue";
import { SecurityPage } from "@/screens/admin/SecurityPage";
import { SettingsPage } from "@/screens/admin/SettingsPage";
import { GoogleMark } from "@/screens/Landing";
import { Card, Notice, SectionHeader, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import type { Listing } from "@/data/board";
import { mfaState, startEnrolment, verifyCode, type MfaState } from "@/lib/adminAuth";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import {
  adminNews,
  adminOrders,
  fetchAgencies,
  fetchHiddenListings,
  fetchOpenReports,
  fetchPendingApplications,
  refreshNews,
  resolveReports,
  reviewAgency,
  reviewApplication,
  setNewsHidden,
  setOrderStatus,
  useMember,
  type Agency,
  type GigOrder,
  type ProviderApplication,
  type ReportRow,
} from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { formatNumber, relativeDay } from "@/lib/format";
import { signInWithGoogle, signInWithPassword, signOut, useAuth, useGoogleEnabled } from "@/lib/sync";
import { Captcha, TURNSTILE_SITE_KEY } from "@/components/Captcha";

type Tab = "dashboard" | "usage" | "members" | "revenue" | "ai" | "community" | "security" | "settings";

const TABS: { id: Tab; label: string; heading: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", heading: "Pulse", icon: LayoutDashboard },
  { id: "usage", label: "Usage", heading: "Usage", icon: Activity },
  { id: "members", label: "Members", heading: "Members", icon: Users },
  { id: "revenue", label: "Revenue", heading: "Revenue", icon: CreditCard },
  { id: "ai", label: "AI usage", heading: "AI usage", icon: Sparkles },
  { id: "community", label: "Community", heading: "Community", icon: Flag },
  { id: "security", label: "Security", heading: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", heading: "Settings", icon: Settings },
];

export function Admin() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const isAdmin = useMember((s) => s.isAdmin);
  const loading = useMember((s) => s.loading);
  const memberFor = useMember((s) => s.userId);
  const userId = user?.id ?? null;

  // Every sign-in change bumps `version`, and the console only shows for an
  // authenticator check made for the current version. An older answer (for
  // example "verified" from before signing out and in again) can never open it.
  const versionRef = useRef(0);
  const [version, setVersion] = useState(0);
  const [mfa, setMfa] = useState<MfaState & { userId: string | null; version: number }>({ kind: "loading", userId: null, version: -1 });
  const bump = useCallback(() => {
    versionRef.current += 1;
    setVersion(versionRef.current);
  }, []);
  const check = useCallback(() => {
    if (!userId) return;
    const v = versionRef.current;
    mfaState().then(
      (m) => {
        if (versionRef.current !== v) return;
        setMfa((cur) => (cur.userId === userId && cur.version === v && cur.kind === m.kind ? cur : { ...m, userId, version: v }));
      },
      () => versionRef.current === v && setMfa({ kind: "none", userId, version: v }),
    );
  }, [userId]);

  const eligible = Boolean(userId && isAdmin && memberFor === userId);
  const sessionFresh = useIdleSignOut(eligible);

  useEffect(() => {
    bump();
    if (eligible) check();
  }, [eligible, userId, bump, check]);

  // Sign-in changes hide the console until checked again; token refreshes and
  // returning to the tab re-check quietly (the screen only changes if the answer does).
  useEffect(() => {
    let stop = () => {};
    void getSupabase()?.then((sb) => {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "MFA_CHALLENGE_VERIFIED"].includes(event)) {
          bump();
          check();
        } else if (event === "TOKEN_REFRESHED") check();
      });
      stop = () => data.subscription.unsubscribe();
    });
    const onFocus = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [bump, check]);

  const memberReady = Boolean(userId) && memberFor === userId && !loading;
  const mfaReady = mfa.userId === userId && mfa.version === version && mfa.kind !== "loading";

  if (!HAS_SUPABASE) return <GateScreen><Notice title="Online only">The admin console works in the online version.</Notice></GateScreen>;
  if (!ready) return <GateScreen><Checking /></GateScreen>;
  if (!user) return <GateScreen><AdminLogin /></GateScreen>;
  if (!memberReady) return <GateScreen><Checking /></GateScreen>;
  if (!isAdmin)
    return (
      <GateScreen>
        <Notice tone="warn" title="Admins only">
          This account isn't an admin. Ask the owner to add you in Supabase (public.admins).
        </Notice>
      </GateScreen>
    );
  if (!mfaReady || !sessionFresh) return <GateScreen><Checking /></GateScreen>;
  if (mfa.kind === "needs-code") return <GateScreen><MfaCode factorId={mfa.factorId} onDone={check} /></GateScreen>;
  // Admin rights only work after the authenticator step, so setting one up is required.
  if (mfa.kind === "none") return <GateScreen><EnrolBanner onEnrolled={check} /></GateScreen>;
  // Only an authenticator-verified session for this exact account and sign-in reaches the console.
  if (mfa.kind === "verified") return <Console />;
  return <GateScreen><Checking /></GateScreen>;
}

/** Full-screen admin layout for everything before the console: no member-app chrome. */
function GateScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center bg-bg gutter-x py-10">
      <div className="topo-layer" aria-hidden />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <LogoMark className="size-9" />
            <span className="type-display text-headline tracking-tight">KIWIPATH ADMIN</span>
          </span>
          <Link to="/" className="inline-flex min-h-11 items-center rounded-full px-3 text-subhead font-semibold text-teal-ink hover:bg-fill">
            Back to app
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

function Checking() {
  return (
    <Card className="flex items-center gap-4 p-6" aria-live="polite">
      <span className="size-6 shrink-0 animate-spin rounded-full border-[3px] border-fill-3 border-t-teal" aria-hidden />
      <div>
        <p className="text-headline font-semibold">Checking admin access…</p>
        <p className="text-footnote text-label-2">Making sure this session passed the authenticator step.</p>
      </div>
    </Card>
  );
}

// Slows down password guessing on this device. Supabase's own rate limits and
// CAPTCHA protect the server side.
const LOCK_KEY = "kp-admin-lock";
const MAX_TRIES = 5;
const LOCK_MINUTES = 10;

function readLock(): { fails: number; until: number } {
  try {
    return { fails: 0, until: 0, ...(JSON.parse(localStorage.getItem(LOCK_KEY) ?? "{}") as object) };
  } catch {
    return { fails: 0, until: 0 };
  }
}
function writeLock(v: { fails: number; until: number }) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}
function recordFailure(): string | null {
  const lock = readLock();
  const fails = lock.fails + 1;
  if (fails >= MAX_TRIES) {
    writeLock({ fails: 0, until: Date.now() + LOCK_MINUTES * 60_000 });
    return `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`;
  }
  writeLock({ fails, until: 0 });
  return null;
}
const lockedMessage = () => {
  const mins = Math.ceil((readLock().until - Date.now()) / 60_000);
  return mins > 0 ? `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` : null;
};

const IDLE_MS = 15 * 60_000;
const ACTIVE_KEY = "kp-admin-active";

function touchActivity() {
  try {
    localStorage.setItem(ACTIVE_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

/**
 * Signs admins out after 15 minutes without activity, including time the tab
 * was closed: admin sessions are saved in the browser, so without this a
 * reopened tab hours later would skip the authenticator code.
 * Returns true once it's safe to show the console.
 */
function useIdleSignOut(active: boolean): boolean {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!active) {
      setChecked(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const sb = await getSupabase();
      const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      const signedInAt = Date.parse(data.session?.user.last_sign_in_at ?? "") || 0;
      let last = 0;
      try {
        last = Number(localStorage.getItem(ACTIVE_KEY)) || 0;
      } catch {
        /* private mode */
      }
      // A sign-in newer than the last activity is a fresh session, not a stale one.
      const lastSeen = Math.max(last, signedInAt);
      if (Date.now() - lastSeen > IDLE_MS) {
        markTimedOut();
        await signOut();
        return;
      }
      touchActivity();
      if (!cancelled) setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !checked) return;
    let timer = 0;
    let lastWrite = 0;
    const reset = () => {
      window.clearTimeout(timer);
      if (Date.now() - lastWrite > 15_000) {
        lastWrite = Date.now();
        touchActivity();
      }
      timer = window.setTimeout(async () => {
        markTimedOut();
        await signOut();
      }, IDLE_MS);
    };
    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    // Back/forward cache could show a signed-out admin page; reload it instead.
    const onShow = (e: PageTransitionEvent) => e.persisted && window.location.reload();
    window.addEventListener("pageshow", onShow);
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
      window.removeEventListener("pageshow", onShow);
    };
  }, [active, checked]);

  return checked;
}

const TIMEOUT_KEY = "kp-admin-timeout";
function markTimedOut() {
  try {
    sessionStorage.setItem(TIMEOUT_KEY, "1");
  } catch {
    /* storage blocked */
  }
}

function AdminLogin() {
  const [timedOut] = useState(() => {
    try {
      const v = sessionStorage.getItem(TIMEOUT_KEY) === "1";
      sessionStorage.removeItem(TIMEOUT_KEY);
      return v;
    } catch {
      return false;
    }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const google = useGoogleEnabled();
  return (
    <Card className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-night text-paper">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-headline font-semibold">Admin sign in</p>
          <p className="text-footnote text-label-2">Protected by an authenticator app</p>
        </div>
      </div>
      {timedOut && (
        <p className="rounded-tile bg-gold/20 px-4 py-3 text-subhead" role="status">
          For security, admin sessions end after 15 minutes without activity. Sign in again to continue.
        </p>
      )}
      {google && (
        <Button variant="outline" icon={<GoogleMark />} onClick={() => void signInWithGoogle("/admin")} block>
          Continue with Google
        </Button>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const locked = lockedMessage();
          if (locked) return setError(locked);
          if (TURNSTILE_SITE_KEY && !captcha) return setError("Complete the check below first.");
          setBusy(true);
          const res = await signInWithPassword(email, password, captcha);
          setBusy(false);
          setCaptcha("");
          setCaptchaReset((n) => n + 1);
          if (res.ok) writeLock({ fails: 0, until: 0 });
          else setError(recordFailure() ?? res.message ?? "Couldn't sign in");
        }}
      >
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Captcha onToken={setCaptcha} resetKey={captchaReset} />
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
    <Card className="flex w-full flex-col gap-4 p-6">
      <KeyRound className="size-7 text-teal-ink" aria-hidden />
      <p className="text-headline font-semibold">Enter the code from your authenticator app</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const locked = lockedMessage();
          if (locked) return toast(locked, "warn");
          setBusy(true);
          try {
            await verifyCode(factorId, code);
            writeLock({ fails: 0, until: 0 });
            onDone();
          } catch (err) {
            const lockedNow = recordFailure();
            toast(lockedNow ?? (err as Error).message, "warn");
            if (lockedNow) await signOut();
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

export function Console() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [community, setCommunity] = useState<"moderation" | "experts" | "agencies" | "news">("moderation");
  const user = useAuth((s) => s.user);
  const go = (t: string) => setTab(t as Tab);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-dvh bg-bg pb-16">
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 rounded-[1.6rem] bg-surface p-2 md:flex-nowrap text-label shadow-float ring-1 ring-sep dark:bg-night-2">
          <Link to="/" className="mr-auto flex shrink-0 items-center gap-2 rounded-full py-1 pr-3 pl-2 md:mr-0" aria-label="KiwiPath home">
            <LogoMark className="size-8" />
            <span className="type-display text-headline tracking-tight">KIWIPATH</span>
          </Link>
          <nav aria-label="Admin sections" className="no-scrollbar order-last -mx-1 flex w-full min-w-0 gap-1 overflow-x-auto px-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-footnote font-bold transition-colors",
                  tab === t.id ? "bg-night text-paper dark:bg-paper dark:text-ink" : "text-label-2 hover:bg-fill hover:text-label",
                )}
              >
                <t.icon className="size-4 lg:hidden" aria-hidden />
                {t.label}
              </button>
            ))}
          </nav>
          <span className="hidden items-center gap-1.5 px-2 text-caption text-label-2 xl:inline-flex">
            <span className="size-1.5 rounded-full bg-green" aria-hidden />
            {user?.email ?? "admin"}
          </span>
          <button
            type="button"
            aria-label={full ? "Exit full screen" : "Full screen"}
            title={full ? "Exit full screen" : "Full screen"}
            onClick={() => (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}
            className="hidden size-10 shrink-0 place-items-center rounded-full bg-fill hover:bg-fill-2 md:grid"
          >
            {full ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
          </button>
          <ThemeToggle className="shrink-0" />
          <Link to="/" className="hidden min-h-10 shrink-0 items-center rounded-full bg-night px-4 text-footnote font-bold text-paper md:inline-flex dark:bg-paper dark:text-ink">
            Member view
          </Link>
          <button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()} className="grid size-10 shrink-0 place-items-center rounded-full bg-fill hover:bg-fill-2">
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-5 px-3 pt-6 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="type-display text-[clamp(1.5rem,5vw,3.2rem)] leading-none tracking-tight uppercase">{current.heading}</h1>
          {tab === "community" && (
            <Pills
              label="Community section"
              value={community}
              onChange={setCommunity}
              options={[
                { value: "moderation", label: "Reports" },
                { value: "experts", label: "Experts" },
                { value: "agencies", label: "Agencies" },
                { value: "news", label: "News" },
              ]}
            />
          )}
        </div>
        {tab === "dashboard" && <Dashboard go={go} />}
        {tab === "usage" && <Usage />}
        {tab === "members" && <Members />}
        {tab === "revenue" && <Revenue />}
        {tab === "ai" && <AiUsage go={go} />}
        {tab === "community" && (
          <div className="max-w-4xl">
            {community === "moderation" && <Moderation />}
            {community === "experts" && <ExpertsAdmin />}
            {community === "agencies" && <AgencyReview />}
            {community === "news" && <NewsAdmin />}
          </div>
        )}
        {tab === "security" && <SecurityPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

function EnrolBanner({ onEnrolled }: { onEnrolled: () => void }) {
  const [enrol, setEnrol] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  return (
    <Card className="mb-5 flex flex-col gap-3 border-l-4 border-gold p-5">
      <p className="text-headline font-semibold">Set up your authenticator app to open the console</p>
      {!enrol ? (
        <>
          <p className="text-subhead text-label-2">Admin access needs an authenticator app (Google Authenticator, Microsoft Authenticator or 1Password). You'll enter a code each time you open the console.</p>
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

function NewsAdmin() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof adminNews>> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => adminNews().then(setItems, (e: Error) => (toast(e.message, "warn"), setItems([]))), []);
  useEffect(() => {
    void load();
  }, [load]);
  const toggle = (id: number, hidden: boolean) =>
    setNewsHidden(id, hidden).then(
      () => {
        setItems((list) => list?.map((n) => (n.id === id ? { ...n, hidden } : n)) ?? null);
        toast(hidden ? "Story removed" : "Story restored");
      },
      (e: Error) => toast(e.message, "warn"),
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          icon={<Newspaper className="size-5" aria-hidden />}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const n = await refreshNews();
              toast(n ? `${n} new stories added` : "No new stories right now");
              await load();
            } catch {
              toast("Couldn't fetch news. Try again.", "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Fetching…" : "Fetch latest stories"}
        </Button>
        <p className="text-footnote text-label-2">Pulled every 3 hours from RNZ, Beehive, Stuff and Google News. Removed stories stay hidden.</p>
      </div>
      {!items && <div className="h-40 animate-pulse rounded-card bg-fill-2" />}
      {items?.length === 0 && <p className="px-1 text-subhead text-label-2">No stories yet. Fetch the latest to fill the feed.</p>}
      <ul className="flex flex-col gap-2">
        {items?.map((n) => (
          <li key={n.id}>
            <Card className={cn("flex items-start gap-3 p-4", n.hidden && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <a href={n.url} target="_blank" rel="noreferrer" className="text-callout font-semibold hover:underline">
                  {n.title}
                </a>
                <p className="text-footnote text-label-2">
                  {n.source} · {relativeDay(n.published_at)}
                  {n.hidden ? " · removed" : ""}
                </p>
              </div>
              <Button size="sm" variant={n.hidden ? "tinted" : "destructive"} onClick={() => toggle(n.id, !n.hidden)} aria-label={`${n.hidden ? "Restore" : "Remove"} story: ${n.title}`}>
                {n.hidden ? "Restore" : "Remove"}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
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
