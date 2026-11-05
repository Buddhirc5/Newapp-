// Runs the Supabase migrations against an in-memory Postgres (PGlite) with small
// stand-ins for Supabase's auth and storage schemas, then checks that the row
// level security policies behave as intended.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("../supabase/migrations/", import.meta.url);
const db = new PGlite();

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz, banned_until timestamptz);
  create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable
    as $$ select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true), 'aal', nullif(current_setting('request.jwt.claim.aal', true), '')) $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated;
`);
// The grants migration revokes from the public pseudo-role; nothing else is needed here.

for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(new URL(file, dir), "utf8"));
  console.log(`applied ${file}`);
}

// The generated seed must load cleanly too.
await db.exec(readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
console.log("applied seed.sql");

// Supabase grants table privileges to these roles by default; RLS does the filtering.
await db.exec(`
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage on all sequences in schema public to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
`);

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');`);

let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures += 1;
};

async function as(user, fn, aal = "aal2") {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  await db.query("select set_config('request.jwt.claim.aal', $1, false)", [user ? aal : ""]);
  await db.exec(`set role ${user ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

async function fails(fn) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

// user_state: own row only
await as(A, () => db.query(`insert into public.user_state (user_id, state) values ($1, '{"onboarded": true}')`, [A]));
check("user can save their own state", (await as(A, () => db.query("select * from public.user_state"))).rows.length === 1);
check("user cannot write someone else's state", await as(A, () => fails(() => db.query(`insert into public.user_state (user_id, state) values ($1, '{}')`, [B]))));
check("other users cannot read it", (await as(B, () => db.query("select * from public.user_state"))).rows.length === 0);
check("anonymous visitors cannot read it", (await as(null, () => db.query("select * from public.user_state"))).rows.length === 0);

// scam reports: pending until approved by an admin
await as(A, () => db.query(`insert into public.scam_reports (channel, summary, amount_lkr) values ('WhatsApp', 'Asked for a processing fee for a farm job', 450000)`));
check("reporter sees their pending report", (await as(A, () => db.query("select * from public.scam_reports"))).rows.length === 1);
check("public cannot see pending reports", (await as(null, () => db.query("select * from public.scam_reports"))).rows.length === 0);
check(
  "reporters cannot self-approve",
  await as(A, () => fails(() => db.query(`insert into public.scam_reports (channel, summary, status) values ('Email', 'Another suspicious offer', 'approved')`))),
);
await db.exec(`insert into public.admins (user_id) values ('${B}');`);
await as(B, () => db.query("update public.scam_reports set status = 'approved'"));
check("admins can approve, then it is public", (await as(null, () => db.query("select * from public.scam_reports"))).rows.length === 1);

// waitlist: write-only for the public
check("anyone can join the waitlist", !(await as(null, () => fails(() => db.query(`insert into public.waitlist (kind, email) values ('pro', 'x@example.com')`)))));
check("public cannot read waitlist emails", (await as(null, () => db.query("select * from public.waitlist"))).rows.length === 0);
check("invalid emails are rejected", await as(null, () => fails(() => db.query(`insert into public.waitlist (kind, email) values ('pro', 'not-an-email')`))));

// bookings
check(
  "users can request a future session",
  !(await as(A, () => fails(() => db.query(`insert into public.mentor_bookings (mentor_id, slot, topic) values ('sample-nurse', now() + interval '2 days', 'Registration')`)))),
);
check(
  "sessions in the past are rejected",
  await as(A, () => fails(() => db.query(`insert into public.mentor_bookings (mentor_id, slot) values ('sample-nurse', now() - interval '1 day')`))),
);
check("other users cannot see a booking", (await as(B, () => db.query("select * from public.mentor_bookings"))).rows.length === 0);

// mentors: only verified profiles are public
await db.exec(`insert into public.mentors (id, display_name, role, city, years_in_nz, path, price_lkr, verified) values
  ('m1', 'Verified mentor', 'Nurse', 'Auckland', 4, 'registered', 6000, true),
  ('m2', 'Unverified mentor', 'Engineer', 'Hamilton', 2, 'worker', 5000, false);`);
check("only verified mentors are listed", (await as(null, () => db.query("select id from public.mentors"))).rows.map((r) => r.id).join() === "m1");

// storage: private per-user folders
check("users upload into their own folder", !(await as(A, () => fails(() => db.query(`insert into storage.objects (bucket_id, name) values ('documents', '${A}/passport.pdf')`)))));
check("users cannot upload into another folder", await as(A, () => fails(() => db.query(`insert into storage.objects (bucket_id, name) values ('documents', '${B}/passport.pdf')`))));
check("other users cannot list the files", (await as(B, () => db.query("select * from storage.objects"))).rows.length === 0);

// data rules
check("NZBNs must be 13 digits starting with 94", await fails(() => db.query(`insert into public.accredited_employers (name, nzbn, source_date) values ('Test Ltd', '12345', current_date)`)));
check("pathway content is publicly readable", (await as(null, () => db.query("select id from public.pathways"))).rows.length === 5);
check("only admins can edit pathway content", (await as(A, () => db.query("update public.pathways set reviewed_by = 'me' returning id"))).rows.length === 0);

// ── Phase 1: profiles, board, reports, chat, news ──
await db.exec("delete from public.admins;");
check("sign-up creates a profile with a 30-day trial", (await db.query(`select plan, trial_ends_at > now() + interval '29 days' as ok from public.profiles where id = $1`, [A])).rows[0]?.ok === true);
await as(A, () => db.query("update public.profiles set display_name = 'Nimali', verified = true, plan = 'pro', trial_ends_at = now() + interval '5 years' where id = $1", [A]));
const prof = (await db.query("select display_name, verified, plan, trial_ends_at < now() + interval '31 days' as trial_ok from public.profiles where id = $1", [A])).rows[0];
check("members edit their name but can't grant badges, plans or longer trials", prof.display_name === "Nimali" && !prof.verified && prof.plan === "trial" && prof.trial_ok);
check("members can't edit other profiles", (await as(A, () => db.query("update public.profiles set bio = 'x' where id = $1 returning id", [B]))).rows.length === 0);

const listing = (await as(A, () => db.query(`insert into public.listings (category, title, description, price_nzd, price_unit, city) values ('room', 'Room near Mt Albert station', 'Furnished room in a friendly Sri Lankan household. Power and wifi included.', 260, 'week', 'Auckland') returning id`))).rows[0].id;
check("anyone can browse active listings", (await as(null, () => db.query("select id from public.listings"))).rows.length === 1);
check("members can't post as someone else", await as(A, () => fails(() => db.query(`insert into public.listings (owner_id, category, title, description, city) values ($1, 'item', 'Rice cooker for sale', 'Barely used rice cooker, pick up in Hamilton.', 'Hamilton')`, [B]))));
check("other members can't edit a listing", (await as(B, () => db.query("update public.listings set title = 'Hacked title here' where id = $1 returning id", [listing]))).rows.length === 0);

const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
await db.exec(`insert into auth.users (id, email) values ('${C}', 'c@example.com'), ('${D}', 'd@example.com');`);
for (const u of [B, C, D]) await as(u, () => db.query(`insert into public.reports (target_type, target_id, reason) values ('listing', $1, 'Asked for a deposit before viewing')`, [listing]));
check("three reports hide a listing", (await as(null, () => db.query("select id from public.listings"))).rows.length === 0);
check("owners can't un-hide a reported listing", (await as(A, () => db.query("update public.listings set status = 'active' where id = $1 returning id", [listing]))).rows.length === 0);
check("duplicate reports are rejected", await as(B, () => fails(() => db.query(`insert into public.reports (target_type, target_id, reason) values ('listing', $1, 'Again')`, [listing]))));

await db.exec(`update public.listings set status = 'active' where id = '${listing}';`);
const conv = (await as(B, () => db.query("select public.start_conversation($1) as id", [listing]))).rows[0].id;
const again = (await as(B, () => db.query("select public.start_conversation($1) as id", [listing]))).rows[0].id;
check("messaging a listing owner reuses one conversation", conv === again);
await as(B, () => db.query("insert into public.messages (conversation_id, body) values ($1, 'Hi! Is the room still available?')", [conv]));
await as(A, () => db.query("insert into public.messages (conversation_id, body) values ($1, 'Yes, come and view it on Saturday.')", [conv]));
check("both participants read the chat", (await as(A, () => db.query("select id from public.messages"))).rows.length === 2);
check("outsiders can't read the chat", (await as(C, () => db.query("select id from public.messages"))).rows.length === 0);
check("outsiders can't post into the chat", await as(C, () => fails(() => db.query("insert into public.messages (conversation_id, body) values ($1, 'spam')", [conv]))));
check("members can't message themselves", await as(A, () => fails(() => db.query("select public.start_conversation($1)", [listing]))));

check("news is public", !(await as(null, () => fails(() => db.query("select * from public.news_items")))));
await db.exec("insert into public.news_items (source, title, url, published_at, hidden) values ('x', 'Hidden story', 'https://hidden.example', now(), true)");
check("removed news is hidden from visitors", (await as(null, () => db.query("select id from public.news_items where hidden"))).rows.length === 0);
check("members can't remove news", (await as(A, () => db.query("update public.news_items set hidden = true returning id"))).rows.length === 0);
check("visitors can't write news", await as(A, () => fails(() => db.query("insert into public.news_items (source, title, url, published_at) values ('x', 'y', 'https://x', now())"))));
check("members upload photos only to their folder", await as(A, () => fails(() => db.query(`insert into storage.objects (bucket_id, name) values ('listing-photos', '${B}/x.jpg')`))));

// ── Phase 2: groups, meetups, agencies, settings, admin ──
const E = "55555555-5555-4555-8555-555555555555";
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${E}', 'e@example.com', '{"full_name":"Kasun Perera"}');`);
check("Google sign-ups use their full name", (await db.query("select display_name from public.profiles where id = $1", [E])).rows[0].display_name === "Kasun Perera");
await as(A, () => db.query("update public.profiles set situation = 'in_nz', stage = 'arrived', onboarded = true where id = $1", [A]));
check("members set their own stage", (await db.query("select stage from public.profiles where id = $1", [A])).rows[0].stage === "arrived");

const grp = (await db.query("select id from public.groups where slug = 'auckland'")).rows[0].id;
check("non-members can't read a group's chat", await as(B, () => fails(() => db.query("insert into public.group_messages (group_id, body) values ($1, 'hello')", [grp]))));
await as(A, () => db.query("insert into public.group_members (group_id) values ($1)", [grp]));
await as(A, () => db.query("insert into public.group_messages (group_id, body) values ($1, 'Kia ora everyone!')", [grp]));
check("joining updates the member count", (await db.query("select member_count from public.groups where id = $1", [grp])).rows[0].member_count === 1);
check("members read their group chat", (await as(A, () => db.query("select id from public.group_messages"))).rows.length === 1);
check("outsiders can't read group chat", (await as(C, () => db.query("select id from public.group_messages"))).rows.length === 0);
check("members host future meetups", !(await as(A, () => fails(() => db.query("insert into public.meetups (group_id, title, starts_at, online_link) values ($1, 'Newcomer coffee', now() + interval '3 days', 'https://meet.jit.si/kiwipath-test')", [grp])))));
check("meetup links must be https", await as(A, () => fails(() => db.query("insert into public.meetups (group_id, title, starts_at, online_link) values ($1, 'Bad link', now() + interval '3 days', 'javascript:alert(1)')", [grp]))));
check("members can't join as someone else", await as(B, () => fails(() => db.query("insert into public.group_members (group_id, user_id) values ($1, $2)", [grp, C]))));

await as(B, () => db.query("insert into public.agencies (name, city, website) values ('Test Education', 'Colombo', 'https://example.lk')"));
check("suggested agencies stay hidden until approved", (await as(null, () => db.query("select id from public.agencies"))).rows.length === 0);
check("members can't self-approve an agency", await as(B, () => fails(() => db.query("insert into public.agencies (name, city, status) values ('Fake Agency', 'Kandy', 'approved')"))));

check("settings are public but read-only", (await as(A, () => db.query("update public.app_settings set value = '999' where key = 'trial_days' returning key"))).rows.length === 0);
check("non-admins can't list members", await as(A, () => fails(() => db.query("select * from public.admin_list_members()"))));
check("non-admins can't read stats", await as(A, () => fails(() => db.query("select public.admin_stats()"))));
check("members can't edit others' profiles", (await as(A, () => db.query("update public.profiles set stage = 'settled' where id = $1 returning id", [B]))).rows.length === 0);
await db.exec(`insert into public.admins (user_id) values ('${D}');`);
check("admins list members with emails", (await as(D, () => db.query("select email from public.admin_list_members('kasun')"))).rows[0]?.email === "e@example.com");
check("admins read stats", (await as(D, () => db.query("select public.admin_stats() as s"))).rows[0].s.members >= 5);
await as(D, () => db.query("update public.profiles set plan = 'pro', verified = true where id = $1", [A]));
check("admins can upgrade a member", (await db.query("select plan, verified from public.profiles where id = $1", [A])).rows[0].plan === "pro");
await as(D, () => db.query("update public.app_settings set value = '14' where key = 'trial_days'"));
const F = "66666666-6666-4666-8666-666666666666";
await db.exec(`insert into auth.users (id, email) values ('${F}', 'f@example.com');`);
check("new members get the admin-set trial length", (await db.query("select trial_ends_at < now() + interval '15 days' as ok from public.profiles where id = $1", [F])).rows[0].ok);
check("members can't see others' payments", (await as(B, () => db.query("select id from public.payments"))).rows.length === 0);

// ── Phase 3: gigs, bookings, providers, AI usage ──
await db.exec("delete from public.admins;");
const G = "77777777-7777-4777-8777-777777777777";
await db.exec(`insert into auth.users (id, email) values ('${G}', 'g@example.com');`);
check("unverified members can't offer visa advice", await as(G, () => fails(() => db.query("insert into public.gigs (category, title, description, price_lkr) values ('visa', 'Visa consultation', 'I will review your student visa application in detail.', 10000)"))));
const mentorGig = (await as(G, () => db.query("insert into public.gigs (category, title, description, price_lkr) values ('mentoring', 'Life as a nurse in Auckland', 'Thirty minutes on registration, shifts and finding a flat.', 5000) returning id"))).rows[0].id;
check("members can offer mentoring sessions", Boolean(mentorGig));
const order = (await as(B, () => db.query("insert into public.gig_orders (gig_id, slot, amount_lkr, platform_fee_lkr, status) values ($1, now() + interval '2 days', 1, 0, 'paid') returning id, amount_lkr, platform_fee_lkr, status, provider_id", [mentorGig]))).rows[0];
check("price, fee and status come from the database", order.amount_lkr === 5000 && order.platform_fee_lkr === 1000 && order.status === "requested" && order.provider_id === G);
check("members can't book their own gig", await as(G, () => fails(() => db.query("insert into public.gig_orders (gig_id, slot) values ($1, now() + interval '2 days')", [mentorGig]))));
check("buyers can't mark a booking paid", await as(B, () => fails(() => db.query("update public.gig_orders set status = 'paid' where id = $1", [order.id]))));
check("buyers can't change the price", await as(B, () => fails(() => db.query("update public.gig_orders set amount_lkr = 10 where id = $1", [order.id]))));
await as(G, () => db.query("update public.gig_orders set status = 'accepted' where id = $1", [order.id]));
check("providers accept bookings", (await db.query("select status from public.gig_orders where id = $1", [order.id])).rows[0].status === "accepted");
check("providers can't complete an unpaid paid session", await as(G, () => fails(() => db.query("update public.gig_orders set status = 'completed' where id = $1", [order.id]))));
check("outsiders can't see a booking", (await as(C, () => db.query("select id from public.gig_orders"))).rows.length === 0);
await as(G, () => db.query("insert into public.provider_applications (kind, full_name, licence_number, licence_body) values ('adviser', 'Test Adviser', '201900123', 'Immigration Advisers Authority')"));
check("applicants can't approve themselves", (await as(G, () => db.query("update public.provider_applications set status = 'approved' returning id"))).rows.length === 0);
await db.exec(`insert into public.admins (user_id) values ('${D}');`);
await as(D, () => db.query("update public.provider_applications set status = 'approved' where user_id = $1", [G]));
check("approval makes a verified provider", (await db.query("select role, verified from public.profiles where id = $1", [G])).rows[0].verified === true);
check("verified providers can offer visa advice", !(await as(G, () => fails(() => db.query("insert into public.gigs (category, title, description, price_lkr) values ('visa', 'Visa consultation', 'I will review your student visa application in detail.', 10000)")))));
check("members can't write AI usage", await as(B, () => fails(() => db.query("insert into public.ai_usage (user_id) values ($1)", [B]))));
check("admin stats include bookings", (await as(D, () => db.query("select public.admin_stats() as s"))).rows[0].s.bookings_30d === 1);

// Plans and AI quota.
await as(B, () => db.query("update public.profiles set plan = 'ultra', plan_ends_at = now() + interval '1 year' where id = $1", [B]));
check("members can't give themselves Ultra", (await db.query("select plan from public.profiles where id = $1", [B])).rows[0].plan !== "ultra");
await db.query("update public.profiles set plan = 'ultra', plan_ends_at = now() + interval '30 days' where id = $1", [B]);
check("Ultra is effective while paid", (await as(B, () => db.query("select public.effective_plan($1) as p", [B]))).rows[0].p === "ultra");
await db.query("update public.profiles set plan_ends_at = now() - interval '10 days' where id = $1", [B]);
check("lapsed plans fall back to free", (await as(B, () => db.query("select public.effective_plan($1) as p", [B]))).rows[0].p === "free");
await db.query("update public.profiles set plan_ends_at = now() + interval '30 days' where id = $1", [B]);
const quota = (await as(B, () => db.query("select public.my_ai_quota() as q"))).rows[0].q;
check("Ultra quota uses the Ultra limit", quota.plan === "ultra" && quota.limit === 60);
check("members can't read other members' insights", (await as(C, () => db.query("select id from public.journey_insights where user_id = $1", [B]))).rows.length === 0);
check("members can't write insights", await as(B, () => fails(() => db.query("insert into public.journey_insights (user_id, insight) values ($1, '{}')", [B]))));

// Security hardening.
check("admins without the authenticator step aren't admins", (await as(D, () => db.query("select public.is_admin() as a", []), "aal1")).rows[0].a === false);
check("admin accounts are still recognised for the sign-in screen", (await as(D, () => db.query("select public.is_admin_account() as a", []), "aal1")).rows[0].a === true);
check("admin stats need the authenticator step", await as(D, () => fails(() => db.query("select public.admin_stats()")), "aal1"));
check("members can't read another member's plan", (await as(C, () => db.query("select public.effective_plan($1) as p", [B]))).rows[0].p === null);
check("members can read their own plan", (await as(B, () => db.query("select public.effective_plan($1) as p", [B]))).rows[0].p === "ultra");
check("prices outside the allowed range are refused", await as(D, () => fails(() => db.query("update public.app_settings set value = '199000' where key = 'main_price_lkr'"))));
await as(D, () => db.query("update public.app_settings set value = '2490' where key = 'main_price_lkr'"));
check("admin changes are written to the audit log", (await as(D, () => db.query("select changes from public.admin_audit where target_table = 'app_settings' order by id desc limit 1"))).rows[0]?.changes?.value?.to === 2490);
check("members can't read the audit log", (await as(B, () => db.query("select id from public.admin_audit"))).rows.length === 0);
check("members can't reserve AI uses directly", await as(B, () => fails(() => db.query("select public.reserve_ai_use($1, 'cv')", [B]))));
const r1 = (await db.query("select public.reserve_ai_use($1, 'cv') as id", [B])).rows[0].id;
check("the service can reserve an AI use", r1 !== null);
for (let i = 0; i < 70; i++) await db.query("select public.reserve_ai_use($1, 'cv')", [B]);
check("reservations stop at the daily limit", (await db.query("select count(*)::int as n from public.ai_usage where user_id = $1 and kind = 'cv'", [B])).rows[0].n === 60);
let blocked = false;
for (let i = 0; i < 12 && !blocked; i++) {
  blocked = await as(A, () => fails(() => db.query("insert into public.listings (kind, title, description, price_lkr, city) values ('room', $1, 'A clean room near the bus stop, bills included.', 1000, 'Auckland')", [`Room number ${i} to rent`])));
}
check("listing floods are slowed down", blocked);
await db.exec("reset role;");
await db.exec(`delete from auth.users where id = '${C}'`);
check("deleting an account removes the member's profile", (await db.query("select id from public.profiles where id = $1", [C])).rows.length === 0);
check("members can't read payment events", (await as(B, () => db.query("select id from public.payment_events"))).rows.length === 0);

// Admin analytics.
const an = (await as(D, () => db.query("select public.admin_analytics(30) as a"))).rows[0].a;
check("analytics returns 30 daily rows", an.daily.length === 30);
check("analytics counts members and paying", an.kpis.members >= 3 && typeof an.kpis.paying === "number" && an.funnel.length === 5);
check("analytics counts AI use by kind", typeof an.breakdown.ai_kind === "object");
check("analytics need the authenticator step", await as(D, () => fails(() => db.query("select public.admin_analytics(30)")), "aal1"));
check("members can't read analytics", await as(B, () => fails(() => db.query("select public.admin_analytics(30)"))));
const mem = (await as(D, () => db.query("select * from public.admin_members('', 50)"))).rows;
check("admin member list includes AI use and plan", mem.length >= 3 && "ai_30d" in mem[0] && "effective_plan" in mem[0]);
await db.exec(`insert into public.payments (user_id, provider, kind, plan, amount, currency, status) values ('${B}', 'manual', 'subscription', 'ultra', 5990, 'LKR', 'paid')`);
const pays = (await as(D, () => db.query("select * from public.admin_payments(30)"))).rows;
check("payments list members and receipt numbers", pays.length >= 1 && pays[0].receipt_no >= 1001 && pays[0].email === "b@example.com");
check("members see their own receipts", (await as(B, () => db.query("select receipt_no from public.payments"))).rows.length >= 1);
check("members can't sign others out", await as(B, () => fails(() => db.query("select public.admin_sign_out_member($1)", [A]))));
await as(D, () => db.query("select public.admin_sign_out_member($1)", [A]));
check("admin sign-outs are audited", (await as(D, () => db.query("select id from public.admin_audit where action = 'sign_out'"))).rows.length === 1);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
