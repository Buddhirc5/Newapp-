// Reviews an uploaded visa document with Claude and returns a fix/get/make checklist.
// The file is read from the member's private folder, analysed, then deleted.
// Requires the ANTHROPIC_API_KEY secret, the ai_enabled setting and a plan with AI uses left today.
// Runs on Claude Haiku 5.5 (low effort); retries once on Sonnet 5.5 (low effort)
// if Haiku fails or can't read the document.
import { AiError, generate, json, limitReached, member, reserve, settle, withCors } from "./ai.ts";
import { sniff } from "./sniff.ts";

const MAX_BYTES = 10 * 1024 * 1024;


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

Deno.serve(withCors(async (req) => {
  const { path, docType, fileName } = (await req.json().catch(() => ({}))) as { path?: string; docType?: string; fileName?: string };
  const m = await member(req);
  if (!m.ok) {
    // Don't leave the upload behind when the check can't run.
    if (path) await clientsRemove(req, path);
    return m.res;
  }
  if (!path || !path.startsWith(`${m.userId}/`)) return json({ error: "Upload the document first." }, 400);
  const removeFile = () => m.service.storage.from("documents").remove([path]);

  const { data: file, error: downloadError } = await m.service.storage.from("documents").download(path);
  if (downloadError || !file) return json({ error: "Couldn't read the upload. Try again." }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await removeFile();
  const mime = sniff(bytes);
  if (bytes.length > MAX_BYTES) return json({ error: "That file is over 10 MB. Try a photo or a smaller PDF." }, 413);
  if (!mime) return json({ error: "Upload a PDF, JPG, PNG or WebP file." }, 415);

  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const data = btoa(binary);
  const source =
    mime === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: mime, data } } as const);

  const label = DOC_TYPES[docType ?? "other"] ?? DOC_TYPES.other;
  const { data: profile } = await m.service.from("profiles").select("display_name").eq("id", m.userId).single();

  const reservation = await reserve(m.service, m.userId, "document").catch(() => null);
  if (reservation === null) return limitReached(m.quota);
  let model: string | null = null;

  try {
    const out = await generate<{ readable: boolean; issues: unknown[] }>(
      {
        system: SYSTEM,
        schema: SCHEMA,
        content: [source, { type: "text", text: `This should be a ${label}. The applicant's name on their profile is "${profile?.display_name ?? "unknown"}". Review it and return the checklist.` }],
      },
      // An unreadable result from Haiku gets a second look from Sonnet.
      (v) => v.readable !== false && Array.isArray(v.issues),
    );
    model = out.model;
    const { data: saved } = await m.service
      .from("document_reviews")
      .insert({ user_id: m.userId, doc_type: docType ?? "other", file_name: (fileName ?? "").slice(0, 120), result: out.data })
      .select("id, created_at")
      .single();
    return json({ result: out.data, id: saved?.id, model: out.model, remaining: Math.max(0, m.quota.limit - m.quota.used - 1) });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    return json({ error: "Something went wrong while checking. Try again." }, 500);
  } finally {
    await settle(m.service, reservation, model);
  }
}));

async function clientsRemove(req: Request, path: string) {
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  // Members can only remove files in their own folder, so this is safe to try.
  await asUser.storage.from("documents").remove([path]);
}
