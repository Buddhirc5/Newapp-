import { getSupabase } from "./supabase";

/**
 * Authenticator-app (TOTP) protection for the admin console, using Supabase MFA.
 * Admins enrol once with Google Authenticator, Microsoft Authenticator or 1Password,
 * then enter a 6-digit code each session.
 */

export type MfaState =
  | { kind: "loading" }
  | { kind: "none" } // no authenticator enrolled yet
  | { kind: "needs-code"; factorId: string }
  | { kind: "verified" };

async function sb() {
  const client = await getSupabase();
  if (!client) throw new Error("Admin console needs the online version.");
  return client;
}

export async function mfaState(): Promise<MfaState> {
  const client = await sb();
  const [{ data: aal }, { data: factors }] = await Promise.all([client.auth.mfa.getAuthenticatorAssuranceLevel(), client.auth.mfa.listFactors()]);
  const totp = factors?.totp?.find((f) => f.status === "verified");
  if (!totp) return { kind: "none" };
  if (aal?.currentLevel === "aal2") return { kind: "verified" };
  return { kind: "needs-code", factorId: totp.id };
}

export async function startEnrolment(): Promise<{ factorId: string; qr: string; secret: string }> {
  const client = await sb();
  // Remove half-finished enrolments so a fresh QR code can be shown.
  const { data: factors } = await client.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status !== "verified") await client.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `KiwiPath admin ${new Date().toISOString().slice(0, 10)}` });
  if (error) throw error;
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyCode(factorId: string, code: string): Promise<void> {
  const client = await sb();
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  if (error) throw error;
}
