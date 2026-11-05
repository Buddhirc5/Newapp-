import { useEffect, useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { aiErrorToast, useUpgrade } from "@/components/UpgradeSheet";
import { accessLevel, latestInsight, reviewJourney, useMember, type JourneyInsight } from "@/lib/community";
import { HAS_SUPABASE } from "@/lib/env";
import { relativeDay } from "@/lib/format";
import { useAuth } from "@/lib/sync";
import { useApp } from "@/store/app";

/** AI journey coach: the nightly review for Main and Ultra members, or one on demand. */
export function AiCoach() {
  const user = useAuth((s) => s.user);
  const profile = useMember((s) => s.profile);
  const isSample = useApp((s) => s.isSample);
  const showUpgrade = useUpgrade((s) => s.show);
  const [insight, setInsight] = useState<{ insight: JourneyInsight; created_at: string } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!HAS_SUPABASE || !user || isSample) return;
    latestInsight().then(setInsight, () => setInsight(null));
  }, [user, isSample]);

  if (!HAS_SUPABASE || !user || isSample || insight === undefined) return null;
  const hasAccess = accessLevel(profile) === "full";

  const run = async () => {
    if (!hasAccess) return showUpgrade();
    setBusy(true);
    try {
      const res = await reviewJourney();
      setInsight({ insight: res.result, created_at: new Date().toISOString() });
      toast(`Review ready · ${res.remaining} AI requests left today`, "info");
    } catch (e) {
      aiErrorToast(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ai-coach">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-teal-ink" aria-hidden />
          <h2 id="ai-coach" className="text-headline font-semibold">
            Your AI coach
          </h2>
          {insight && <span className="ml-auto text-footnote text-label-2">{relativeDay(insight.created_at)}</span>}
        </div>
        {insight ? (
          <>
            <p className="type-display text-title3 leading-snug">{insight.insight.headline}</p>
            <ol className="flex flex-col gap-2.5">
              {insight.insight.next_steps.slice(0, 3).map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-ink text-footnote font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="text-callout font-semibold">{s.title}</p>
                    <p className="text-subhead text-label-2">{s.why}</p>
                  </div>
                </li>
              ))}
            </ol>
            {insight.insight.risks.length > 0 && (
              <ul className="flex flex-col gap-1.5 rounded-tile bg-gold-soft p-4 text-ink">
                {insight.insight.risks.slice(0, 3).map((r) => (
                  <li key={r} className="flex gap-2 text-subhead">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-subhead text-label-2">{insight.insight.encouragement}</p>
          </>
        ) : (
          <p className="text-subhead text-label-2">
            Get a short review of your saved progress: what to do next, and what could slow you down. Main and Ultra members get a fresh one every night.
          </p>
        )}
        <Button variant="tinted" size="md" onClick={run} disabled={busy} icon={<Sparkles className="size-4" aria-hidden />}>
          {busy ? "Reviewing…" : insight ? "Refresh my review" : hasAccess ? "Review my journey" : "Get AI reviews with Main or Ultra"}
        </Button>
        <p className="text-footnote text-label-3">General guidance from AI, not immigration advice. Check visa rules on immigration.govt.nz.</p>
      </Card>
    </section>
  );
}
