import { useMemo, useState } from "react";
import { CircleCheck, Copy, Download, Lightbulb, MinusCircle, Plus, Printer, ScanSearch, TriangleAlert } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { Card, ProgressRing, SectionHeader } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, TextArea, TextField } from "@/components/ui/Controls";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/format";
import { CAN_PRINT, copyText, saveFile } from "@/lib/platform";
import { checkCv, cvToText, SAMPLE_SL_CV, splitLines, splitList, type CvReport } from "@/logic/cv";
import { useApp } from "@/store/app";
import type { CvDraft, CvExperience } from "@/types";

export function CvStudio() {
  const [mode, setMode] = useState<"check" | "build">("check");
  return (
    <Page
      title="CV Studio"
      back={{ to: "/tools", label: "Tools" }}
      hero={
        <div className="pb-6">
          <section className="relative overflow-hidden rounded-[2rem] bg-pink p-5 text-ink sm:p-6">
            <div className="topo-fill pointer-events-none absolute inset-0 text-ink/[0.07]" aria-hidden />
            <Mascot mood="smile" tint="malibu" className="pointer-events-none absolute -right-3 -bottom-5 w-28 sm:w-32" />
            <div className="relative max-w-[72%]">
              <h1 className="type-display text-title1 leading-tight">CV Studio</h1>
              <p className="mt-2 text-callout opacity-85">
                NZ employers expect a different CV from Sri Lankan ones. Check yours, then build a clean NZ-style version.
              </p>
            </div>
          </section>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <SegmentedControl
          label="CV Studio mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "check", label: "Check my CV" },
            { value: "build", label: "Build NZ CV" },
          ]}
        />
        {mode === "check" ? <Checker /> : <Builder />}
      </div>
    </Page>
  );
}

function Checker() {
  const markCvChecked = useApp((s) => s.markCvChecked);
  const [text, setText] = useState("");
  const [report, setReport] = useState<CvReport | null>(null);
  const run = (value = text) => {
    const r = checkCv(value);
    setReport(r);
    markCvChecked();
  };
  return (
    <div className="flex flex-col gap-4">
      <TextArea
        label="Paste your CV text"
        hint="Copy the text out of your Word or PDF CV. It's checked on this device only."
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="bg-surface shadow-card"
      />
      <div className="flex flex-wrap gap-2.5">
        <Button onClick={() => run()} disabled={!text.trim()} icon={<ScanSearch className="size-5" aria-hidden />}>
          Check CV
        </Button>
        <Button
          variant="tinted"
          onClick={() => {
            setText(SAMPLE_SL_CV);
            run(SAMPLE_SL_CV);
          }}
        >
          Try a sample CV
        </Button>
      </div>
      <div aria-live="polite">{report && <Report report={report} />}</div>
    </div>
  );
}

