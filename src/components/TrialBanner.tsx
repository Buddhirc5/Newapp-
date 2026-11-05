import { useState } from "react";
import { Clock, X } from "lucide-react";
import { useUpgrade } from "@/components/UpgradeSheet";
import { trialDaysLeft, useMember } from "@/lib/community";
import { todayKey } from "@/lib/format";

const KEY = "kp-trial-banner";

/** Reminds members 3 days before their free month ends, and once it has ended. Dismissed for a day at a time. */
export function TrialBanner() {
  const profile = useMember((s) => s.profile);
  const show = useUpgrade((s) => s.show);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === todayKey();
    } catch {
      return false;
    }
  });
  if (!profile || hidden) return null;
  const left = trialDaysLeft(profile);
  const endedRecently = profile.plan === "trial" && left === 0 && Date.now() - new Date(profile.trial_ends_at).getTime() < 14 * 86_400_000;
  if (!(profile.plan === "trial" && ((left > 0 && left <= 3) || endedRecently))) return null;

  const text =
    left === 0
      ? "Your free month has ended. AI checks, CV polish and the assistant are paused."
      : `Your free month ends in ${left} ${left === 1 ? "day" : "days"}. Keep AI checks, CV polish and the assistant with Main.`;

  return (
    <div className="gutter-x pt-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-tile bg-gold py-2.5 pr-2 pl-4 text-ink shadow-card lg:max-w-5xl" role="status">
        <Clock className="size-5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 text-subhead font-medium">{text}</p>
        <button type="button" onClick={() => show(left === 0 ? "Your free month has ended." : `Your free month ends in ${left} days.`)} className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-night px-4 text-subhead font-semibold text-paper">
          See plans
        </button>
        <button
          type="button"
          aria-label="Hide for today"
          onClick={() => {
            try {
              localStorage.setItem(KEY, todayKey());
            } catch {
              /* private mode */
            }
            setHidden(true);
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
