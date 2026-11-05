import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  Copy,
  FileDown,
  FilePen,
  FileUp,
  FolderOpen,
  Lightbulb,
  MinusCircle,
  Plus,
  Printer,
  Save,
  ScanSearch,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { Card, Notice, ProgressRing, SectionHeader } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, Switch, TextArea, TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast, undoToast } from "@/components/ui/Toast";
import { OCCUPATIONS } from "@/data/occupations";
import { CITY_BY_ID } from "@/data/places";
import { cn } from "@/lib/cn";
import { aiChecksEnabled, analyzeDocument, useMember, type DocReview } from "@/lib/community";
import { readCvFile, CvFileError, type CvFile } from "@/lib/cvFile";
import { cvFileName, cvPdf } from "@/lib/cvPdf";
import { HAS_SUPABASE } from "@/lib/env";
import { relativeDay, uid } from "@/lib/format";
import { CAN_PRINT, copyText, saveFile } from "@/lib/platform";
import { useAuth } from "@/lib/sync";
import { checkCv, cvToText, EMPTY_CV, guessContact, refereeLines, SAMPLE_SL_CV, splitLines, splitList, type CvReport } from "@/logic/cv";
import { ReviewCard } from "@/screens/tools/DocCheck";
import { useApp } from "@/store/app";
import type { CvDraft, CvExperience, CvReferee } from "@/types";

type Mode = "check" | "build";

export function CvStudio() {
  const [mode, setMode] = useState<Mode>("check");
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
                Upload your CV to see what NZ employers will notice, then build a clean NZ-standard CV and download it as a PDF.
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
        {mode === "check" ? <Checker onBuild={() => setMode("build")} /> : <Builder />}
      </div>
    </Page>
  );
}

// ── Check ────────────────────────────────────────────────────────────────

