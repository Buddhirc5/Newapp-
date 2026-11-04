import { Link } from "react-router";
import { Sparkles } from "lucide-react";
import { useApp } from "@/store/app";

/** Makes it obvious when the figures on screen belong to the worked example, not the user. */
export function SampleBanner() {
  const isSample = useApp((s) => s.isSample);
  const name = useApp((s) => s.profile.name);
  if (!isSample) return null;
  return (
    <div className="gutter-x pt-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-tile bg-night py-2.5 pr-2.5 pl-4 text-paper shadow-card lg:max-w-5xl">
        <Sparkles className="size-5 shrink-0 text-gold" aria-hidden />
        <p className="min-w-0 flex-1 text-subhead">
          <span className="font-semibold">Sample journey.</span> You're viewing {name}'s example progress.
        </p>
        <Link
          to="/welcome"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-gold px-4 text-subhead font-semibold text-ink hover:brightness-105"
        >
          Start mine
        </Link>
      </div>
    </div>
  );
}
