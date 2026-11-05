// AI help for paying members: polish an NZ CV, draft an SOP, or review the journey.
// Haiku 5.5 (low effort) first, Sonnet 5.5 (low effort) if that fails. Counted
// against the member's daily limit only when it succeeds.
import { AiError, generate, journeyContext, JOURNEY_SCHEMA, JOURNEY_SYSTEM, json, limitReached, member, reserve, settle, withCors } from "./ai.ts";

const CV_SYSTEM = `You are an experienced New Zealand recruiter helping a Sri Lankan job seeker polish their CV for NZ employers.
NZ conventions: no photo, date of birth, NIC, religion, marital status or parents' names; a 3-4 line profile summary in the third-person-free style (no "I"); achievement bullets that start with a strong past-tense verb and include a number or result where the facts allow; NZ English spelling (organise, colour, programme); work rights stated clearly.
Rules:
- Rewrite only what you are given. Never invent employers, dates, numbers, qualifications or results. If a bullet has no number, make it clearer without adding one, and suggest in tips what number they could add.
- Keep each experience item's id exactly as given.
- 3-6 bullets per role, each under 25 words. Summary under 70 words. 6-10 key skills.
- If a target role is given, emphasise relevant skills and words from it.`;

const CV_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "skills", "experience", "tips"],
  properties: {
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "bullets"],
        properties: { id: { type: "string" }, bullets: { type: "array", items: { type: "string" } } },
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
};

const SOP_SYSTEM = `You help Sri Lankan applicants write a Statement of Purpose for a New Zealand university and student visa application.
Immigration NZ case officers look for: a genuine study intention, a clear link between past study or work and this programme, why this programme and why New Zealand, realistic career plans, and how the study is funded.
Rules:
- Write in the first person, in clear NZ English, 650-900 words, 5-7 paragraphs, no headings.
- Use only the facts given. Never invent grades, employers, awards, scholarships or family details. Where a key fact is missing, write a short bracketed placeholder like [add your final GPA] and mention it in tips.
- No clichés ("since childhood", "world-class", "beautiful country"). Be specific.
- Don't promise to leave or stay in New Zealand; describe genuine plans honestly.`;

const SOP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["draft", "tips"],
  properties: { draft: { type: "string" }, tips: { type: "array", items: { type: "string" } } },
};

const CHAT_SYSTEM = `You are KiwiPath's assistant for Sri Lankans moving to New Zealand to study, work, join family or settle in.
You answer questions about NZ visas and pathways, studying, job hunting, money (NZD and LKR), English tests, documents, scams, and settling in.
Rules:
- Be accurate and honest. Never invent visa rules, fees, thresholds or processing times. If you aren't sure, or a number changes often, say so and point them to the official page.
- Prefer official sources: immigration.govt.nz, nzqa.govt.nz, studywithnewzealand.govt.nz, careers.govt.nz, employment.govt.nz, tenancy.govt.nz, iaa.govt.nz (licensed advisers). Only include links you are confident exist; use the site's home page if unsure.
- Use the member's saved journey (given below) to make the answer personal, but don't repeat it back.
- Warn about scams when money, job offers or agents come up: genuine NZ employers never charge for jobs, and only licensed advisers or lawyers can give immigration advice.
- This is general information, not immigration advice. For their specific case, suggest a licensed immigration adviser.
- Plain, friendly NZ English. Short paragraphs or bullets. Under 220 words unless they ask for detail.
- If the question isn't about moving to or living in New Zealand, politely steer back.`;

const CHAT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "links", "follow_ups"],
  properties: {
    answer: { type: "string" },
    links: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url"], properties: { title: { type: "string" }, url: { type: "string" } } } },
    follow_ups: { type: "array", items: { type: "string" } },
  },
};

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

