import { getSupabase } from "@/lib/supabase";
import type { Row } from "./charts";

async function sb() {
  const client = await getSupabase();
  if (!client) throw new Error("The admin console needs the online version.");
  return client;
}

export interface Analytics {
  days: number;
  since: string;
  kpis: {
    members: number;
    new_members: number;
    onboarded: number;
    active_7d: number;
    active_30d: number;
    main: number;
    ultra: number;
    trial: number;
    free: number;
    paying: number;
    mrr_lkr: number;
    main_price: number;
    ultra_price: number;
    revenue_lkr: number;
    revenue_all_lkr: number;
    ai_requests: number;
    ai_batch: number;
    ai_fallback: number;
    ai_users: number;
    bookings: number;
    bookings_value_lkr: number;
    platform_fees_lkr: number;
    listings: number;
    messages: number;
    open_reports: number;
    pending_providers: number;
    pending_agencies: number;
  };
  daily: (Row & {
    signups: number;
    active: number;
    ai_document: number;
    ai_cv: number;
    ai_sop: number;
    ai_journey: number;
    ai_batch: number;
    ai_fallback: number;
    revenue: number;
    bookings: number;
    listings: number;
    messages: number;
  })[];
  breakdown: Record<"stage" | "situation" | "path" | "plan" | "city" | "ai_kind" | "ai_model", Record<string, number>> & Partial<Record<"provider" | "source" | "campaign", Record<string, number>>>;
  top_ai_users: { id: string; name: string; email: string | null; plan: string; uses: number }[];
  funnel: { step: string; n: number }[];
}

export async function fetchAnalytics(days: number): Promise<Analytics> {
  const { data, error } = await (await sb()).rpc("admin_analytics", { p_days: days });
  if (error) throw new Error(/admin_analytics|function/i.test(error.message) ? "Analytics aren't set up yet. Run the admin analytics database update (supabase/migrations/20261110000000_admin_analytics.sql)." : error.message);
  const a = data as Analytics | null;
  if (!a || !a.kpis || !Array.isArray(a.daily) || !Array.isArray(a.funnel)) throw new Error("Analytics came back incomplete. Try again.");
  return a;
}

export interface Member {
  id: string;
  email: string;
  display_name: string;
  situation: string;
  stage: string;
  path: string;
  city: string;
  role: string;
  plan: string;
  effective_plan: "trial" | "free" | "pro" | "ultra";
  plan_ends_at: string | null;
  verified: boolean;
  onboarded: boolean;
  trial_ends_at: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_active: string | null;
  banned_until: string | null;
  ai_30d: number;
  listings: number;
  bookings: number;
  paid_lkr: number;
  provider?: string;
  signup_source?: string | null;
  signup_campaign?: string | null;
}

export async function fetchMembers(search = ""): Promise<Member[]> {
  const { data, error } = await (await sb()).rpc("admin_members", { p_search: search, p_limit: 2000 });
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function updateMember(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await (await sb()).from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function signOutMember(id: string): Promise<void> {
  const { error } = await (await sb()).rpc("admin_sign_out_member", { p_user: id });
  if (error) throw error;
}

/** Lock, unlock or delete through the admin-users Edge Function (needs Supabase's admin API). */
export async function memberAction(action: "lock" | "unlock" | "delete", userId: string): Promise<void> {
  const { error } = await (await sb()).functions.invoke("admin-users", { body: { action, userId } });
  if (error) {
    const payload = (await (error as { context?: Response }).context?.json?.().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "That didn't work. Try again.");
  }
}

export interface Payment {
  id: string;
  receipt_no: number;
  user_id: string | null;
  display_name: string | null;
  email: string | null;
  provider: string;
  provider_ref: string | null;
  kind: string;
  plan: string | null;
  amount: number;
  currency: string;
  status: string;
  period_end: string | null;
  created_at: string;
}

export async function fetchPayments(days: number): Promise<Payment[]> {
  const { data, error } = await (await sb()).rpc("admin_payments", { p_days: days });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

/** A PayHere checkout creates a pending order row, then one "pay:" row per successful charge. */
export const isCharge = (p: Pick<Payment, "provider" | "provider_ref" | "status">) => p.status !== "pending" && (p.provider !== "payhere" || (p.provider_ref ?? "").startsWith("pay:"));

/** Downloads rows as a CSV file (opens in Excel and Google Sheets). */
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    // Quote everything and neutralise spreadsheet formulas.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const PLAN_LABEL: Record<string, string> = { trial: "Free month", free: "Free", pro: "Main", ultra: "Ultra" };
export const STAGE_LABEL: Record<string, string> = {
  exploring: "Exploring",
  preparing: "Preparing",
  applying: "Applying",
  visa: "Visa granted",
  arrived: "Arrived",
  settled: "Settled",
};
export const SITUATION_LABEL: Record<string, string> = { in_lk: "In Sri Lanka", in_nz: "In New Zealand", elsewhere: "Elsewhere" };
export const PATH_LABEL: Record<string, string> = { student: "Student", worker: "Skilled worker", registered: "Registered professional", family: "Partner & family", business: "Business" };
export const AI_KIND_LABEL: Record<string, string> = { document: "Document check", cv: "CV polish", sop: "SOP draft", journey: "Journey coach", chat: "Ask KiwiPath chat", batch: "Nightly review" };

/** Rough cost per AI use (USD), for planning only: low effort, typical sizes. */
export const AI_COST_USD: Record<string, number> = { haiku: 0.002, sonnet: 0.04, batch: 0.001 };

export interface UsageReport {
  screens: { screen: string; views: number; members: number }[];
  actions: { action: string; detail: string; times: number; members: number }[];
  onboarding: { step: string; members: number }[];
  daily_active: { day: string; members: number }[];
  questions: { total: number; helpful: number; not_helpful: number; with_actions: number };
}

export async function fetchUsage(days: number): Promise<UsageReport> {
  const { data, error } = await (await sb()).rpc("admin_usage", { p_days: days });
  if (error) throw new Error(/admin_usage|function/i.test(error.message) ? "Usage tracking isn't set up yet. Run the usage database update (supabase/migrations/20261113000000_usage_insights.sql)." : error.message);
  return data as UsageReport;
}

export interface AiQuestion {
  id: number;
  user_id: string | null;
  question: string;
  answer: string;
  model: string | null;
  actions: number;
  helpful: boolean | null;
  created_at: string;
}

export async function fetchQuestions(days: number): Promise<AiQuestion[]> {
  const { data, error } = await (await sb())
    .from("ai_questions")
    .select("id, user_id, question, answer, model, actions, helpful, created_at")
    .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as AiQuestion[];
}
