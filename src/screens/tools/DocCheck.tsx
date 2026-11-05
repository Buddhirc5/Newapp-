import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, FileUp, MinusCircle, ShieldCheck } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { RequireMember } from "@/components/RequireMember";
import { Card, Notice, SectionHeader } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { aiChecksEnabled, analyzeDocument, fetchDocReviews, type DocReview } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { relativeDay } from "@/lib/format";

const TYPES: [string, string][] = [
  ["passport", "Passport bio page"],
  ["bank_statement", "Bank statement (proof of funds)"],
  ["police_certificate", "Police clearance certificate"],
  ["reference_letter", "Employment reference letter"],
  ["offer_letter", "University offer of place"],
  ["english_test", "IELTS / PTE / TOEFL result"],
  ["degree_certificate", "Degree certificate or transcript"],
  ["marriage_certificate", "Marriage certificate"],
  ["birth_certificate", "Birth certificate"],
  ["sponsor_letter", "Sponsor letter"],
  ["cv", "CV / résumé"],
  ["other", "Something else"],
];

export function DocCheck() {
  return (
    <Page title="Document Check" back={{ to: "/tools", label: "Tools" }} lead="Upload a document and get a checklist of what to fix, get or improve before you submit it.">
      {HAS_SUPABASE ? (
        <RequireMember reason="Sign in to check your documents.">
          <Checker />
        </RequireMember>
      ) : (
        <Notice title="Online only">Document checks work in the online version of KiwiPath.</Notice>
      )}
    </Page>
  );
}

function Checker() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [type, setType] = useState("bank_statement");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DocReview | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchDocReviews>>>([]);

  useEffect(() => {
    aiChecksEnabled().then(setEnabled, () => setEnabled(false));
    fetchDocReviews().then(setHistory, () => undefined);
  }, []);

  if (enabled === null) return <div className="h-40 animate-pulse rounded-card bg-fill-2" />;
  if (!enabled)
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <Mascot mood="thinking" className="w-28" />
        <p className="text-headline font-semibold">Document checks are coming soon</p>
        <p className="max-w-sm text-subhead text-label-2">Meanwhile, the Documents tracker and Guides list what each document needs.</p>
      </Card>
    );

  const run = async () => {
    if (!file) return;
    if (file.size > 9.5 * 1024 * 1024) {
      toast("That file is over 10 MB. Try a photo or a smaller PDF.", "warn");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await analyzeDocument(file, type);
      setResult(res.result);
      toast(`Checked. ${res.remaining} checks left today`, "info");
      fetchDocReviews().then(setHistory, () => undefined);
    } catch (e) {
      toast((e as Error).message, "warn");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Select label="Document type" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-fill-3 bg-surface p-6 text-center hover:bg-surface-2">
        <FileUp className="size-8 text-label-3" aria-hidden />
        <span className="text-headline font-semibold">{file ? file.name : "Choose a photo or PDF"}</span>
        <span className="text-footnote text-label-2">JPG, PNG or PDF up to 10 MB. Take a flat, well-lit photo.</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <p className="flex gap-2 rounded-tile bg-green-soft px-4 py-3 text-footnote text-label-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-ink" aria-hidden />
        Your file is stored privately while it's checked, then deleted. Only the checklist is kept, and you can delete it.
      </p>
      <Button onClick={run} disabled={!file || busy}>
        {busy ? "Checking… this can take up to a minute" : "Check document"}
      </Button>

      {result && <ReviewCard review={result} />}

      {history.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="past">
          <SectionHeader id="past" title="Earlier checks" />
          {history.map((h) => (
            <details key={h.id} className="rounded-tile bg-surface p-4 shadow-card">
              <summary className="min-h-8 cursor-pointer text-callout font-semibold">
                {TYPES.find(([v]) => v === h.doc_type)?.[1] ?? h.doc_type} · {relativeDay(h.created_at)}
              </summary>
              <div className="mt-3">
                <ReviewCard review={h.result} />
              </div>
            </details>
          ))}
        </section>
      )}
      <Notice>An automated check isn't immigration advice and can miss things. For important applications, ask a licensed adviser to review your documents.</Notice>
    </div>
  );
}

export function ReviewCard({ review }: { review: DocReview }) {
  const icon = { fix: MinusCircle, improve: CircleAlert, ok: CircleCheck };
  const tone = { fix: "bg-coral-soft", improve: "bg-gold-soft", ok: "bg-green-soft" };
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <Card className="p-4">
        <p className="text-footnote font-semibold text-label-2 uppercase">{review.document_type}</p>
        <p className="mt-1 text-callout">{review.summary}</p>
        {review.fields.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {review.fields.map((f) => (
              <div key={f.label} className="rounded-xl bg-fill px-3 py-2">
                <dt className="text-caption text-label-2">{f.label}</dt>
                <dd className="text-subhead font-semibold break-words">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
      <ul className="flex flex-col gap-2">
        {[...review.issues]
          .sort((a, b) => ["fix", "improve", "ok"].indexOf(a.severity) - ["fix", "improve", "ok"].indexOf(b.severity))
          .map((i) => {
            const Icon = icon[i.severity];
            return (
              <li key={i.title} className={cn("flex gap-3 rounded-tile p-4", tone[i.severity])}>
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-headline font-semibold">{i.title}</p>
                  <p className="text-subhead text-label-2">{i.detail}</p>
                </div>
              </li>
            );
          })}
      </ul>
      {review.next_steps.length > 0 && (
        <Card className="p-4">
          <p className="text-headline font-semibold">Next steps</p>
          <ol className="mt-2 list-decimal pl-5 text-subhead">
            {review.next_steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
