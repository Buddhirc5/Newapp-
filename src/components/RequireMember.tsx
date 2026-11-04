import { useState, type ReactNode } from "react";
import { LogIn } from "lucide-react";
import { HAS_SUPABASE } from "@/lib/env";
import { useAuth } from "@/lib/sync";
import { Mascot } from "./Mascot";
import { SignInSheet } from "./SignInSheet";
import { Button } from "./ui/Button";

/** Shows its children to signed-in members, otherwise a friendly sign-in prompt. */
export function RequireMember({ children, reason }: { children: ReactNode; reason: string }) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const [open, setOpen] = useState(false);
  if (user) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 text-center shadow-card">
      <Mascot mood="smile" className="w-28" />
      <p className="type-display text-title3">{HAS_SUPABASE ? "Join the community" : "Available online"}</p>
      <p className="max-w-sm text-subhead text-label-2">
        {HAS_SUPABASE ? `${reason} New members get every feature free for their first month.` : `${reason} This works in the online version of KiwiPath.`}
      </p>
      {HAS_SUPABASE && (
        <Button disabled={!ready} onClick={() => setOpen(true)} icon={<LogIn className="size-5" aria-hidden />}>
          Sign in with email
        </Button>
      )}
      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
