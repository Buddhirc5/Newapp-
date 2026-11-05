// Reviews an uploaded visa document with Claude and returns a fix/get/make checklist.
// The file is read from the member's private folder, analysed, then deleted.
// Requires the ANTHROPIC_API_KEY secret and the ai_enabled setting.
import Anthropic from "npm:@anthropic-ai/sdk@1.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-5-5";

const DOC_TYPES: Record<string, string> = {
  passport: "passport bio page",
  bank_statement: "bank statement used as proof of funds",
  police_certificate: "police clearance certificate",
  reference_letter: "employment reference letter",
  offer_letter: "university offer of place",
  english_test: "English test result (IELTS, PTE or TOEFL)",
  marriage_certificate: "marriage certificate",
  birth_certificate: "birth certificate",
  degree_certificate: "degree certificate or academic transcript",
  sponsor_letter: "sponsor or financial undertaking letter",
  cv: "CV (résumé) for New Zealand employers: check it follows NZ conventions (no photo, date of birth, NIC, religion or marital status; achievement bullets; work rights stated; referees; NZ English)",
  other: "supporting document",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["document_type", "readable", "summary", "fields", "issues", "next_steps"],
  properties: {
    document_type: { type: "string" },
    readable: { type: "boolean" },
    summary: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: { label: { type: "string" }, value: { type: "string" } },
      },
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "title", "detail"],
        properties: {
          severity: { type: "string", enum: ["fix", "improve", "ok"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    next_steps: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `You review documents that Sri Lankan applicants will submit with New Zealand visa, university or job applications.
Check the document like a careful case officer would, and explain problems in plain, friendly English for someone who isn't a lawyer.
Look for: expiry dates and how close they are; names and dates of birth that look inconsistent; missing signatures, stamps, letterheads or contact details; text that isn't in English (certified English translations are needed for Sinhala or Tamil documents); poor image quality or cut-off edges; for bank statements, the period covered, large unexplained deposits and whether the holder's name matches; for reference letters, missing job title, dates, hours, salary or duties.
Use severity "fix" for problems that could get an application returned or declined, "improve" for things that would make it stronger, and "ok" for checks that passed.
Extract only the key fields a person needs to double-check; mask passport and ID numbers except the last 3 characters.
Never say a document is genuine or guarantee an outcome. This is general information, not immigration advice; suggest a licensed adviser for anything uncertain.
If the image is unreadable or isn't the stated document, set readable to false and explain what to upload instead.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

  const { data: auth } = await asUser.auth.getUser();
  const user = auth.user;
  if (!user) return json({ error: "Sign in to check documents." }, 401);

  const { path, docType, fileName } = (await req.json().catch(() => ({}))) as { path?: string; docType?: string; fileName?: string };
  if (!path || !path.startsWith(`${user.id}/`)) return json({ error: "Upload the document first." }, 400);
  const removeFile = () => service.storage.from("documents").remove([path]);

  // Admin switches and limits.
  const { data: settings } = await service.from("app_settings").select("key, value").in("key", ["ai_enabled", "ai_daily_limit"]);
  const setting = (k: string) => settings?.find((s) => s.key === k)?.value;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (setting("ai_enabled") !== true || !apiKey) {
    await removeFile();
    return json({ error: "AI document checks aren't switched on yet." }, 503);
  }

  const { data: profile } = await service.from("profiles").select("plan, trial_ends_at, display_name").eq("id", user.id).single();
  const fullAccess = profile && (profile.plan === "pro" || (profile.plan === "trial" && new Date(profile.trial_ends_at) > new Date()));
  if (!fullAccess) {
    await removeFile();
    return json({ error: "AI checks are part of Pro. Your free month has ended." }, 402);
  }

  const limit = Number(setting("ai_daily_limit") ?? 5);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await service.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= limit) {
    await removeFile();
    return json({ error: `You've used today's ${limit} checks. Try again tomorrow.` }, 429);
  }

  const { data: file, error: downloadError } = await service.storage.from("documents").download(path);
  if (downloadError || !file) return json({ error: "Couldn't read the upload. Try again." }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await removeFile();

  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const data = btoa(binary);
  const mime = file.type || (path.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
  const source =
    mime === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: (["image/png", "image/webp", "image/gif"].includes(mime) ? mime : "image/jpeg") as "image/jpeg", data } } as const);

  const label = DOC_TYPES[docType ?? "other"] ?? DOC_TYPES.other;
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            source,
            {
              type: "text",
              text: `This should be a ${label}. The applicant's name on their profile is "${profile?.display_name ?? "unknown"}". Review it and return the checklist.`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return json({ error: "This document couldn't be reviewed automatically. Ask a licensed adviser to check it." }, 422);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "The review came back empty. Try again." }, 502);
    const result = JSON.parse(text.text);

    await service.from("ai_usage").insert({ user_id: user.id, kind: "document" });
    const { data: saved } = await service
      .from("document_reviews")
      .insert({ user_id: user.id, doc_type: docType ?? "other", file_name: (fileName ?? "").slice(0, 120), result })
      .select("id, created_at")
      .single();
    return json({ result, id: saved?.id, remaining: Math.max(0, limit - (count ?? 0) - 1) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "The checker is busy. Try again in a minute." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `The checker couldn't run (${e.status}).` }, 502);
    return json({ error: "Something went wrong while checking. Try again." }, 500);
  }
});
