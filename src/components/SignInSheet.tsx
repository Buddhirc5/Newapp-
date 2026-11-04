import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { toast } from "@/components/ui/Toast";
import { sendSignInCode, verifySignInCode } from "@/lib/sync";

/** Email one-time-code sign-in, shared by Me, the Board and chat. */
export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const res = await sendSignInCode(email.trim());
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.message ?? "Couldn't send the code.");
  };
  const verify = async () => {
    setBusy(true);
    setError(null);
    const res = await verifySignInCode(email.trim(), code.trim());
    setBusy(false);
    if (res.ok) {
      toast("Signed in. Syncing your progress");
      onClose();
    } else setError(res.message ?? "That code didn't work.");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sign in"
      description={sent ? `We sent a code to ${email}. It may take a minute to arrive.` : "We'll email you a one-time code. Your progress on this device is kept."}
      footer={
        sent ? (
          <Button block disabled={busy || code.trim().length < 6} onClick={verify}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
        ) : (
          <Button block disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} onClick={send}>
            {busy ? "Sending…" : "Email me a code"}
          </Button>
        )
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (sent ? verify() : send());
        }}
      >
        {!sent ? (
          <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} data-autofocus />
        ) : (
          <TextField
            label="6-digit code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
            className="text-center text-title2 tracking-[0.4em] tabular"
            data-autofocus
          />
        )}
        {error && (
          <p className="rounded-tile bg-coral-soft px-4 py-3 text-subhead text-coral-ink" role="alert">
            {error}
          </p>
        )}
        {sent && (
          <Button variant="plain" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        )}
      </form>
    </Sheet>
  );
}

