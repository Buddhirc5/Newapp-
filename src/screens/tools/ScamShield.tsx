import { useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CircleCheck, Flag, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { Card, SectionHeader, Tag } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Select, TextArea, TextField } from "@/components/ui/Controls";
import { ListGroup, ListRow } from "@/components/ui/List";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { SOURCES } from "@/data/pathways";
import { cn } from "@/lib/cn";
import { submitScamReport } from "@/lib/remote";
import { analyzeMessage, SAMPLE_MESSAGE, segment, type RiskLevel, type ScamResult } from "@/logic/scam";
import { useApp } from "@/store/app";

const LEVEL = {
  low: { label: "Low risk", tint: "green", text: "No common scam signs found. Still verify the employer and any adviser before you pay or share documents." },
  caution: { label: "Be careful", tint: "gold", text: "Some warning signs. Ask questions and verify everything before you go further." },
  high: { label: "High risk", tint: "coral", text: "This looks like a common recruitment scam. Don't pay anything or send your passport." },
} as const;

const MARK: Record<string, string> = {
  high: "bg-coral/45",
  medium: "bg-gold/70",
  low: "bg-lavender/45",
  good: "bg-green/55",
};

export function ScamShield() {
  const addScamCheck = useApp((s) => s.addScamCheck);
  const checks = useApp((s) => s.scamChecks);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ text: string; result: ScamResult } | null>(null);
  const [reporting, setReporting] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const run = (value = text) => {
    const r = analyzeMessage(value);
    setResult({ text: value, result: r });
    if (r.level !== "empty") {
      addScamCheck(r.score);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  return (
    <Page
      title="Scam Shield"
      back={{ to: "/tools", label: "Tools" }}
      hero={
        <div className="pb-6">
          <section className="relative overflow-hidden rounded-[2rem] bg-coral p-5 text-ink sm:p-6">
            <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
            <Mascot mood="worried" tint="malibu" className="pointer-events-none absolute -right-3 -bottom-5 w-28 sm:w-32" />
            <div className="relative max-w-[72%]">
              <h1 className="type-display text-title1 leading-tight">Scam Shield</h1>
              <p className="mt-2 text-callout opacity-85">
                Paste a job offer, agent message or email. The check runs on your phone, so nothing you paste is uploaded.
              </p>
            </div>
          </section>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <TextArea
            label="Message to check"
            placeholder="Paste the WhatsApp message, email or offer letter here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            className="bg-surface shadow-card"
          />
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => run()} disabled={text.trim().length < 12} icon={<ShieldCheck className="size-5" aria-hidden />}>
              Check message
            </Button>
            <Button
              variant="tinted"
              onClick={() => {
                setText(SAMPLE_MESSAGE);
                run(SAMPLE_MESSAGE);
              }}
            >
              Try an example
            </Button>
          </div>
          <p className="px-1 text-footnote text-label-2">
            {checks.length > 0 ? `You've checked ${checks.length} message${checks.length === 1 ? "" : "s"}. ` : ""}A low score isn't proof a message is genuine.
            Always verify.
          </p>
        </div>

        <div ref={resultRef} aria-live="polite" className="scroll-mt-20">
          {result && result.result.level !== "empty" && <Result text={result.text} result={result.result} onReport={() => setReporting(true)} />}
        </div>

        <ListGroup header="Verify before you trust" footer="Recruitment agencies in Sri Lanka that place people overseas must hold an SLBFE licence.">
          <ListRow title="Accredited employer list" subtitle="Immigration New Zealand" href={SOURCES.inz.href} accessory="external" />
          <ListRow title="Licensed immigration advisers" subtitle="Immigration Advisers Authority register" href={SOURCES.iaa.href} accessory="external" />
          <ListRow
            title="Licensed foreign employment agencies"
            subtitle="Sri Lanka Bureau of Foreign Employment"
            href={SOURCES.slbfe.href}
            accessory="external"
          />
          <ListRow title="Report an online scam" subtitle="Netsafe New Zealand" href={SOURCES.netsafe.href} accessory="external" />
        </ListGroup>
      </div>

      <ReportSheet open={reporting} onClose={() => setReporting(false)} initialSummary={result?.text.slice(0, 280) ?? ""} />
    </Page>
  );
}

function Result({ text, result, onReport }: { text: string; result: ScamResult; onReport: () => void }) {
  const level = LEVEL[result.level as Exclude<RiskLevel, "empty">];
  const parts = useMemo(() => segment(text, result.highlights), [text, result.highlights]);
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col items-center gap-2 p-6 text-center">
        <Gauge score={result.score} />
        <Tag tint={level.tint} tilt={-3} className="-mt-2">
          {level.label}
        </Tag>
        <p className="type-display mt-2 text-title2">
          {result.warnings.length === 0 ? "No warning signs" : `${result.warnings.length} warning sign${result.warnings.length === 1 ? "" : "s"}`}
        </p>
        <p className="max-w-md text-subhead text-label-2">{level.text}</p>
      </Card>

      <section aria-labelledby="highlights" className="flex flex-col gap-2">
        <SectionHeader id="highlights" title="What we spotted" />
        <Card className="p-4">
          <p className="text-callout leading-relaxed break-words whitespace-pre-wrap">
            {parts.map((p, i) =>
              p.severity ? (
                <mark key={i} className={cn("rounded px-0.5 text-label", MARK[p.severity])}>
                  {p.text}
                </mark>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-caption text-label-2" aria-label="Highlight key">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-coral/60" />
              Serious
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-gold" />
              Warning
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-lavender/60" />
              Minor
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-green" />
              Good sign
            </span>
          </div>
        </Card>
      </section>

      {result.warnings.length > 0 && (
        <ul className="flex flex-col gap-2.5" aria-label="Warning signs">
          {result.warnings.map((f) => (
            <li
              key={f.rule.id}
              className={cn(
                "rounded-tile p-4",
                f.rule.severity === "high" ? "bg-coral-soft" : f.rule.severity === "medium" ? "bg-gold-soft" : "bg-lavender-soft",
              )}
            >
              <div className="flex items-start gap-3">
                {f.rule.severity === "high" ? (
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-coral-ink" aria-hidden />
                ) : (
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-label-2" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-headline font-semibold">{f.rule.title}</p>
                  <p className="mt-1 text-subhead text-label-2">{f.rule.explain}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {f.matches.slice(0, 3).map((m, i) => (
                      <span key={i} className="max-w-full truncate rounded-full bg-surface px-2.5 py-0.5 text-footnote font-medium">
                        “{m.text.trim()}”
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.positives.length > 0 && (
        <ul className="flex flex-col gap-2.5" aria-label="Good signs">
          {result.positives.map((f) => (
            <li key={f.rule.id} className="flex items-start gap-3 rounded-tile bg-green-soft p-4">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-ink" aria-hidden />
              <div>
                <p className="text-headline font-semibold">{f.rule.title}</p>
                <p className="mt-1 text-subhead text-label-2">{f.rule.explain}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.level !== "low" && (
        <Button variant="destructive" onClick={onReport} icon={<Flag className="size-5" aria-hidden />} block>
          Report this to warn others
        </Button>
      )}
    </div>
  );
}

/** Half-circle risk gauge: green → gold → coral, with a needle at the score. */
function Gauge({ score }: { score: number }) {
  const id = useId();
  const angle = 180 - Math.max(0, Math.min(100, score)) * 1.8;
  const rad = (angle * Math.PI) / 180;
  const cx = 110;
  const cy = 104;
  const r = 84;
  const arc = (from: number, to: number) => {
    const a = (Math.PI * (180 - from * 1.8)) / 180;
    const b = (Math.PI * (180 - to * 1.8)) / 180;
    return `M${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(b)} ${cy - r * Math.sin(b)}`;
  };
  return (
    <svg viewBox="0 0 220 120" className="w-56 max-w-full" role="img" aria-labelledby={id}>
      <title id={id}>Risk score {score} out of 100</title>
      <path d={arc(0, 19.5)} stroke="var(--green)" strokeWidth="18" fill="none" strokeLinecap="round" />
      <path d={arc(21, 49)} stroke="var(--gold)" strokeWidth="18" fill="none" />
      <path d={arc(51, 100)} stroke="var(--coral)" strokeWidth="18" fill="none" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + (r - 22) * Math.cos(rad)} y2={cy - (r - 22) * Math.sin(rad)} stroke="var(--label)" strokeWidth="6" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="10" fill="var(--label)" />
      <text x={cx} y={cy - 26} textAnchor="middle" className="fill-label text-[22px] font-bold tabular">
        {score}
      </text>
    </svg>
  );
}

const CHANNELS = ["WhatsApp", "Facebook", "Email", "Phone call", "TikTok or Instagram", "In person", "Website", "Other"];

function ReportSheet({ open, onClose, initialSummary }: { open: boolean; onClose: () => void; initialSummary: string }) {
  const addReport = useApp((s) => s.addReport);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [summary, setSummary] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const report = { channel, summary: (summary || initialSummary).trim(), amountLkr: Number(amount.replace(/[^\d]/g, "")) || 0 };
    const res = await submitScamReport(report);
    setBusy(false);
    if (!res.ok) {
      toast(`Couldn't send: ${res.message}`, "warn");
      return;
    }
    addReport(report);
    toast(res.remote ? "Report sent for review" : "Report saved on this device");
    setSummary("");
    setAmount("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report a scam"
      description="Reports are reviewed before they appear in Community alerts. Remove names and phone numbers of private people."
      footer={
        <Button block onClick={submit} disabled={busy} icon={<Flag className="size-5" aria-hidden />}>
          {busy ? "Sending…" : "Send report"}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Select label="Where did it reach you?" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <TextArea label="What happened?" value={summary || initialSummary} onChange={(e) => setSummary(e.target.value.slice(0, 600))} rows={5} />
        <TextField
          label="Amount they asked for, in rupees (optional)"
          inputMode="numeric"
          placeholder="e.g. 450000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <a
          href={SOURCES.netsafe.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 text-subhead font-semibold text-teal-ink"
        >
          Lost money? Also report it to Netsafe and the police
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </form>
    </Sheet>
  );
}