function Checker({ onBuild }: { onBuild: () => void }) {
  const markCvChecked = useApp((s) => s.markCvChecked);
  const cv = useApp((s) => s.cv);
  const replaceCv = useApp((s) => s.replaceCv);
  const user = useAuth((s) => s.user);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Omit<CvFile, "text"> | null>(null);
  const [reading, setReading] = useState(false);
  const [report, setReport] = useState<CvReport | null>(null);
  const [pasting, setPasting] = useState(false);
  const [ai, setAi] = useState<{ enabled: boolean; busy: boolean; result: DocReview | null }>({ enabled: false, busy: false, result: null });
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (HAS_SUPABASE && user) aiChecksEnabled().then((enabled) => setAi((a) => ({ ...a, enabled })), () => undefined);
  }, [user]);

  const run = (value: string, m: Omit<CvFile, "text"> | null = meta) => {
    setReport(checkCv(value, { hasPhoto: m?.hasPhoto, pages: m?.pages }));
    markCvChecked();
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setReading(true);
    setReport(null);
    setAi((a) => ({ ...a, result: null }));
    try {
      const out = await readCvFile(f);
      setFile(f);
      setText(out.text);
      setMeta({ pages: out.pages, hasPhoto: out.hasPhoto });
      run(out.text, out);
    } catch (e) {
      setFile(null);
      toast(e instanceof CvFileError ? e.message : "That file couldn't be read. Try a PDF or .docx.", "warn");
    } finally {
      setReading(false);
    }
  };

  const startFromThis = () => {
    const before = cv;
    const found = guessContact(text);
    const patch = Object.fromEntries(Object.entries(found).filter(([k]) => !String(cv[k as keyof CvDraft] ?? "").trim())) as Partial<CvDraft>;
    replaceCv({ ...cv, ...patch });
    onBuild();
    const n = Object.keys(patch).length;
    undoToast(n ? `Copied ${n} contact detail${n === 1 ? "" : "s"} into your NZ CV` : "Your NZ CV already has these details", () => replaceCv(before), n ? "good" : "info");
  };

  return (
    <div className="flex flex-col gap-4">
      <label
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-fill-3 bg-surface p-6 text-center transition-colors hover:bg-surface-2",
          reading && "pointer-events-none opacity-70",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFile(e.dataTransfer.files?.[0]);
        }}
      >
        <FileUp className="size-8 text-teal-ink" aria-hidden />
        <span className="text-headline font-semibold">{reading ? "Reading your CV…" : file ? file.name : "Upload your CV"}</span>
        <span className="text-footnote text-label-2">PDF or Word (.docx), up to 10 MB. It's read on this device and isn't uploaded.</span>
        {file && meta && (
          <span className="mt-1 text-footnote font-semibold text-label-2">
            {meta.pages ? `${meta.pages} page${meta.pages === 1 ? "" : "s"} · ` : ""}
            {text.split(/\s+/).filter(Boolean).length} words · tap to choose another file
          </span>
        )}
        <input
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="tinted" size="md" onClick={() => setPasting((p) => !p)}>
          {pasting ? "Hide text box" : "Paste text instead"}
        </Button>
        <Button
          variant="plain"
          size="md"
          onClick={() => {
            setFile(null);
            setMeta(null);
            setText(SAMPLE_SL_CV);
            setPasting(true);
            run(SAMPLE_SL_CV, null);
          }}
        >
          Try a sample Sri Lankan CV
        </Button>
      </div>

      {pasting && (
        <div className="flex flex-col gap-3">
          <TextArea label="CV text" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="bg-surface shadow-card" />
          <Button onClick={() => run(text)} disabled={!text.trim()} icon={<ScanSearch className="size-5" aria-hidden />}>
            Check CV
          </Button>
        </div>
      )}

      <div ref={resultRef} aria-live="polite" className="scroll-mt-4">
        {report && (
          <div className="flex flex-col gap-4">
            <Report report={report} />
            <Card className="flex flex-col gap-3 p-5">
              <p className="text-headline font-semibold">Fix it the quick way</p>
              <p className="text-subhead text-label-2">Start an NZ-format CV with your contact details filled in, then add your experience in the builder.</p>
              <Button onClick={startFromThis} icon={<FilePen className="size-5" aria-hidden />}>
                Build my NZ CV from this
              </Button>
              {file && ai.enabled && /\.pdf$/i.test(file.name) && (
                <Button
                  variant="tinted"
                  disabled={ai.busy}
                  icon={<Sparkles className="size-5" aria-hidden />}
                  onClick={async () => {
                    setAi((a) => ({ ...a, busy: true }));
                    try {
                      const res = await analyzeDocument(file, "cv");
                      setAi((a) => ({ ...a, result: res.result }));
                    } catch (e) {
                      toast((e as Error).message, "warn");
                    } finally {
                      setAi((a) => ({ ...a, busy: false }));
                    }
                  }}
                >
                  {ai.busy ? "Reviewing… up to a minute" : "Get a detailed AI review"}
                </Button>
              )}
            </Card>
            {ai.result && <ReviewCard review={ai.result} />}
          </div>
        )}
      </div>
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
        <ProgressRing value={report.score / 100} size={84} stroke={9} barClass={report.score >= 80 ? "text-teal" : report.score >= 50 ? "text-gold" : "text-coral"}>
          <span className="text-title2 font-bold tabular">{report.score}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="type-display text-title3">{report.score >= 80 ? "Nearly NZ-ready" : report.score >= 50 ? "A few fixes needed" : "Needs NZ formatting"}</p>
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

// ── Build ────────────────────────────────────────────────────────────────

const RIGHTS = [
  "Requires AEWV sponsorship",
  "Eligible for a post-study work visa",
  "Holds an open work visa",
  "Holds a partner of a worker visa",
  "NZ resident",
  "NZ citizen",
];

const emptyRef = (): CvReferee => ({ id: uid("ref"), name: "", title: "", company: "", phone: "", email: "", relationship: "" });

