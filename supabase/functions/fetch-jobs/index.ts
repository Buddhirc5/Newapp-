// Live New Zealand job listings for the Job board, from the free Adzuna API.
// Needs the ADZUNA_APP_ID and ADZUNA_APP_KEY secrets (free at developer.adzuna.com).
// Without them the app still shows prefilled searches on Seek, Trade Me Jobs and others.
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "./cors.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const clean = (s: unknown, n: number) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

Deno.serve(withCors(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return json({ error: "Sign in to see jobs." }, 401);

  const id = Deno.env.get("ADZUNA_APP_ID");
  const key = Deno.env.get("ADZUNA_APP_KEY");
  if (!id || !key) return json({ configured: false, jobs: [] });

  const body = (await req.json().catch(() => ({}))) as { what?: string; where?: string; page?: number; sponsor?: boolean };
  const what = clean(body.what, 80);
  const where = clean(body.where, 40);
  const page = Math.min(Math.max(Number(body.page) || 1, 1), 5);
  const q = new URLSearchParams({ app_id: id, app_key: key, results_per_page: "20", "content-type": "application/json", sort_by: "date", max_days_old: "30" });
  if (what) q.set("what", what);
  if (body.sponsor) q.set("what_or", "visa sponsorship accredited AEWV");
  if (where && where !== "anywhere") q.set("where", where);

  try {
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/nz/search/${page}?${q}`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return json({ configured: true, jobs: [], error: "The job feed is busy. Try again soon." }, 502);
    // deno-lint-ignore no-explicit-any
    const data = (await res.json()) as { count?: number; results?: any[] };
    const jobs = (data.results ?? []).map((j) => ({
      id: String(j.id),
      title: clean(j.title, 140),
      company: clean(j.company?.display_name, 100),
      location: clean(j.location?.display_name, 100),
      summary: clean(j.description, 260),
      url: /^https:\/\//.test(String(j.redirect_url)) ? String(j.redirect_url) : "",
      salaryMin: Number(j.salary_min) || null,
      salaryMax: Number(j.salary_max) || null,
      contract: clean(j.contract_time, 20),
      created: String(j.created ?? ""),
      sponsor: /sponsor|accredited|aewv|visa/i.test(`${j.title} ${j.description}`),
    })).filter((j) => j.url);
    return json({ configured: true, total: data.count ?? jobs.length, jobs });
  } catch {
    return json({ configured: true, jobs: [], error: "The job feed didn't answer. Try again soon." }, 502);
  }
}));
