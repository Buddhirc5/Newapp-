import { useEffect, useMemo, useState } from "react";
import { Bug, FileDown, ShieldCheck, Trash2 } from "lucide-react";
import { clearErrors, fetchErrors, type ClientError } from "@/lib/monitor";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { fetchAudit, fetchPaymentEvents, type AuditRow, type PaymentEventRow } from "@/lib/community";
import { formatNumber, relativeDay } from "@/lib/format";
import { downloadCsv } from "./api";
import { Kpi, Panel, Pills } from "./charts";
import { Skeleton } from "./Dashboard";

const CONTROLS: { title: string; detail: string }[] = [
  { title: "Member data kept separate", detail: "Row-level security checks every read and write against the signed-in member. Nobody can read another member's progress, documents or messages." },
  { title: "Authenticator app for admins", detail: "Admin rights only work after a 6-digit authenticator code in the same session, enforced by the database." },
  { title: "Admin lockout and idle sign-out", detail: "5 wrong passwords or codes lock the admin sign-in for 10 minutes. Admins are signed out after 15 minutes without activity." },
  { title: "Audit log", detail: "Every admin change is recorded by the database. Admins can read it; nobody can edit or delete it from the app." },
  { title: "AI limits enforced on the server", detail: "Each AI request is reserved against the member's daily limit before Claude is called, so parallel requests can't go over." },
  { title: "Rate limits", detail: "Hourly caps on listings, messages, reports, bookings, meetups and agency suggestions stop flooding and spam." },
  { title: "Browser protections", detail: "Content-Security-Policy, no framing, no MIME sniffing, and camera and microphone limited to KiwiPath." },
  { title: "Website allow-list", detail: "Backend functions only answer browsers on kiwipath.space (plus ALLOWED_ORIGINS)." },
  { title: "Uploads checked by content", detail: "Documents are checked by their real file type and size, stored privately, and deleted right after the AI check." },
  { title: "Error monitoring", detail: "App crashes are reported with the screen and build, so problems are fixed before members report them. No personal content is sent." },
  { title: "Signed payments", detail: "PayHere notifications must carry a valid signature and the exact amount and currency of the order." },
];

const ACTION_LABEL: Record<string, string> = { insert: "Created", update: "Changed", delete: "Deleted", sign_out: "Signed out", lock: "Locked", unlock: "Unlocked" };
const TABLE_LABEL: Record<string, string> = {
  profiles: "Member",
  app_settings: "Setting",
  listings: "Listing",
  agencies: "Agency",
  provider_applications: "Provider application",
  gigs: "Expert session",
  gig_orders: "Booking",
  news_items: "News story",
  reports: "Report",
  payments: "Payment",
  groups: "Group",
  "auth.users": "Account",
};

