import type { Booking, ScamReport } from "@/types";
import { getSupabase } from "./supabase";
import { useAuth } from "./sync";

export type RemoteResult = { ok: true; remote: boolean } | { ok: false; message: string };

/**
 * Community writes. In local mode they succeed locally (remote: false) so the
 * interface can say the item is saved on this device only.
 */
export async function submitScamReport(report: Pick<ScamReport, "channel" | "summary" | "amountLkr">): Promise<RemoteResult> {
  const sb = await getSupabase();
  const user = useAuth.getState().user;
  if (!sb || !user) return { ok: true, remote: false };
  const { error } = await sb.from("scam_reports").insert({
    reporter_id: user.id,
    channel: report.channel,
    summary: report.summary,
    amount_lkr: report.amountLkr || null,
  });
  return error ? { ok: false, message: error.message } : { ok: true, remote: true };
}

export async function requestBooking(booking: Pick<Booking, "mentorId" | "slotIso" | "topic">): Promise<RemoteResult> {
  const sb = await getSupabase();
  const user = useAuth.getState().user;
  if (!sb || !user) return { ok: true, remote: false };
  const { error } = await sb.from("mentor_bookings").insert({
    user_id: user.id,
    mentor_id: booking.mentorId,
    slot: booking.slotIso,
    topic: booking.topic,
  });
  return error ? { ok: false, message: error.message } : { ok: true, remote: true };
}

export async function joinWaitlistRemote(kind: "pro" | "mentor", email: string): Promise<RemoteResult> {
  const sb = await getSupabase();
  if (!sb) return { ok: true, remote: false };
  const { error } = await sb.from("waitlist").insert({ kind, email });
  return error ? { ok: false, message: error.message } : { ok: true, remote: true };
}
