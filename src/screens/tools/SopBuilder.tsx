import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Copy, Sparkles, Wand2 } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { Card, SectionHeader } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Controls";
import { toast, undoToast } from "@/components/ui/Toast";
import { SignInSheet } from "@/components/SignInSheet";
import { aiErrorToast } from "@/components/UpgradeSheet";
import { writeSop } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { useAuth } from "@/lib/sync";
import { readJson, writeJson } from "@/lib/storage";
import { copyText } from "@/lib/platform";
import { checkSop, draftSop, EMPTY_SOP, type SopInput } from "@/logic/sop";

const KEY = "kp-sop-v1";

const FIELDS: { key: keyof SopInput; label: string; hint: string; long?: boolean }[] = [
  { key: "programme", label: "Programme", hint: "e.g. Master of Data Science" },
  { key: "university", label: "University", hint: "e.g. University of Canterbury" },
  { key: "degree", label: "Your degree", hint: "Degree, university, year and result" },
  { key: "achievements", label: "Academic highlights", hint: "Projects, awards, relevant subjects", long: true },
  { key: "experience", label: "Work experience", hint: "Role, employer, years, and one result with a number", long: true },
  { key: "whyProgramme", label: "Why this programme", hint: "Name specific courses, research or projects", long: true },
  { key: "whyNz", label: "Why New Zealand", hint: "Why here rather than Sri Lanka or another country", long: true },
  { key: "careerGoal", label: "Career goal", hint: "The job you'll aim for after graduating", long: true },
  { key: "funding", label: "Funding", hint: "Who is paying, briefly", long: true },
];

/** Builds a structured first draft and checks it, entirely on the device. */
export function SopBuilder() {
  const [input, setInput] = useState<SopInput>(() => ({ ...EMPTY_SOP, ...(readJson<SopInput>(KEY) ?? {}) }));
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [signIn, setSignIn] = useState(false);
  const user = useAuth((s) => s.user);

  const writeWithAi = async () => {
    if (!user) return setSignIn(true);
    setAiBusy(true);
    try {
      const res = await writeSop(input);
      const before = text;
      setText(res.result.draft);
      setTips(res.result.tips);
      if (before) undoToast(`AI draft ready · ${res.remaining} AI requests left today`, () => setText(before), "info");
      else toast(`AI draft ready · ${res.remaining} AI requests left today`, "info");
    } catch (e) {
      aiErrorToast(e);
    } finally {
      setAiBusy(false);
    }
  };
  const checks = useMemo(() => (text ? checkSop(text, input) : []), [text, input]);

  const update = (key: keyof SopInput, value: string) => {
    const next = { ...input, [key]: value };
    setInput(next);
    writeJson(KEY, next);
  };

  return (
    <Page title="SOP Builder" back={{ to: "/tools", label: "Tools" }} lead="Answer the prompts, get a structured first draft, then rewrite it in your own voice. Your answers are saved on this device.">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4" aria-labelledby="sop-input">
          <SectionHeader id="sop-input" title="Your details" />
          {FIELDS.map((f) =>
            f.long ? (
              <TextArea key={f.key} label={f.label} hint={f.hint} rows={3} value={input[f.key]} onChange={(e) => update(f.key, e.target.value)} />
            ) : (
              <TextField key={f.key} label={f.label} hint={f.hint} value={input[f.key]} onChange={(e) => update(f.key, e.target.value)} />
            ),
          )}
          <Button onClick={() => setText(draftSop(input))} icon={<Wand2 className="size-5" aria-hidden />} disabled={!input.programme || !input.university}>
            Build my draft
          </Button>
          {HAS_SUPABASE && (
            <Button variant="tinted" onClick={writeWithAi} disabled={aiBusy || !input.programme || !input.university} icon={<Sparkles className="size-5" aria-hidden />}>
              {aiBusy ? "Writing… about 20 seconds" : "Write a fuller draft with AI (Main & Ultra)"}
            </Button>
          )}
          <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
        </section>

        {text && (
          <section className="flex flex-col gap-3" aria-labelledby="sop-draft">
            <SectionHeader id="sop-draft" title="Your draft" />
            <TextArea label="Edit your statement" hideLabel rows={16} value={text} onChange={(e) => setText(e.target.value)} className="bg-surface shadow-card" />
            <Card className="p-4">
              <p className="text-headline font-semibold">Checks</p>
              <ul className="mt-2 flex flex-col gap-2" aria-live="polite">
                {checks.map((c) => (
                  <li key={c.text} className="flex gap-2.5 text-subhead">
                    {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-ink" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-coral-ink" aria-hidden />}
                    {c.text}
                  </li>
                ))}
              </ul>
            </Card>
            {tips.length > 0 && (
              <Card className="bg-gold-soft p-4 text-ink">
                <p className="text-headline font-semibold">Before you submit</p>
                <ul className="mt-1 list-disc pl-5 text-subhead">
                  {tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </Card>
            )}
            <Button variant="dark" icon={<Copy className="size-5" aria-hidden />} onClick={async () => toast((await copyText(text)) ? "Copied" : "Couldn't copy", "info")}>
              Copy text
            </Button>
            <p className="px-1 text-footnote text-label-2">A draft is a starting point. Universities and Immigration NZ expect your own words, so rewrite each paragraph.</p>
          </section>
        )}
      </div>
    </Page>
  );
}
