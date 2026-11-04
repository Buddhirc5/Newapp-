import { CircleCheck, CircleDashed, Clock, LoaderCircle } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, Meter, Notice } from "@/components/ui/Bits";
import { SegmentedControl } from "@/components/ui/Controls";
import { DOCUMENT_BY_ID } from "@/data/documents";
import { cn } from "@/lib/cn";
import { usePathways } from "@/lib/content";
import { HAS_SUPABASE } from "@/lib/env";
import { useApp } from "@/store/app";
import type { DocStatus } from "@/types";

const ICON = { todo: CircleDashed, doing: LoaderCircle, done: CircleCheck };

export function Documents() {
  const pathId = useApp((s) => s.pathId);
  const docs = useApp((s) => s.docs);
  const setDoc = useApp((s) => s.setDoc);
  const pathway = usePathways()[pathId];
  const list = pathway.documents.map((id) => DOCUMENT_BY_ID[id]).filter(Boolean);
  const done = list.filter((d) => docs[d.id] === "done").length;

  return (
    <Page title="Documents" back={{ to: "/tools", label: "Tools" }} lead={`What you'll usually need for the ${pathway.name.toLowerCase()} path. Start the slow ones first.`}>
      <div className="flex flex-col gap-6">
        <Card className="flex items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-headline font-semibold tabular">
              {done} of {list.length} ready
            </p>
            <Meter value={list.length ? done / list.length : 0} className="mt-2" />
          </div>
        </Card>

        <ul className="flex flex-col gap-3">
          {list.map((d) => {
            const status: DocStatus = docs[d.id] ?? "todo";
            const Icon = ICON[status];
            return (
              <li key={d.id} className="rounded-tile bg-surface p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 size-6 shrink-0", status === "done" ? "text-teal" : status === "doing" ? "text-orange" : "text-label-3")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-headline font-semibold">{d.title}</p>
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
              </li>
            );
          })}
        </ul>

        <Notice title="Keep copies safe">
          KiwiPath tracks which documents are ready{HAS_SUPABASE ? " and syncs that status to your account" : ""}. Keep the scans themselves in a secure
          place you control, and never send your original passport to an agent.
        </Notice>
      </div>
    </Page>
  );
}
