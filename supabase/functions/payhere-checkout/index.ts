// Starts a PayHere monthly subscription for the Main or Ultra package.
// Returns the form fields the browser posts to PayHere's hosted checkout, so
// card details never touch KiwiPath. Needs the PAYHERE_MERCHANT_ID and
// PAYHERE_MERCHANT_SECRET secrets (PAYHERE_SANDBOX=true while testing) and the
// payments_enabled setting.
import { crypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info" },
  });

export async function md5Upper(text: string): Promise<string> {
  return encodeHex(await crypto.subtle.digest("MD5", new TextEncoder().encode(text))).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return json({ error: "Sign in to subscribe." }, 401);

  const merchantId = Deno.env.get("PAYHERE_MERCHANT_ID");
  const secret = Deno.env.get("PAYHERE_MERCHANT_SECRET");
  const { data: settings } = await service.from("app_settings").select("key, value").in("key", ["payments_enabled", "main_price_lkr", "ultra_price_lkr"]);
  const setting = (k: string) => settings?.find((s) => s.key === k)?.value;
  if (setting("payments_enabled") !== true || !merchantId || !secret) return json({ error: "Online payments aren't switched on yet." }, 503);

  const body = (await req.json().catch(() => ({}))) as { plan?: string; phone?: string; city?: string; returnUrl?: string };
  const plan = body.plan === "ultra" ? "ultra" : body.plan === "pro" ? "pro" : null;
  if (!plan) return json({ error: "Choose a package." }, 400);
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "");
  if (phone.length < 9) return json({ error: "Add your mobile number. PayHere needs it for the receipt." }, 400);

  const price = Number(setting(plan === "ultra" ? "ultra_price_lkr" : "main_price_lkr") ?? (plan === "ultra" ? 5990 : 1990));
  const amount = price.toFixed(2);
  const { data: profile } = await service.from("profiles").select("display_name, city").eq("id", auth.user.id).single();
  const [first, ...rest] = String(profile?.display_name || "KiwiPath member").trim().split(/\s+/);

  const { data: order, error } = await service
    .from("payments")
    .insert({ user_id: auth.user.id, provider: "payhere", kind: "subscription", plan, amount: price, currency: "LKR", status: "pending" })
    .select("id")
    .single();
  if (error || !order) return json({ error: "Couldn't start the payment. Try again." }, 500);
  await service.from("payments").update({ provider_ref: order.id }).eq("id", order.id);

  const site = (body.returnUrl && /^https:\/\/[\w.-]+(:\d+)?\//.test(body.returnUrl) ? new URL(body.returnUrl).origin : "https://kiwipath-nz.vercel.app");
  const sandbox = Deno.env.get("PAYHERE_SANDBOX") === "true";
  const hash = await md5Upper(merchantId + order.id + amount + "LKR" + (await md5Upper(secret)));

  return json({
    action: sandbox ? "https://sandbox.payhere.lk/pay/checkout" : "https://www.payhere.lk/pay/checkout",
    fields: {
      merchant_id: merchantId,
      return_url: `${site}/me?payment=done`,
      cancel_url: `${site}/me?payment=cancelled`,
      notify_url: `${url}/functions/v1/payhere-notify`,
      order_id: order.id,
      items: plan === "ultra" ? "KiwiPath Ultra (monthly)" : "KiwiPath Main (monthly)",
      currency: "LKR",
      amount,
      recurrence: "1 Month",
      duration: "Forever",
      first_name: first,
      last_name: rest.join(" ") || "-",
      email: auth.user.email ?? "",
      phone,
      address: "-",
      city: String(body.city || profile?.city || "Colombo").slice(0, 60),
      country: "Sri Lanka",
      custom_1: plan,
      custom_2: auth.user.id,
      hash,
    },
  });
});