/** Details we already know from the account and onboarding answers. */
function useAccountDetails(): Partial<CvDraft> {
  const user = useAuth((s) => s.user);
  const member = useMember((s) => s.profile);
  const profile = useApp((s) => s.profile);
  const isSample = useApp((s) => s.isSample);
  return useMemo(() => {
    const out: Partial<CvDraft> = {};
    const name = user?.name || member?.display_name || (isSample ? "" : profile.name);
    if (name) out.fullName = name;
    if (user?.email) out.email = user.email;
    if (user?.phone) out.phone = user.phone.startsWith("+") ? user.phone : `+${user.phone}`;
    const occupation = OCCUPATIONS.find((o) => o.id === profile.occupationId)?.title ?? profile.occupationOther;
    if (occupation && !isSample) out.headline = occupation;
    const nzCity = CITY_BY_ID[profile.city]?.name;
    if (member?.situation === "in_nz") out.location = member.city ? `${member.city}, New Zealand` : "New Zealand";
    else if (member || !isSample) out.location = nzCity ? `Sri Lanka (relocating to ${nzCity})` : "Sri Lanka";
    if (member?.bio && member.bio.length > 40) out.summary = member.bio;
    return out;
  }, [user, member, profile, isSample]);
}

function Builder() {
  const cv = useApp((s) => s.cv);
  const setCv = useApp((s) => s.setCv);
  const replaceCv = useApp((s) => s.replaceCv);
  const toggleTask = useApp((s) => s.toggleTask);
  const account = useAccountDetails();
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [busyPdf, setBusyPdf] = useState<false | "final" | "draft">(false);
  const text = useMemo(() => cvToText(cv), [cv]);
  const live = useMemo(() => checkCv(text), [text]);
  const refs = cv.referees ?? [];
  const onRequest = cv.refereesOnRequest ?? true;

  const fillable = Object.entries(account).filter(([k, v]) => v && !String(cv[k as keyof CvDraft] ?? "").trim()) as [keyof CvDraft, string][];
  const fillFromAccount = (silent = false) => {
    if (!fillable.length) {
      if (!silent) toast("Everything from your account is already filled in", "info");
      return;
    }
    const before = cv;
    replaceCv({ ...cv, ...Object.fromEntries(fillable) });
    undoToast(`Filled ${fillable.length} detail${fillable.length === 1 ? "" : "s"} from your account`, () => replaceCv(before));
  };

  // First visit with an empty CV: fill what we know, with Undo.
  const autoFilled = useRef(false);
  useEffect(() => {
    if (autoFilled.current) return;
    autoFilled.current = true;
    if (!cv.fullName && !cv.email && !cv.experience.length) fillFromAccount(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateJob = (id: string, patch: Partial<CvExperience>) => setCv({ experience: cv.experience.map((j) => (j.id === id ? { ...j, ...patch } : j)) });
  const moveJob = (i: number, dir: -1 | 1) => {
    const list = [...cv.experience];
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    setCv({ experience: list });
  };
  const removeJob = (job: CvExperience) => {
    const before = cv.experience;
    setCv({ experience: before.filter((j) => j.id !== job.id) });
    undoToast(`Removed ${job.role || "role"}`, () => setCv({ experience: before }), "info");
  };
  const updateRef = (id: string, patch: Partial<CvReferee>) => setCv({ referees: refs.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const exported = () => toggleTask("common.cv", true);

  const downloadPdf = async (draft: boolean) => {
    setBusyPdf(draft ? "draft" : "final");
    try {
      const blob = await cvPdf(cv, { draft });
      const outcome = await saveFile(cvFileName(cv, "pdf", draft), blob, "application/pdf");
      if (outcome === "saved") {
        toast(draft ? "Draft PDF downloaded" : "CV PDF downloaded");
        if (!draft) exported();
      } else if (outcome === "unavailable") toast("Downloads aren't available here. Use Copy text.", "warn");
    } catch {
      toast("The PDF couldn't be made. Try again.", "warn");
    } finally {
      setBusyPdf(false);
    }
  };

  const todo = live.issues.filter((i) => i.kind !== "good" && i.id !== "length");

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={live.score / 100} size={60} stroke={7} barClass={live.score >= 80 ? "text-teal" : live.score >= 50 ? "text-gold" : "text-coral"}>
            <span className="text-headline font-bold tabular">{live.score}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-headline font-semibold">NZ readiness</p>
            <p className="text-footnote text-label-2">Saved on this device as you type.</p>
          </div>
        </div>
        {todo.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {todo.slice(0, 3).map((i) => (
              <li key={i.id} className="flex gap-2 text-subhead">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>{i.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button size="sm" variant="tinted" icon={<UserRoundCheck className="size-4" aria-hidden />} onClick={() => fillFromAccount()}>
            Fill from account
          </Button>
          <Button size="sm" variant="tinted" icon={<Save className="size-4" aria-hidden />} onClick={() => setSaveOpen(true)}>
            Save draft
          </Button>
          <Button size="sm" variant="tinted" className="col-span-2 sm:col-span-1" icon={<FolderOpen className="size-4" aria-hidden />} onClick={() => setDraftsOpen(true)}>
            My drafts
          </Button>
        </div>
      </Card>

      <section className="flex flex-col gap-4" aria-labelledby="cv-contact">
        <SectionHeader id="cv-contact" title="Contact" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" autoComplete="name" value={cv.fullName} onChange={(e) => setCv({ fullName: e.target.value })} />
          <TextField label="Headline" placeholder="e.g. Chartered Accountant | IFRS | ERP" value={cv.headline} onChange={(e) => setCv({ headline: e.target.value })} />
          <TextField
            label="Location"
            hint="City and country only. No street address."
            placeholder="Colombo, Sri Lanka (relocating to Auckland)"
            value={cv.location}
            onChange={(e) => setCv({ location: e.target.value })}
          />
          <TextField label="Email" type="email" autoComplete="email" value={cv.email} onChange={(e) => setCv({ email: e.target.value })} />
          <TextField label="Phone" type="tel" autoComplete="tel" hint="Include the country code." placeholder="+94 77 123 4567" value={cv.phone} onChange={(e) => setCv({ phone: e.target.value })} />
          <TextField label="LinkedIn" placeholder="linkedin.com/in/…" value={cv.linkedin} onChange={(e) => setCv({ linkedin: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <TextField label="Work rights" placeholder="What employers need to know about your visa" value={cv.workRights} onChange={(e) => setCv({ workRights: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            {RIGHTS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={cv.workRights === r}
                onClick={() => {
                  const before = cv.workRights;
                  setCv({ workRights: r });
                  if (before && before !== r) undoToast("Work rights updated", () => setCv({ workRights: before }), "info");
                }}
                className={cn(
                  "min-h-9 rounded-full px-3 text-footnote font-semibold",
                  cv.workRights === r ? "bg-teal-ink text-white" : "bg-fill-2 hover:bg-fill-3",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <Notice>
          NZ CVs leave out your photo, date of birth, NIC number, religion, marital status and parents' names. Employers can't use them to decide who to hire.
        </Notice>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-profile">
        <SectionHeader id="cv-profile" title="Profile & skills" />
        <TextArea
          label="Profile summary"
          hint="Three or four lines: who you are, years of experience, strongest skills and the NZ role you want. Don't start with 'I'."
          value={cv.summary}
          onChange={(e) => setCv({ summary: e.target.value })}
          rows={4}
        />
        <TextField
          label="Key skills"
          hint="6 to 10 skills, separated with commas. Match the words in the job ad."
          placeholder="IFRS reporting, Power BI, Team leadership"
          value={cv.skills}
          onChange={(e) => setCv({ skills: e.target.value })}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-exp">
        <SectionHeader
          id="cv-exp"
          title="Work experience"
          action={
            <Button
              size="sm"
              variant="tinted"
              icon={<Plus className="size-4" aria-hidden />}
              onClick={() => setCv({ experience: [...cv.experience, { id: uid("job"), role: "", company: "", location: "", start: "", end: "", bullets: "" }] })}
            >
              Add role
            </Button>
          }
        />
        <p className="flex gap-2 rounded-tile bg-gold-soft px-4 py-3 text-subhead text-ink">
          <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Most recent first.</span> Each bullet: action verb + what you did + result. “Reduced month-end close from 8 to 5 days by
            automating reconciliations.”
          </span>
        </p>
        {cv.experience.length === 0 && <p className="px-1 text-subhead text-label-2">Add your most recent role first.</p>}
        {cv.experience.map((job, i) => (
          <Card key={job.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-headline font-semibold">Role {i + 1}</p>
              <div className="flex items-center gap-1">
                <IconBtn label="Move up" disabled={i === 0} onClick={() => moveJob(i, -1)}>
                  <ArrowUp className="size-4" aria-hidden />
                </IconBtn>
                <IconBtn label="Move down" disabled={i === cv.experience.length - 1} onClick={() => moveJob(i, 1)}>
                  <ArrowDown className="size-4" aria-hidden />
                </IconBtn>
                <IconBtn label={`Remove role ${i + 1}`} onClick={() => removeJob(job)} danger>
                  <Trash2 className="size-4" aria-hidden />
                </IconBtn>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Job title" value={job.role} onChange={(e) => updateJob(job.id, { role: e.target.value })} />
              <TextField label="Employer" value={job.company} onChange={(e) => updateJob(job.id, { company: e.target.value })} />
              <TextField label="Location" placeholder="Colombo, Sri Lanka" value={job.location} onChange={(e) => updateJob(job.id, { location: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Start" placeholder="Mar 2021" value={job.start} onChange={(e) => updateJob(job.id, { start: e.target.value })} />
                <TextField label="End" placeholder="Present" value={job.end} onChange={(e) => updateJob(job.id, { end: e.target.value })} />
              </div>
            </div>
            <TextArea label="Achievements (one per line)" hint="3 to 6 bullets, with numbers where you can." rows={4} value={job.bullets} onChange={(e) => updateJob(job.id, { bullets: e.target.value })} />
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-edu">
        <SectionHeader id="cv-edu" title="Education & certifications" />
        <TextArea
          label="Education (one per line)"
          hint="Add the NZQA level if you have an assessment, e.g. (NZQA Level 7)."
          placeholder="BSc (Hons) Accounting, University of Sri Jayewardenepura, 2016 (NZQA Level 7)"
          rows={3}
          value={cv.education}
          onChange={(e) => setCv({ education: e.target.value })}
        />
        <TextArea label="Certifications (one per line)" placeholder="CIMA Passed Finalist, 2019" rows={2} value={cv.certifications} onChange={(e) => setCv({ certifications: e.target.value })} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-extra">
        <SectionHeader id="cv-extra" title="Volunteering & interests" />
        <TextArea
          label="Volunteering (optional, one per line)"
          hint="NZ employers value community work."
          placeholder="Treasurer, Colombo Rotaract Club, 2018–2020"
          rows={2}
          value={cv.volunteering ?? ""}
          onChange={(e) => setCv({ volunteering: e.target.value })}
        />
        <TextField label="Interests (optional)" placeholder="Cricket, hiking, cooking" value={cv.interests ?? ""} onChange={(e) => setCv({ interests: e.target.value })} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="cv-refs">
        <SectionHeader id="cv-refs" title="Referees" />
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-headline font-semibold">Say “Available on request”</p>
            <p className="text-footnote text-label-2">Many NZ employers prefer two named referees, ideally recent managers.</p>
          </div>
          <Switch
            label="Referees available on request"
            checked={onRequest}
            onChange={(v) => setCv({ refereesOnRequest: v, referees: !v && refs.length === 0 ? [emptyRef(), emptyRef()] : refs })}
          />
        </Card>
        {!onRequest && (
          <>
            {refs.map((r, i) => (
              <Card key={r.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-headline font-semibold">Referee {i + 1}</p>
                  <IconBtn
                    label={`Remove referee ${i + 1}`}
                    danger
                    onClick={() => {
                      setCv({ referees: refs.filter((x) => x.id !== r.id) });
                      undoToast("Referee removed", () => setCv({ referees: refs }), "info");
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconBtn>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Name" value={r.name} onChange={(e) => updateRef(r.id, { name: e.target.value })} />
                  <TextField label="Job title" value={r.title} onChange={(e) => updateRef(r.id, { title: e.target.value })} />
                  <TextField label="Company" value={r.company} onChange={(e) => updateRef(r.id, { company: e.target.value })} />
                  <TextField label="How they know you" placeholder="Direct manager, 2021–present" value={r.relationship} onChange={(e) => updateRef(r.id, { relationship: e.target.value })} />
                  <TextField label="Phone" type="tel" value={r.phone} onChange={(e) => updateRef(r.id, { phone: e.target.value })} />
                  <TextField label="Email" type="email" value={r.email} onChange={(e) => updateRef(r.id, { email: e.target.value })} />
                </div>
              </Card>
            ))}
            {refs.length < 3 && (
              <Button variant="tinted" size="md" className="self-start" icon={<Plus className="size-4" aria-hidden />} onClick={() => setCv({ referees: [...refs, emptyRef()] })}>
                Add referee
              </Button>
            )}
            <p className="px-1 text-footnote text-label-2">Ask your referees first, and tell them which jobs you're applying for.</p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="cv-preview">
        <SectionHeader id="cv-preview" title="Preview" />
        <CvPreview cv={cv} />
        <div className="no-print grid gap-2.5 sm:grid-cols-2">
          <Button icon={<FileDown className="size-5" aria-hidden />} disabled={!!busyPdf} onClick={() => downloadPdf(false)}>
            {busyPdf === "final" ? "Making PDF…" : "Download PDF"}
          </Button>
          <Button variant="tinted" icon={<FilePen className="size-5" aria-hidden />} disabled={!!busyPdf} onClick={() => downloadPdf(true)}>
            {busyPdf === "draft" ? "Making PDF…" : "Draft PDF (watermarked)"}
          </Button>
          <Button
            variant="tinted"
            icon={<Copy className="size-5" aria-hidden />}
            onClick={async () => {
              const ok = await copyText(text);
              toast(ok ? "CV copied as plain text" : "Couldn't copy. Select the preview text instead.", ok ? "good" : "warn");
              if (ok) exported();
            }}
          >
            Copy text for job sites
          </Button>
          {CAN_PRINT && (
            <Button variant="tinted" icon={<Printer className="size-5" aria-hidden />} onClick={() => window.print()}>
              Print
            </Button>
          )}
        </div>
        <p className="px-1 text-footnote text-label-2">The PDF is a text PDF, so recruitment systems can read it. Keep it to two or three pages.</p>
      </section>

      <SaveDraftSheet open={saveOpen} onClose={() => setSaveOpen(false)} suggested={cv.headline || cv.fullName || "My CV"} />
      <DraftsSheet open={draftsOpen} onClose={() => setDraftsOpen(false)} />
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("grid size-11 place-items-center rounded-full hover:bg-fill disabled:opacity-30", danger ? "text-coral-ink" : "text-label-2")}
    >
      {children}
    </button>
  );
}

function SaveDraftSheet({ open, onClose, suggested }: { open: boolean; onClose: () => void; suggested: string }) {
  const save = useApp((s) => s.saveCvDraft);
  const drafts = useApp((s) => s.cvDrafts);
  const restore = useApp((s) => s.restoreCvDrafts);
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName(suggested.slice(0, 60));
  }, [open, suggested]);
  const replaces = drafts.some((d) => d.name.toLowerCase() === name.trim().toLowerCase());
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save draft"
      description="Keep a version for each kind of job, e.g. “Accountant – Auckland”."
      footer={
        <Button
          block
          disabled={!name.trim()}
          onClick={() => {
            const before = drafts;
            save(name);
            onClose();
            undoToast(replaces ? "Draft updated" : "Draft saved", () => restore(before));
          }}
        >
          {replaces ? "Replace draft" : "Save draft"}
        </Button>
      }
    >
      <TextField label="Draft name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
    </Sheet>
  );
}

function DraftsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const drafts = useApp((s) => s.cvDrafts);
  const cv = useApp((s) => s.cv);
  const replaceCv = useApp((s) => s.replaceCv);
  const remove = useApp((s) => s.deleteCvDraft);
  const restore = useApp((s) => s.restoreCvDrafts);
  return (
    <Sheet open={open} onClose={onClose} title="My drafts" description="Open a saved version, or start fresh.">
      <div className="flex flex-col gap-3">
        {drafts.length === 0 && <p className="py-4 text-center text-subhead text-label-2">No saved drafts yet. Use Save draft to keep a version.</p>}
        {drafts.map((d) => (
          <Card key={d.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-headline font-semibold">{d.name}</p>
              <p className="text-footnote text-label-2">
                Saved {relativeDay(d.savedAt)} · {d.cv.experience.length} role{d.cv.experience.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const before = cv;
                replaceCv(d.cv);
                onClose();
                undoToast(`Opened “${d.name}”`, () => replaceCv(before));
              }}
            >
              Open
            </Button>
            <button
              type="button"
              aria-label={`Delete ${d.name}`}
              className="grid size-11 place-items-center rounded-full text-coral-ink hover:bg-fill"
              onClick={() => {
                const before = drafts;
                remove(d.id);
                undoToast(`Deleted “${d.name}”`, () => restore(before), "info");
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </Card>
        ))}
        <Button
          variant="tinted"
          onClick={() => {
            const before = cv;
            replaceCv({ ...EMPTY_CV, referees: [] });
            onClose();
            undoToast("Started a blank CV", () => replaceCv(before), "info");
          }}
        >
          Start a blank CV
        </Button>
      </div>
    </Sheet>
  );
}

/** Paper-style preview in the NZ CV layout. Always light, like the printed page. */
function CvPreview({ cv }: { cv: CvDraft }) {
  const contact = [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean);
  const refs = refereeLines(cv);
  return (
    <article className="cv-print rounded-tile bg-white p-6 text-[#1b1a14] shadow-card ring-1 ring-black/5 sm:p-8" aria-label="CV preview">
      <header className="pb-1">
        <h2 className="text-title1 font-bold tracking-tight">{cv.fullName || "Your Name"}</h2>
        {cv.headline && <p className="mt-1 text-callout font-semibold text-[#00765f]">{cv.headline}</p>}
        {contact.length > 0 && <p className="mt-2 text-footnote break-words text-black/60">{contact.join("  |  ")}</p>}
        {cv.workRights && <p className="mt-1 text-footnote font-semibold text-black/80">Work rights: {cv.workRights}</p>}
      </header>
      {cv.summary && <CvBlock title="Profile">{<p className="text-subhead leading-relaxed">{cv.summary}</p>}</CvBlock>}
      {cv.skills && (
        <CvBlock title="Key skills">
          <ul className="grid list-disc gap-x-6 pl-5 text-subhead sm:grid-cols-2">
            {splitList(cv.skills).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </CvBlock>
      )}
      {cv.experience.length > 0 && (
        <CvBlock title="Work experience">
          <div className="flex flex-col gap-4">
            {cv.experience.map((job) => (
              <div key={job.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-subhead font-bold">{job.role || "Job title"}</p>
                  <p className="text-footnote text-black/55 tabular">{[job.start, job.end].filter(Boolean).join(" – ")}</p>
                </div>
                {(job.company || job.location) && <p className="text-footnote text-black/55">{[job.company, job.location].filter(Boolean).join(", ")}</p>}
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
      {cv.education && <CvLines title="Education" value={cv.education} />}
      {cv.certifications && <CvLines title="Certifications" value={cv.certifications} />}
      {cv.volunteering && <CvLines title="Volunteering" value={cv.volunteering} />}
      {cv.interests && (
        <CvBlock title="Interests">
          <p className="text-subhead">{cv.interests}</p>
        </CvBlock>
      )}
      <CvBlock title="Referees">
        <div className="text-subhead leading-relaxed">
          {refs.map((l, i) => (l ? <p key={i} className={cn((i === 0 || refs[i - 1] === "") && l !== "Available on request" && "font-semibold")}>{l}</p> : <div key={i} className="h-2" />))}
        </div>
      </CvBlock>
    </article>
  );
}

function CvLines({ title, value }: { title: string; value: string }) {
  return (
    <CvBlock title={title}>
      <ul className="text-subhead leading-relaxed">
        {splitLines(value).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </CvBlock>
  );
}

function CvBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 border-b border-black/10 pb-1 text-caption font-bold tracking-[0.12em] text-[#00765f] uppercase">{title}</h3>
      {children}
    </section>
  );
}