function Report({ report }: { report: CvReport }) {
  const groups = [
    { kind: "remove" as const, title: "Remove", icon: MinusCircle, cls: "bg-coral-soft", iconCls: "text-coral-ink" },
    { kind: "improve" as const, title: "Improve", icon: TriangleAlert, cls: "bg-gold-soft", iconCls: "text-label-2" },
    { kind: "good" as const, title: "Working well", icon: CircleCheck, cls: "bg-green-soft", iconCls: "text-green-ink" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-5 p-5">
        <ProgressRing
          value={report.score / 100}
          size={84}
          stroke={9}
          barClass={report.score >= 80 ? "text-teal" : report.score >= 50 ? "text-gold" : "text-coral"}
        >
          <span className="text-title2 font-bold tabular">{report.score}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="type-display text-title3">
            {report.score >= 80 ? "Nearly NZ-ready" : report.score >= 50 ? "A few fixes needed" : "Needs NZ formatting"}
          </p>
          <p className="mt-1 text-subhead text-label-2 tabular">
            {report.stats.words} words · about {report.stats.estPages} page{report.stats.estPages === 1 ? "" : "s"} · {report.stats.actionVerbs} action verbs
          </p>
        </div>
      </Card>
      {groups.map((g) => {
        const items = report.issues.filter((i) => i.kind === g.kind);
        if (!items.length) return null;
        return (
          <section key={g.kind} className="flex flex-col gap-2" aria-label={g.title}>
            <h3 className="px-1 text-footnote font-semibold tracking-wide text-label-2 uppercase">
              {g.title} · {items.length}
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((issue) => (
                <li key={issue.id} className={cn("flex gap-3 rounded-tile p-4", g.cls)}>
                  <g.icon className={cn("mt-0.5 size-5 shrink-0", g.iconCls)} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-headline font-semibold">{issue.title}</p>
                    <p className="mt-1 text-subhead text-label-2">{issue.detail}</p>
                    {issue.examples.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {issue.examples.map((ex) => (
                          <span key={ex} className="max-w-full truncate rounded-full bg-surface px-2.5 py-0.5 text-footnote font-medium">
                            “{ex}”
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const RIGHTS = ["Requires AEWV sponsorship", "Eligible for a post-study work visa", "Holds an open work visa", "NZ resident"];

function Builder() {
  const cv = useApp((s) => s.cv);
  const setCv = useApp((s) => s.setCv);
  const toggleTask = useApp((s) => s.toggleTask);
  const text = useMemo(() => cvToText(cv), [cv]);

  const updateJob = (id: string, patch: Partial<CvExperience>) => setCv({ experience: cv.experience.map((j) => (j.id === id ? { ...j, ...patch } : j)) });
  const exported = () => toggleTask("common.cv", true);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4" aria-labelledby="cv-contact">
        <SectionHeader id="cv-contact" title="Contact" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" autoComplete="name" value={cv.fullName} onChange={(e) => setCv({ fullName: e.target.value })} />
          <TextField
            label="Headline"
            placeholder="e.g. Chartered Accountant | IFRS | ERP"
            value={cv.headline}
            onChange={(e) => setCv({ headline: e.target.value })}
          />
          <TextField
            label="Location"
            placeholder="Colombo, Sri Lanka (relocating to Auckland)"
            value={cv.location}
            onChange={(e) => setCv({ location: e.target.value })}
          />
          <TextField label="Email" type="email" autoComplete="email" value={cv.email} onChange={(e) => setCv({ email: e.target.value })} />
          <TextField label="Phone" type="tel" autoComplete="tel" placeholder="+94 77 …" value={cv.phone} onChange={(e) => setCv({ phone: e.target.value })} />
          <TextField label="LinkedIn" placeholder="linkedin.com/in/…" value={cv.linkedin} onChange={(e) => setCv({ linkedin: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <TextField
            label="Work rights"
            placeholder="What employers need to know about your visa"
            value={cv.workRights}
            onChange={(e) => setCv({ workRights: e.target.value })}
          />
          <div className="flex flex-wrap gap-2">
            {RIGHTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setCv({ workRights: r })}
                className="min-h-9 rounded-full bg-fill-2 px-3 text-footnote font-semibold hover:bg-fill-3"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-profile">
        <SectionHeader id="cv-profile" title="Profile & skills" />
        <TextArea
          label="Profile summary"
          hint="Three or four lines: who you are, years of experience, strongest skills and the NZ role you want."
          value={cv.summary}
          onChange={(e) => setCv({ summary: e.target.value })}
          rows={4}
        />
        <TextField
          label="Key skills"
          hint="Separate with commas."
          placeholder="IFRS reporting, Power BI, Team leadership"
          value={cv.skills}
          onChange={(e) => setCv({ skills: e.target.value })}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-exp">
        <SectionHeader
          id="cv-exp"
          title="Experience"
          action={
            <Button
              size="sm"
              variant="tinted"
              icon={<Plus className="size-4" aria-hidden />}
              onClick={() =>
                setCv({ experience: [...cv.experience, { id: uid("job"), role: "", company: "", location: "", start: "", end: "", bullets: "" }] })
              }
            >
              Add role
            </Button>
          }
        />
        <p className="flex gap-2 rounded-tile bg-gold-soft px-4 py-3 text-subhead">
          <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Achievement formula:</span> action verb + what you did + result. “Reduced month-end close from 8 to 5 days by
            automating reconciliations.”
          </span>
        </p>
        {cv.experience.length === 0 && <p className="px-1 text-subhead text-label-2">Add your most recent role first.</p>}
        {cv.experience.map((job, i) => (
          <Card key={job.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-headline font-semibold">Role {i + 1}</p>
              <Button size="sm" variant="plain" className="text-coral-ink" onClick={() => setCv({ experience: cv.experience.filter((j) => j.id !== job.id) })}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Job title" value={job.role} onChange={(e) => updateJob(job.id, { role: e.target.value })} />
              <TextField label="Employer" value={job.company} onChange={(e) => updateJob(job.id, { company: e.target.value })} />
              <TextField label="Location" value={job.location} onChange={(e) => updateJob(job.id, { location: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Start" placeholder="Mar 2021" value={job.start} onChange={(e) => updateJob(job.id, { start: e.target.value })} />
                <TextField label="End" placeholder="Present" value={job.end} onChange={(e) => updateJob(job.id, { end: e.target.value })} />
              </div>
            </div>
            <TextArea label="Achievements (one per line)" rows={4} value={job.bullets} onChange={(e) => updateJob(job.id, { bullets: e.target.value })} />
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-edu">
        <SectionHeader id="cv-edu" title="Education & certifications" />
        <TextArea
          label="Education (one per line)"
          placeholder="BSc (Hons) Accounting, University of Sri Jayewardenepura, 2016"
          rows={3}
          value={cv.education}
          onChange={(e) => setCv({ education: e.target.value })}
        />
        <TextArea
          label="Certifications (one per line)"
          placeholder="CIMA Passed Finalist, 2019"
          rows={2}
          value={cv.certifications}
          onChange={(e) => setCv({ certifications: e.target.value })}
        />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="cv-preview">
        <SectionHeader id="cv-preview" title="Preview" />
        <CvPreview cv={cv} />
        <div className="no-print grid gap-2.5 sm:grid-cols-3">
          <Button
            variant="dark"
            icon={<Copy className="size-5" aria-hidden />}
            onClick={async () => {
              const ok = await copyText(text);
              toast(ok ? "CV copied as plain text" : "Couldn't copy. Select the preview text instead.", ok ? "good" : "warn");
              if (ok) exported();
            }}
          >
            Copy text
          </Button>
          <Button
            variant="tinted"
            icon={<Download className="size-5" aria-hidden />}
            onClick={async () => {
              const outcome = await saveFile(`${(cv.fullName || "cv").replace(/\s+/g, "-").toLowerCase()}-nz-cv.txt`, text);
              if (outcome === "saved") {
                toast("CV file saved");
                exported();
              } else if (outcome === "unavailable") toast("Saving files isn't available here. Use Copy text.", "warn");
            }}
          >
            Save as file
          </Button>
          {CAN_PRINT && (
            <Button
              variant="tinted"
              icon={<Printer className="size-5" aria-hidden />}
              onClick={() => {
                exported();
                window.print();
              }}
            >
              Print or PDF
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

/** Paper-style preview in the NZ CV layout. Always light, like the printed page. */
function CvPreview({ cv }: { cv: CvDraft }) {
  const contact = [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean);
  return (
    <article className="cv-print rounded-tile bg-white p-6 text-[#1b1a14] shadow-card ring-1 ring-black/5 sm:p-8" aria-label="CV preview">
      <header className="border-b border-black/10 pb-4">
        <h2 className="text-title1 font-bold tracking-tight">{cv.fullName || "Your Name"}</h2>
        {cv.headline && <p className="mt-1 text-callout font-semibold text-[#00765f]">{cv.headline}</p>}
        {contact.length > 0 && <p className="mt-2 text-footnote text-black/60">{contact.join("  ·  ")}</p>}
        {cv.workRights && <p className="mt-1 text-footnote font-semibold text-black/80">Work rights: {cv.workRights}</p>}
      </header>
      {cv.summary && <CvBlock title="Profile">{<p className="text-subhead leading-relaxed">{cv.summary}</p>}</CvBlock>}
      {cv.skills && (
        <CvBlock title="Key skills">
          <ul className="flex flex-wrap gap-1.5">
            {splitList(cv.skills).map((s) => (
              <li key={s} className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-footnote">
                {s}
              </li>
            ))}
          </ul>
        </CvBlock>
      )}
      {cv.experience.length > 0 && (
        <CvBlock title="Experience">
          <div className="flex flex-col gap-4">
            {cv.experience.map((job) => (
              <div key={job.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-subhead font-bold">
                    {job.role || "Job title"}
                    {job.company && <span className="font-normal">, {job.company}</span>}
                  </p>
                  <p className="text-footnote text-black/55 tabular">{[job.start, job.end].filter(Boolean).join(" – ")}</p>
                </div>
                {job.location && <p className="text-footnote text-black/55">{job.location}</p>}
                <ul className="mt-1.5 list-disc pl-5 text-subhead leading-relaxed">
                  {splitLines(job.bullets).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CvBlock>
      )}
      {cv.education && (
        <CvBlock title="Education">
          <ul className="text-subhead leading-relaxed">
            {splitLines(cv.education).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </CvBlock>
      )}
      {cv.certifications && (
        <CvBlock title="Certifications">
          <ul className="text-subhead leading-relaxed">
            {splitLines(cv.certifications).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </CvBlock>
      )}
      <CvBlock title="Referees">
        <p className="text-subhead">Available on request</p>
      </CvBlock>
    </article>
  );
}

function CvBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-caption font-bold tracking-[0.12em] text-[#00765f] uppercase">{title}</h3>
      {children}
    </section>
  );
}
