// Shared AI helpers for KiwiPath Edge Functions.
// Every request runs on Claude Haiku 5.5 at low effort. If that call fails,
// is declined or returns something unusable, it is retried once on Claude
// Sonnet 5.5 at low effort. System prompts are cached, so repeat calls only
// pay full price for the member's own content.
//
// Source of truth: supabase/functions/_shared/ai.ts. `npm run sync:functions`
// copies it next to each function as ai.ts for deployment.
import Anthropic from "npm:@anthropic-ai/sdk@1.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

export const PRIMARY_MODEL = "claude-haiku-5-5";
export const FALLBACK_MODEL = "claude-sonnet-5-5";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    },
  });

export function clients(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  return { service, asUser };
}

export interface Quota {
  plan: "trial" | "free" | "pro" | "ultra";
  limit: number;
  used: number;
  enabled: boolean;
}

/** Signed-in member plus today's AI quota, or an error response to return. */
export async function member(req: Request): Promise<
  { ok: true; userId: string; quota: Quota; service: ReturnType<typeof clients>["service"] } | { ok: false; res: Response }
> {
  const { service, asUser } = clients(req);
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return { ok: false, res: json({ error: "Sign in to use AI features." }, 401) };
  const { data: quota, error } = await asUser.rpc("my_ai_quota");
  if (error || !quota) return { ok: false, res: json({ error: "Couldn't check your plan. Try again." }, 500) };
  const q = quota as Quota;
  if (!q.enabled || !Deno.env.get("ANTHROPIC_API_KEY")) return { ok: false, res: json({ error: "AI features aren't switched on yet." }, 503) };
  if (q.limit <= 0) return { ok: false, res: json({ error: "AI features are part of the Main and Ultra packages.", upgrade: true }, 402) };
  if (q.used >= q.limit) {
    return {
      ok: false,
      res: json({ error: `You've used today's ${q.limit} AI requests.${q.plan === "ultra" ? "" : " Ultra gives you more each day."}`, upgrade: q.plan !== "ultra" }, 429),
    };
  }
  return { ok: true, userId: auth.user.id, quota: q, service };
}

export async function recordUsage(service: ReturnType<typeof clients>["service"], userId: string, kind: string, model: string) {
  await service.from("ai_usage").insert({ user_id: userId, kind, model });
}

export class AiError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

type Content = Anthropic.MessageParam["content"];

export interface GenerateOptions {
  system: string;
  content: Content;
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/** Builds one Messages request. Exported so the batch job sends exactly the same shape. */
export function buildRequest(model: string, o: GenerateOptions) {
  return {
    model,
    max_tokens: o.maxTokens ?? 8000,
    // The system prompt is identical for every member, so it's cached.
    system: [{ type: "text" as const, text: o.system, cache_control: { type: "ephemeral" as const } }],
    output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: o.schema } },
    messages: [{ role: "user" as const, content: o.content }],
  };
}

/** Parses a structured response, or returns null if it can't be used. */
export function readJson<T>(message: Anthropic.Message): T | null {
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return null;
  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    return JSON.parse(text.text) as T;
  } catch {
    return null;
  }
}

/**
 * Haiku 5.5 first; Sonnet 5.5 once if Haiku fails, declines or returns something
 * `isUsable` rejects. Sonnet's answer is returned whenever it parses.
 */
export async function generate<T>(o: GenerateOptions, isUsable: (v: T) => boolean = () => true): Promise<{ data: T; model: string }> {
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")!, maxRetries: 1 });
  let lastError: unknown = null;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      // deno-lint-ignore no-explicit-any
      const message = await client.messages.create(buildRequest(model, o) as any);
      const data = readJson<T>(message as Anthropic.Message);
      if (data && (model === FALLBACK_MODEL || isUsable(data))) return { data, model };
      if ((message as Anthropic.Message).stop_reason === "refusal") lastError = new AiError("This couldn't be reviewed automatically.", 422);
    } catch (e) {
      lastError = e;
      // Bad credentials won't be fixed by switching model.
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) break;
    }
  }
  if (lastError instanceof AiError) throw lastError;
  if (lastError instanceof Anthropic.RateLimitError) throw new AiError("The AI is busy. Try again in a minute.", 429);
  throw new AiError("The AI couldn't finish. Try again.", 502);
}

