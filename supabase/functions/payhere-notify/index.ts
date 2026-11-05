// PayHere server-to-server payment notification (notify_url).
// Verifies the md5sig signature, records each charge once, and extends the
// member's package by a month for every successful payment (first and renewals).
// Deploy with JWT verification off: PayHere doesn't send a Supabase token.
import { crypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";
import { createClient } from "npm:@supabase/supabase-js@2";

const md5Upper = async (text: string) => encodeHex(await crypto.subtle.digest("MD5", new TextEncoder().encode(text))).toUpperCase();

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const merchantId = Deno.env.get("PAYHERE_MERCHANT_ID");
  const secret = Deno.env.get("PAYHERE_MERCHANT_SECRET");
  if (!merchantId || !secret) return new Response("not configured", { status: 503 });

  const form = await req.formData();
  const f = (k: string) => String(form.get(k) ?? "");
  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Every notification is logged (without the signature) so admins can review rejected ones.
  const log = (accepted: boolean, reason = "") =>
    service.from("payment_events").insert({
      provider: "payhere",
      order_ref: f("order_id").slice(0, 80),
      status_code: f("status_code").slice(0, 8),
      accepted,
      reason,
      payload: Object.fromEntries([...form.entries()].filter(([k]) => k !== "md5sig").map(([k, v]) => [k, String(v).slice(0, 200)])),
    });

  const expected = await md5Upper(f("merchant_id") + f("order_id") + f("payhere_amount") + f("payhere_currency") + f("status_code") + (await md5Upper(secret)));
  if (f("merchant_id") !== merchantId || f("md5sig").toUpperCase() !== expected) {
    await log(false, "bad signature");
    return new Response("bad signature", { status: 400 });
  }

  const { data: order } = await service.from("payments").select("id, user_id, plan, status, amount, currency").eq("provider", "payhere").eq("provider_ref", f("order_id")).maybeSingle();
  if (!order?.user_id) {
    await log(false, "unknown order");
    return new Response("unknown order", { status: 200 });
  }
  // The signed amount must match what we asked PayHere to charge.
  if (f("payhere_currency") !== order.currency || Number(f("payhere_amount")).toFixed(2) !== Number(order.amount).toFixed(2)) {
    await log(false, "amount or currency mismatch");
    return new Response("mismatch", { status: 200 });
  }
  await log(true);

  const status = Number(f("status_code"));
  if (status === 2) {
    const paymentId = f("payment_id");
    // PayHere can repeat a notification; record each charge once.
    const { data: seen } = await service.from("payments").select("id").eq("provider", "payhere").eq("provider_ref", `pay:${paymentId}`).maybeSingle();
    if (seen) return new Response("ok");
    const plan = order.plan === "ultra" ? "ultra" : "pro";
    const { data: profile } = await service.from("profiles").select("plan_ends_at").eq("id", order.user_id).single();
    const from = profile?.plan_ends_at && new Date(profile.plan_ends_at) > new Date() ? new Date(profile.plan_ends_at) : new Date();
    const until = new Date(from);
    until.setMonth(until.getMonth() + 1);
    if (order.status === "pending") {
      await service.from("payments").update({ status: "paid", period_end: until.toISOString() }).eq("id", order.id);
    }
    await service.from("payments").insert({
      user_id: order.user_id,
      provider: "payhere",
      provider_ref: `pay:${paymentId}`,
      kind: "subscription",
      plan,
      amount: Number(f("payhere_amount")),
      currency: order.currency,
      status: "paid",
      period_end: until.toISOString(),
    });
    await service.from("profiles").update({ plan, plan_ends_at: until.toISOString() }).eq("id", order.user_id);
  } else if (order.status === "pending" && status < 0) {
    await service.from("payments").update({ status: status === -1 ? "cancelled" : "failed" }).eq("id", order.id);
  }
  return new Response("ok");
});