Deno.serve(withCors(async (req) => {
  const m = await member(req);
  if (!m.ok) return m.res;

  const body = (await req.json().catch(() => ({}))) as { kind?: string; cv?: Record<string, unknown>; sop?: Record<string, unknown>; target?: string; messages?: { role?: string; text?: string }[] };
  if (!["cv", "sop", "journey", "chat"].includes(String(body.kind))) return json({ error: "Unknown request." }, 400);

  // Hold one of today's uses for this request; it's refunded if anything fails.
  const reservation = await reserve(m.service, m.userId, String(body.kind)).catch(() => null);
  if (reservation === null) return limitReached(m.quota);
  let model: string | null = null;

  try {
    if (body.kind === "cv") {
      const cv = body.cv ?? {};
      // deno-lint-ignore no-explicit-any
      const jobs = Array.isArray(cv.experience) ? (cv.experience as any[]).slice(0, 8) : [];
      if (!jobs.length && !clip(cv.summary, 10)) return json({ error: "Add a summary or at least one role first." }, 400);
      const text = [
        `Target role: ${clip(body.target || cv.headline, 120) || "not given"}`,
        `Headline: ${clip(cv.headline, 120)}`,
        `Work rights: ${clip(cv.workRights, 120)}`,
        `Current summary: ${clip(cv.summary, 1200)}`,
        `Current skills: ${clip(cv.skills, 600)}`,
        ...jobs.map((j) => `Role id=${clip(j.id, 40)}: ${clip(j.role, 100)} at ${clip(j.company, 100)}, ${clip(j.location, 80)}, ${clip(j.start, 20)}-${clip(j.end, 20)}\nBullets:\n${clip(j.bullets, 1500)}`),
        `Education: ${clip(cv.education, 800)}`,
      ].join("\n\n");
      const out = await generate<{ summary: string; skills: string[]; experience: { id: string; bullets: string[] }[]; tips: string[] }>(
        { system: CV_SYSTEM, content: text, schema: CV_SCHEMA },
        (v) => typeof v.summary === "string" && Array.isArray(v.experience),
      );
      model = out.model;
      return json({ result: out.data, model: out.model, remaining: m.quota.limit - m.quota.used - 1 });
    }

    if (body.kind === "sop") {
      const s = body.sop ?? {};
      if (!clip(s.programme, 5) || !clip(s.university, 3)) return json({ error: "Add the programme and university first." }, 400);
      const text = Object.entries({
        "Applicant's name": s.name,
        Programme: s.programme,
        University: s.university,
        "Previous degree": s.degree,
        "Academic highlights": s.achievements,
        "Work experience": s.experience,
        "Why this programme": s.whyProgramme,
        "Why New Zealand": s.whyNz,
        "Career goal": s.careerGoal,
        Funding: s.funding,
      })
        .map(([k, v]) => `${k}: ${clip(v, 1500) || "(not given)"}`)
        .join("\n");
      const out = await generate<{ draft: string; tips: string[] }>({ system: SOP_SYSTEM, content: text, schema: SOP_SCHEMA, maxTokens: 10000 }, (v) => v.draft?.length > 400);
      model = out.model;
      return json({ result: out.data, model: out.model, remaining: m.quota.limit - m.quota.used - 1 });
    }

    if (body.kind === "journey") {
      const context = await journeyContext(m.service, m.userId);
      if (!context) return json({ error: "Start your own journey first, then sign in so it's saved." }, 400);
      const out = await generate<{ headline: string; next_steps: { title: string; why: string }[]; risks: string[]; encouragement: string }>(
        { system: JOURNEY_SYSTEM, content: context, schema: JOURNEY_SCHEMA, maxTokens: 4000 },
        (v) => Array.isArray(v.next_steps) && v.next_steps.length > 0,
      );
      model = out.model;
      await m.service.from("journey_insights").insert({ user_id: m.userId, source: "on_demand", insight: out.data });
      return json({ result: out.data, model: out.model, remaining: m.quota.limit - m.quota.used - 1 });
    }

    if (body.kind === "chat") {
      const history = (Array.isArray(body.messages) ? body.messages : []).slice(-10).filter((x) => clip(x?.text, 1).length);
      const last = history[history.length - 1];
      if (!last || last.role !== "user") return json({ error: "Ask a question first." }, 400);
      const context = (await journeyContext(m.service, m.userId)) ?? "No saved journey yet.";
      const transcript = history.map((x) => `${x.role === "user" ? "Member" : "KiwiPath"}: ${clip(x.text, 1500)}`).join("\n\n");
      const out = await generate<{ answer: string; links: { title: string; url: string }[]; follow_ups: string[] }>(
        { system: CHAT_SYSTEM, content: `Member's saved journey:\n${context}\n\nConversation so far:\n${transcript}\n\nReply to the member's last message.`, schema: CHAT_SCHEMA, maxTokens: 3000 },
        (v) => typeof v.answer === "string" && v.answer.length > 10,
      );
      model = out.model;
      const links = (out.data.links ?? []).filter((l) => /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(l.url)).slice(0, 4);
      return json({ result: { ...out.data, links, follow_ups: (out.data.follow_ups ?? []).slice(0, 3) }, model: out.model, remaining: m.quota.limit - m.quota.used - 1 });
    }

    return json({ error: "Unknown request." }, 400);
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    return json({ error: "Something went wrong. Try again." }, 500);
  } finally {
    await settle(m.service, reservation, model);
  }
}));
