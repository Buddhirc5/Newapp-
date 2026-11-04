import { Page } from "@/components/layout/Page";
import { Mascot } from "@/components/Mascot";
import { ButtonLink } from "@/components/ui/Button";

export function NotFound() {
  return (
    <Page title="Lost?">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Mascot mood="thinking" className="w-40" label="Kiri looking puzzled" />
        <p className="max-w-sm text-callout text-label-2">This screen doesn't exist. Let's get you back on your path.</p>
        <ButtonLink to="/">Back to my journey</ButtonLink>
      </div>
    </Page>
  );
}
