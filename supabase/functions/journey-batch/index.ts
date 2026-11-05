// Nightly AI journey review for Main and Ultra members, run through the
// Message Batches API at half price. Called by pg_cron:
//   { "action": "submit" }  once a night: queue a review for each active paying member
//   { "action": "collect" } every hour: save finished reviews; anything Haiku
//                           couldn't do is re-queued once on Sonnet.
// Only the service role (the cron job) or an admin may call it.
import Anthropic from "npm:@anthropic-ai/sdk@1.5.0";
import { buildRequest, clients, withCors, FALLBACK_MODEL, journeyContext, JOURNEY_SCHEMA, JOURNEY_SYSTEM, json, PRIMARY_MODEL, readJson } from "./ai.ts";

type Insight = { headline: string; next_steps: unknown[]; risks: string[]; encouragement: string };

Deno.serve(withCors(async (req) => {
  const { service, asUser } = clients(req);
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let allowed = bearer.length > 0 && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!allowed) {
    // is_admin() is true only for admins whose session passed the authenticator step.
    const { data: isAdmin } = await asUser.rpc("is_admin");
    allowed = isAdmin === true;
  }
  if (!allowed) return json({ error: "Not allowed." }, 403);

  const { data: settings } = await service.from("app_settings").select("key, value").in("key", ["ai_enabled", "ai_batch_enabled"]);
  const on = (k: string) => settings?.find((s) => s.key === k)?.value === true;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!on("ai_enabled") || !on("ai_batch_enabled") || !apiKey) return json({ skipped: "AI batch reviews are switched off." });
  const client = new Anthropic({ apiKey });

  const { action = "collect" } = (await req.json().catch(() => ({}))) as { action?: string };

  const submit = async (userIds: string[], model: string, kind: string) => {
    const requests = [];
    for (const id of userIds) {
      const context = await journeyContext(service, id);
      if (!context) continue;
      requests.push({ custom_id: id, params: buildRequest(model, { system: JOURNEY_SYSTEM, content: context, schema: JOURNEY_SCHEMA, maxTokens: 4000 }) });
    }
    if (!requests.length) return null;
    // deno-lint-ignore no-explicit-any
    const batch = await client.messages.batches.create({ requests: requests as any });
    await service.from("ai_batches").insert({ id: batch.id, kind, request_count: requests.length });
    return { id: batch.id, count: requests.length };
  };

  if (action === "submit") {
    const now = new Date();
    const { data: members } = await service
      .from("profiles")
      .select("id, plan, plan_ends_at")
      .in("plan", ["pro", "ultra"])
      .limit(5000);
    const paying = (members ?? []).filter((p) => !p.plan_ends_at || new Date(p.plan_ends_at) > now).map((p) => p.id as string);
    if (!paying.length) return json({ submitted: 0 });
    // Only members active in the last 14 days, without a review in the last 20 hours.
    const { data: active } = await service.from("user_state").select("user_id").in("user_id", paying).gte("updated_at", new Date(Date.now() - 14 * 86_400_000).toISOString());
    const { data: recent } = await service.from("journey_insights").select("user_id").in("user_id", paying).gte("created_at", new Date(Date.now() - 20 * 3_600_000).toISOString());
    const skip = new Set((recent ?? []).map((r) => r.user_id as string));
    const due = (active ?? []).map((r) => r.user_id as string).filter((id) => !skip.has(id));
    const batch = await submit(due, PRIMARY_MODEL, "journey");
    return json({ submitted: batch?.count ?? 0, batch: batch?.id ?? null });
  }

  // collect
  const { data: pending } = await service.from("ai_batches").select("id, kind").eq("status", "in_progress").order("created_at").limit(10);
  const report: Record<string, unknown>[] = [];
  for (const b of pending ?? []) {
    const batch = await client.messages.batches.retrieve(b.id);
    if (batch.processing_status !== "ended") {
      report.push({ id: b.id, status: batch.processing_status });
      continue;
    }
    let saved = 0;
    const retry: string[] = [];
    for await (const r of await client.messages.batches.results(b.id)) {
      const data = r.result.type === "succeeded" ? readJson<Insight>(r.result.message as Anthropic.Message) : null;
      if (data && Array.isArray(data.next_steps) && data.next_steps.length) {
        await service.from("journey_insights").insert({ user_id: r.custom_id, source: "batch", insight: data });
        await service.from("ai_usage").insert({ user_id: r.custom_id, kind: "batch", model: r.result.type === "succeeded" ? r.result.message.model : null });
        saved++;
      } else if (r.result.type !== "canceled") {
        retry.push(r.custom_id);
      }
    }
    await service.from("ai_batches").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", b.id);
    // Haiku couldn't do these: one more try on Sonnet.
    const again = b.kind === "journey" && retry.length ? await submit(retry, FALLBACK_MODEL, "journey_fallback") : null;
    report.push({ id: b.id, saved, retried: again?.count ?? 0 });
  }
  return json({ batches: report });
}));
