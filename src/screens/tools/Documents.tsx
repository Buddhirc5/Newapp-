import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CircleCheck, CircleDashed, Clock, LoaderCircle } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Meter, Notice } from "@/components/ui/Bits";
import { SegmentedControl } from "@/components/ui/Controls";
import { DOCUMENT_BY_ID, DOCUMENTS } from "@/data/documents";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { HAS_SUPABASE } from "@/lib/env";
import { DOC_RULES, docAlert, type DocAlert } from "@/logic/docs";
import { useApp } from "@/store/app";
import type { DocStatus } from "@/types";

const ICON = { todo: CircleDashed, doing: LoaderCircle, done: CircleCheck };
const ALERT_STYLE: Record<DocAlert["level"], string> = {
  expired: "bg-coral-soft text-coral-ink",
  soon: "bg-gold/20 text-label",
  ok: "bg-green-soft text-green-ink",
  unknown: "",
};

/** Visa document tracker: status, issue and expiry dates, and alerts before anything goes out of date. */
export function Documents() {
  const pathId = useApp((s) => s.pathId);
  const docs = useApp((s) => s.docs);
  const dates = useApp((s) => s.docDates);
  const setDoc = useApp((s) => s.setDoc);
  const setDates = useApp((s) => s.setDocDates);
  const pathway = usePathways()[pathId];
  const [scope, setScope] = useState<"path" | "all">("path");
  const list = (scope === "path" ? pathway.documents.map((id) => DOCUMENT_BY_ID[id]) : DOCUMENTS).filter(Boolean);
  const done = list.filter((d) => docs[d.id] === "done").length;

  const alerts = useMemo(
    () =>
      DOCUMENTS.map((d) => ({ d, a: docAlert(d.id, dates[d.id]) }))
        .filter((x) => x.a.level === "expired" || x.a.level === "soon")
        .sort((x, y) => (x.a.days ?? 0) - (y.a.days ?? 0)),
    [dates],
  );

  return (
    <Page title="Visa documents" back={{ to: "/tools", label: "Tools" }} lead={`Track every document for the ${pathway.name.toLowerCase()} path, with dates so nothing goes out of date before you apply.`}>
      <div className="flex flex-col gap-6">
        <Card className="flex items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-headline font-semibold tabular">
              {done} of {list.length} ready
            </p>
            <Meter value={list.length ? done / list.length : 0} className="mt-2" />
          </div>
        </Card>

        {alerts.length > 0 && (
          <section aria-label="Date alerts" className="rounded-[1.6rem] bg-night p-5 text-paper">
            <p className="flex items-center gap-2 text-headline font-semibold">
              <AlertTriangle className="size-5 text-gold" aria-hidden />
              {alerts.length === 1 ? "1 document needs attention" : `${alerts.length} documents need attention`}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {alerts.map(({ d, a }) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper/10 px-4 py-3">
                  <span className="font-semibold">{d.title}</span>
                  <span className={cn("text-footnote", a.level === "expired" ? "text-coral" : "text-gold")}>{a.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SegmentedControl
          label="Which documents"
          value={scope}
          onChange={setScope}
          options={[
            { value: "path", label: "My path" },
            { value: "all", label: "All documents" },
          ]}
        />

        <ul className="flex flex-col gap-3">
          {list.map((d) => {
            const status: DocStatus = docs[d.id] ?? "todo";
            const Icon = ICON[status];
            const rule = DOC_RULES[d.id];
            const a = docAlert(d.id, dates[d.id]);
            const showIssued = Boolean(rule?.fromIssue) || d.id === "police" || d.id === "medical";
            const showExpiry = d.id === "passport" || d.id === "insurance" || d.id === "registration";
            return (
              <li key={d.id} className="rounded-tile bg-surface p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 size-6 shrink-0", status === "done" ? "text-teal" : status === "doing" ? "text-orange" : "text-label-3")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-headline font-semibold">{d.title}</p>
                      {a.level !== "unknown" && <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-bold", ALERT_STYLE[a.level])}>{a.text}</span>}
                    </div>
                    <p className="mt-1 text-subhead text-label-2">{d.tip}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-footnote font-medium text-label-2">
                      <Clock className="size-3.5" aria-hidden />
                      {d.leadTime}
                    </p>
                  </div>
                </div>
                <SegmentedControl
                  className="mt-3"
                  size="sm"
                  label={`${d.title} status`}
                  value={status}
                  onChange={(v) => setDoc(d.id, v)}
                  options={[
                    { value: "todo", label: "To do" },
                    { value: "doing", label: "In progress" },
                    { value: "done", label: "Ready" },
                  ]}
                />
                {(showIssued || showExpiry) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {showIssued && <DateField label={d.id === "english" ? "Test date" : "Issued on"} value={dates[d.id]?.issued} onChange={(issued) => setDates(d.id, { issued })} />}
                    {showExpiry && <DateField label="Expires on" value={dates[d.id]?.expires} onChange={(expires) => setDates(d.id, { expires })} />}
                    {rule && (
                      <p className="flex gap-1.5 text-footnote text-label-2 sm:col-span-2">
                        <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        {rule.why}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <Notice title="Keep copies safe">
          KiwiPath tracks which documents are ready and their dates{HAS_SUPABASE ? ", synced to your account" : ""}. Keep the scans themselves somewhere secure you
          control, and never send your original passport to an agent. Date rules are general guidance: check your visa's checklist on immigration.govt.nz.
        </Notice>
      </div>
    </Page>
  );
}

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-footnote font-semibold">{label}</span>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="min-h-11 rounded-xl bg-fill px-3 text-callout text-label outline-none focus-visible:ring-2 focus-visible:ring-teal"
      />
    </label>
  );
}