// ── Journey context, shared by on-demand and nightly reviews ─────────────

interface Task {
  id: string;
  title: string;
}
interface Level {
  title: string;
  tasks: Task[];
}

/** A compact, factual summary of a member's saved journey for the model to read. */
export async function journeyContext(service: ReturnType<typeof clients>["service"], userId: string): Promise<string | null> {
  const { data: row } = await service.from("user_state").select("state, updated_at").eq("user_id", userId).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const s = (row?.state ?? null) as any;
  if (!s || s.isSample) return null;
  const pathId = String(s.pathId ?? "student");
  const { data: pathway } = await service.from("pathways").select("content").eq("id", pathId).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const content = (pathway?.content ?? {}) as any;
  const levels: Level[] = Array.isArray(content.levels) ? content.levels : [];
  const done = new Set(Object.keys(s.tasks ?? {}));
  const all = levels.flatMap((l) => l.tasks.map((t) => ({ ...t, level: l.title })));
  const todo = all.filter((t) => !done.has(t.id));
  const p = s.profile ?? {};
  const lines = [
    `Pathway: ${content.name ?? pathId}`,
    `Progress: ${all.length - todo.length} of ${all.length} steps done`,
    `Goal: ${p.goal ?? "unknown"}; qualification: ${p.qualification ?? "unknown"}; occupation: ${p.occupationId ?? p.occupationOther ?? "unknown"}; experience: ${p.experience ?? "unknown"} years`,
    `English: ${p.english ?? "unknown"}; savings: Rs ${Number(p.savingsLkr ?? 0).toLocaleString("en-LK")}; timeline: ${p.timeline ?? "unknown"}; household: ${p.household ?? "unknown"}; target city: ${p.city ?? "unknown"}`,
    `Last active: ${row?.updated_at ?? "unknown"}`,
    `CV checked: ${s.cvChecked ? "yes" : "no"}; quiz best: ${s.quiz?.best ?? 0}%; speaking practice sessions: ${(s.practice ?? []).length}; scam checks: ${(s.scamChecks ?? []).length}`,
    `Documents: ${Object.entries(s.docs ?? {}).map(([k, v]) => `${k}=${v}`).join(", ") || "none tracked"}`,
    `Recently done: ${all.filter((t) => done.has(t.id)).slice(-5).map((t) => t.title).join("; ") || "nothing yet"}`,
    `Next steps not done: ${todo.slice(0, 8).map((t) => `${t.title} (${t.level})`).join("; ") || "all done"}`,
  ];
  return lines.join("\n");
}

export const JOURNEY_SYSTEM = `You are KiwiPath's journey coach for Sri Lankans moving to New Zealand.
You receive a factual summary of one member's saved progress. Write a short, warm, practical review.

Rules:
- Use only the facts given. Never invent visa rules, fees or dates. Where a rule matters, tell them to confirm it on immigration.govt.nz.
- Focus on the next 1-3 concrete actions that unblock them, in order, with a one-line reason each.
- Flag real risks you can see in the data (for example: low savings for the student path, English not started, no CV check before job hunting, documents not ready close to applying).
- Plain, friendly NZ English. No jargon. Keep every field short.
- This is general information, not immigration advice. Never promise an outcome.`;

export const JOURNEY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "next_steps", "risks", "encouragement"],
  properties: {
    headline: { type: "string" },
    next_steps: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["title", "why"], properties: { title: { type: "string" }, why: { type: "string" } } },
    },
    risks: { type: "array", items: { type: "string" } },
    encouragement: { type: "string" },
  },
};