export function SecurityPage() {
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [events, setEvents] = useState<PaymentEventRow[]>([]);
  const [table, setTable] = useState("all");
  const [view, setView] = useState<"audit" | "payments" | "errors">("audit");
  const [errors, setErrors] = useState<ClientError[] | null>(null);
  const loadErrors = () => fetchErrors().then(setErrors, () => setErrors([]));
  useEffect(() => {
    void loadErrors();
    fetchAudit().then(setAudit, (e: Error) => (toast(e.message, "warn"), setAudit([])));
    fetchPaymentEvents().then(setEvents, () => undefined);
  }, []);
  const shown = useMemo(() => (audit ?? []).filter((a) => table === "all" || a.target_table === table), [audit, table]);
  const rejected = events.filter((e) => !e.accepted);
  const errors24 = (errors ?? []).filter((e) => Date.now() - Date.parse(e.created_at) < 86_400_000).length;
  const groups = useMemo(() => {
    const m = new Map<string, { message: string; count: number; last: ClientError; users: Set<string>; pages: Set<string> }>();
    for (const e of errors ?? []) {
      const g = m.get(e.message) ?? { message: e.message, count: 0, last: e, users: new Set<string>(), pages: new Set<string>() };
      g.count += 1;
      if (e.user_id) g.users.add(e.user_id);
      g.pages.add(e.url);
      m.set(e.message, g);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [errors]);
  const today = (audit ?? []).filter((a) => Date.now() - Date.parse(a.created_at) < 86_400_000).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Controls on" value={`${CONTROLS.length} of ${CONTROLS.length}`} sub="always on, enforced by the server" tone="green" />
        <Kpi label="Admin actions" value={audit ? formatNumber(audit.length) : "…"} sub={`${today} in the last 24 hours`} />
        <Kpi label="App errors" value={errors ? formatNumber(errors24) : "…"} sub={`last 24 hours · ${groups.length} kinds in 30 days`} tone={errors24 ? "pink" : "plain"} />
        <Kpi label="Rejected notices" value={formatNumber(rejected.length)} sub="bad signature or amount" tone={rejected.length ? "pink" : "plain"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Panel className="xl:col-span-2" title="Security controls" sub="What protects member data and payments.">
          <ul className="flex flex-col divide-y divide-sep">
            {CONTROLS.map((c) => (
              <li key={c.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-malibu-soft text-ink">
                  <ShieldCheck className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-callout font-bold">{c.title}</p>
                  <p className="text-footnote text-label-2">{c.detail}</p>
                </div>
                <span className="shrink-0 self-start rounded-md bg-fill px-2 py-1 text-caption font-bold tracking-wide text-label-2">ALWAYS ON</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="xl:col-span-3"
          title={view === "audit" ? "Admin activity" : view === "errors" ? "App errors" : "Payment notifications"}
          sub={view === "audit" ? "Who changed what, newest first." : view === "errors" ? "Crashes reported by members' browsers, grouped. Kept for 30 days." : "Every PayHere notification, accepted or rejected."}
          actions={
            <Pills
              label="Log"
              value={view}
              onChange={setView}
              options={[
                { value: "audit", label: "Admin activity" },
                { value: "payments", label: "Payments" },
                { value: "errors", label: "Errors" },
              ]}
            />
          }
        >
          {view === "audit" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Select label="Filter" hideLabel value={table} onChange={(e) => setTable(e.target.value)} wrapClassName="w-56">
                  <option value="all">Everything</option>
                  {Object.entries(TABLE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  variant="tinted"
                  className="ml-auto"
                  disabled={!shown.length}
                  icon={<FileDown className="size-4" aria-hidden />}
                  onClick={() => downloadCsv("kiwipath-audit", shown.map((a) => ({ when: a.created_at, admin: a.actor, action: a.action, item: a.target_table, id: a.target_id, changes: JSON.stringify(a.changes) })))}
                >
                  Export
                </Button>
              </div>
              {!audit ? (
                <Skeleton />
              ) : shown.length === 0 ? (
                <p className="py-6 text-center text-subhead text-label-2">No admin activity yet.</p>
              ) : (
                <ul className="flex max-h-[34rem] flex-col divide-y divide-sep overflow-auto">
                  {shown.map((a) => (
                    <li key={a.id} className="flex gap-3 py-3">
                      <span className={cn("h-fit shrink-0 rounded-md px-2 py-1 text-caption font-bold", a.action === "delete" ? "bg-coral-soft text-coral-ink" : a.action === "insert" ? "bg-green-soft text-green-ink" : "bg-fill text-label-2")}>
                        {(ACTION_LABEL[a.action] ?? a.action).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-callout font-semibold">
                          {TABLE_LABEL[a.target_table] ?? a.target_table}
                          {a.target_id && <span className="ml-1.5 font-mono text-footnote font-normal text-label-2">{a.target_id.slice(0, 12)}</span>}
                        </p>
                        {Object.keys(a.changes).length > 0 && (
                          <p className="mt-0.5 text-footnote break-words text-label-2">
                            {Object.entries(a.changes)
                              .slice(0, 4)
                              .map(([k, v]) => `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`)
                              .join(" · ")}
                          </p>
                        )}
                        <p className="mt-0.5 text-caption text-label-3">
                          {a.actor ? `admin ${a.actor.slice(0, 8)}` : "system"} · {relativeDay(a.created_at)} · {new Date(a.created_at).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : view === "errors" ? (
            <ErrorList groups={groups} loading={!errors} onClear={async () => {
              await clearErrors().catch((e: Error) => toast(e.message, "warn"));
              void loadErrors();
            }} />
          ) : events.length === 0 ? (
            <p className="py-6 text-center text-subhead text-label-2">No payment notifications yet.</p>
          ) : (
            <ul className="flex max-h-[34rem] flex-col divide-y divide-sep overflow-auto">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span className={cn("shrink-0 rounded-md px-2 py-1 text-caption font-bold", e.accepted ? "bg-green-soft text-green-ink" : "bg-coral-soft text-coral-ink")}>{e.accepted ? "ACCEPTED" : "REJECTED"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-callout font-semibold">{e.accepted ? `Status ${e.status_code}` : e.reason}</p>
                    <p className="truncate text-footnote text-label-2">
                      Order {e.order_ref || "?"} · {new Date(e.created_at).toLocaleString("en-NZ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ErrorList({ groups, loading, onClear }: { groups: { message: string; count: number; last: ClientError; users: Set<string>; pages: Set<string> }[]; loading: boolean; onClear: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (loading) return <Skeleton />;
  if (!groups.length)
    return (
      <p className="flex flex-col items-center gap-2 py-8 text-center text-subhead text-label-2">
        <Bug className="size-6" aria-hidden />
        No app errors reported. Nice.
      </p>
    );
  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" variant="tinted" icon={<Trash2 className="size-4" aria-hidden />} onClick={onClear}>
          Clear all
        </Button>
      </div>
      <ul className="flex max-h-[34rem] flex-col divide-y divide-sep overflow-auto">
        {groups.map((g) => (
          <li key={g.message} className="py-3">
            <button type="button" className="flex w-full gap-3 text-left" aria-expanded={open === g.message} onClick={() => setOpen(open === g.message ? null : g.message)}>
              <span className="h-fit shrink-0 rounded-md bg-coral-soft px-2 py-1 text-caption font-bold text-coral-ink tabular">×{g.count}</span>
              <div className="min-w-0 flex-1">
                <p className="text-callout font-semibold break-words">{g.message}</p>
                <p className="mt-0.5 text-caption text-label-3">
                  {g.users.size} member{g.users.size === 1 ? "" : "s"} · {[...g.pages].slice(0, 3).join(", ")} · build {g.last.release} · {relativeDay(g.last.created_at)}
                </p>
              </div>
            </button>
            {open === g.message && (
              <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-fill p-3 font-mono text-caption whitespace-pre-wrap text-label-2">
                {g.last.stack || "No stack trace"}
                {"\n\n"}
                {g.last.user_agent}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
