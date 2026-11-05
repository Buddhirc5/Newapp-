import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, Search, BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select, Switch, TextField } from "@/components/ui/Controls";
import { AlertDialog, Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatLkr, formatNumber, relativeDay } from "@/lib/format";
import { downloadCsv, fetchMembers, memberAction, PATH_LABEL, PLAN_LABEL, signOutMember, SITUATION_LABEL, STAGE_LABEL, updateMember, type Member } from "./api";
import { Kpi, Panel } from "./charts";
import { Skeleton } from "./Dashboard";

type Sort = "newest" | "active" | "ai" | "paid" | "name";
const PLAN_TONE: Record<string, string> = {
  ultra: "bg-night text-paper",
  pro: "bg-gold-soft text-ink",
  trial: "bg-malibu-soft text-ink",
  free: "bg-fill-2 text-label-2",
};

const isLocked = (m: Member) => Boolean(m.banned_until && new Date(m.banned_until) > new Date());
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Never");

export function Members() {
  const [rows, setRows] = useState<Member[] | null>(null);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("all");
  const [stage, setStage] = useState("all");
  const [situation, setSituation] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [editing, setEditing] = useState<Member | null>(null);
  const [confirm, setConfirm] = useState<{ action: "signout" | "lock" | "unlock" | "delete"; member: Member } | null>(null);

  const load = useCallback(() => fetchMembers().then(setRows, (e: Error) => (toast(e.message, "warn"), setRows([]))), []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (rows ?? []).filter(
      (m) =>
        (plan === "all" || (plan === "locked" ? isLocked(m) : m.effective_plan === plan)) &&
        (stage === "all" || m.stage === stage) &&
        (situation === "all" || m.situation === situation) &&
        (!term || [m.display_name, m.email, m.city, m.id].some((v) => (v ?? "").toLowerCase().includes(term))),
    );
    const by: Record<Sort, (a: Member, b: Member) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      active: (a, b) => (b.last_active ?? "").localeCompare(a.last_active ?? ""),
      ai: (a, b) => b.ai_30d - a.ai_30d,
      paid: (a, b) => Number(b.paid_lkr) - Number(a.paid_lkr),
      name: (a, b) => a.display_name.localeCompare(b.display_name),
    };
    return [...list].sort(by[sort]);
  }, [rows, q, plan, stage, situation, sort]);

  const all = rows ?? [];
  const week = Date.now() - 7 * 86_400_000;
  const active7 = all.filter((m) => m.last_active && Date.parse(m.last_active) > week).length;
  const paying = all.filter((m) => m.effective_plan === "pro" || m.effective_plan === "ultra").length;
  const locked = all.filter(isLocked).length;

  const run = async () => {
    if (!confirm) return;
    const { action, member } = confirm;
    setConfirm(null);
    try {
      if (action === "signout") await signOutMember(member.id);
      else await memberAction(action, member.id);
      toast({ signout: "Signed out of every device", lock: "Account locked", unlock: "Account unlocked", delete: "Account deleted" }[action]);
      void load();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Registered" value={rows ? formatNumber(all.length) : "…"} sub="member accounts" />
        <Kpi label="Active (7 days)" value={rows ? formatNumber(active7) : "…"} sub={rows && all.length ? `${Math.round((active7 / all.length) * 100)}% of members` : ""} tone="muted" />
        <Kpi label="Paying" value={rows ? formatNumber(paying) : "…"} sub="Main or Ultra" tone="gold" />
        <Kpi label="Locked" value={rows ? formatNumber(locked) : "…"} sub="can't sign in" tone={locked ? "pink" : "plain"} />
      </div>

      <Panel
        title="Members"
        sub={`${shown.length} shown`}
        actions={
          <Button
            size="sm"
            variant="dark"
            disabled={!shown.length}
            icon={<FileDown className="size-4" aria-hidden />}
            onClick={() =>
              downloadCsv(
                "kiwipath-members",
                shown.map((m) => ({
                  name: m.display_name,
                  email: m.email,
                  package: PLAN_LABEL[m.effective_plan],
                  package_until: m.plan_ends_at,
                  stage: STAGE_LABEL[m.stage] ?? m.stage,
                  path: PATH_LABEL[m.path] ?? m.path,
                  situation: SITUATION_LABEL[m.situation] ?? m.situation,
                  city: m.city,
                  ai_requests_30d: m.ai_30d,
                  listings: m.listings,
                  bookings: m.bookings,
                  paid_lkr: m.paid_lkr,
                  joined: m.created_at,
                  last_active: m.last_active,
                  locked: isLocked(m) ? "yes" : "no",
                })),
              )
            }
          >
            Export (CSV)
          </Button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-label-3" aria-hidden />
            <TextField label="Search members" hideLabel placeholder="Search name, email or city" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
          </div>
          <Select label="Package" hideLabel value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="all">All packages</option>
            <option value="ultra">Ultra</option>
            <option value="pro">Main</option>
            <option value="trial">Free month</option>
            <option value="free">Free</option>
            <option value="locked">Locked accounts</option>
          </Select>
          <Select label="Stage" hideLabel value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All stages</option>
            {Object.entries(STAGE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select label="Location" hideLabel value={situation} onChange={(e) => setSituation(e.target.value)}>
            <option value="all">Everywhere</option>
            {Object.entries(SITUATION_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Select label="Sort" hideLabel value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Sort: newest</option>
            <option value="active">Sort: recently active</option>
            <option value="ai">Sort: most AI use</option>
            <option value="paid">Sort: most paid</option>
            <option value="name">Sort: name</option>
          </Select>
        </div>

        {!rows ? (
          <Skeleton h="h-64" />
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-subhead text-label-2">No members match these filters.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <table className="w-full min-w-[64rem] text-left text-subhead">
              <thead className="text-caption font-bold tracking-wide text-label-2 uppercase">
                <tr className="border-b border-sep">
                  <th className="py-2.5 pr-3">Member</th>
                  <th className="px-3 py-2.5">Package</th>
                  <th className="px-3 py-2.5">Stage / path</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5 text-right">AI 30d</th>
                  <th className="px-3 py-2.5 text-right">Paid</th>
                  <th className="px-3 py-2.5">Last active</th>
                  <th className="py-2.5 pl-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id} className={cn("border-b border-sep last:border-0", isLocked(m) && "opacity-60")}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.display_name} size={36} tint="lavender" />
                        <div className="min-w-0 max-w-[10.5rem] sm:max-w-none">
                          <p className="flex items-center gap-1 font-semibold">
                            <span className="truncate">{m.display_name}</span>
                            {m.verified && <BadgeCheck className="size-4 shrink-0 text-teal" aria-label="Verified" />}
                          </p>
                          <p className="truncate text-footnote text-label-2">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded-full px-2.5 py-1 text-caption font-bold whitespace-nowrap", PLAN_TONE[m.effective_plan])}>{PLAN_LABEL[m.effective_plan]}</span>
                      {m.plan_ends_at && (m.effective_plan === "pro" || m.effective_plan === "ultra") && (
                        <p className="mt-1 text-caption text-label-2">until {new Date(m.plan_ends_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p>{STAGE_LABEL[m.stage] ?? m.stage}</p>
                      <p className="text-footnote text-label-2">{PATH_LABEL[m.path] ?? m.path}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p>{SITUATION_LABEL[m.situation] ?? m.situation}</p>
                      <p className="text-footnote text-label-2">{m.city || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular">{formatNumber(m.ai_30d)}</td>
                    <td className="px-3 py-2.5 text-right tabular">{Number(m.paid_lkr) ? formatLkr(Number(m.paid_lkr)) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <p>{m.last_active ? relativeDay(m.last_active) : "Never"}</p>
                      <p className="text-footnote text-label-2">joined {relativeDay(m.created_at)}</p>
                    </td>
                    <td className="py-2.5 pl-3">
                      <div className="flex justify-end gap-3 text-footnote font-bold whitespace-nowrap">
                        <button type="button" className="underline underline-offset-2" onClick={() => setEditing(m)}>
                          Edit
                        </button>
                        <button type="button" className="underline underline-offset-2" onClick={() => setConfirm({ action: isLocked(m) ? "unlock" : "lock", member: m })}>
                          {isLocked(m) ? "Unlock" : "Lock"}
                        </button>
                        <button type="button" className="underline underline-offset-2" onClick={() => setConfirm({ action: "signout", member: m })}>
                          Sign out
                        </button>
                        <button type="button" className="text-coral-ink underline underline-offset-2" onClick={() => setConfirm({ action: "delete", member: m })}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <MemberSheet member={editing} onClose={() => setEditing(null)} onSaved={load} />
      <AlertDialog
        open={confirm !== null}
        title={
          confirm
            ? { signout: `Sign ${confirm.member.display_name} out everywhere?`, lock: `Lock ${confirm.member.display_name}?`, unlock: `Unlock ${confirm.member.display_name}?`, delete: `Delete ${confirm.member.display_name}?` }[confirm.action]
            : ""
        }
        message={
          confirm
            ? {
                signout: "They'll need to sign in again on every device.",
                lock: "They're signed out and can't sign in until you unlock them. Their data is kept.",
                unlock: "They can sign in again straight away.",
                delete: "Their account, posts, messages and saved progress are permanently deleted. Payment records are kept without their name. This can't be undone.",
              }[confirm.action]
            : ""
        }
        confirmLabel={confirm ? { signout: "Sign out", lock: "Lock account", unlock: "Unlock", delete: "Delete for good" }[confirm.action] : ""}
        destructive={confirm?.action === "delete" || confirm?.action === "lock"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
    </div>
  );
}

function MemberSheet({ member, onClose, onSaved }: { member: Member | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Member | null>(member);
  useEffect(() => setDraft(member), [member]);
  if (!draft) return null;
  const extend = (field: "trial_ends_at" | "plan_ends_at", days: number) => {
    const from = Math.max(Date.now(), Date.parse(draft[field] ?? "") || 0);
    setDraft({ ...draft, [field]: new Date(from + days * 86_400_000).toISOString() });
  };
  const save = async () => {
    try {
      await updateMember(draft.id, {
        plan: draft.plan,
        plan_ends_at: draft.plan === "pro" || draft.plan === "ultra" ? draft.plan_ends_at : null,
        verified: draft.verified,
        role: draft.role,
        stage: draft.stage,
        trial_ends_at: draft.trial_ends_at,
      });
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
        <dl className="grid grid-cols-2 gap-2 text-subhead sm:grid-cols-3">
          {[
            ["Joined", relativeDay(draft.created_at)],
            ["Last active", draft.last_active ? relativeDay(draft.last_active) : "Never"],
            ["Last sign-in", when(draft.last_sign_in_at)],
            ["AI (30 days)", formatNumber(draft.ai_30d)],
            ["Listings", formatNumber(draft.listings)],
            ["Bookings", formatNumber(draft.bookings)],
            ["Paid in total", formatLkr(Number(draft.paid_lkr))],
            ["Path", PATH_LABEL[draft.path] ?? draft.path],
            ["City", draft.city || "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-fill px-3 py-2">
              <dt className="text-caption text-label-2">{k}</dt>
              <dd className="truncate font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <Select label="Package" value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value, plan_ends_at: draft.plan_ends_at ?? new Date(Date.now() + 30 * 86_400_000).toISOString() })}>
          <option value="trial">Free month</option>
          <option value="free">Free</option>
          <option value="pro">Main</option>
          <option value="ultra">Ultra</option>
        </Select>
        {(draft.plan === "pro" || draft.plan === "ultra") && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-surface px-4 py-3 shadow-card">
            <p className="text-subhead">
              Paid access until <b>{draft.plan_ends_at ? new Date(draft.plan_ends_at).toLocaleDateString("en-NZ") : "no end date (complimentary)"}</b>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="tinted" onClick={() => extend("plan_ends_at", 30)}>
                +30 days
              </Button>
              <Button size="sm" variant="plain" onClick={() => setDraft({ ...draft, plan_ends_at: null })}>
                No end
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 rounded-tile bg-surface px-4 py-3 shadow-card">
          <p className="text-subhead">
            Free month ends <b>{new Date(draft.trial_ends_at).toLocaleDateString("en-NZ")}</b>
          </p>
          <Button size="sm" variant="tinted" onClick={() => extend("trial_ends_at", 30)}>
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
        <p className="text-footnote text-label-2">Every change is recorded in the Security audit log.</p>
      </div>
    </Sheet>
  );
}
