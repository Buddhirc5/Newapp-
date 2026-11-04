import { create } from "zustand";
import type { Listing, ListingCategory, PriceUnit } from "@/data/board";
import { getSupabase } from "./supabase";
import { useAuth } from "./sync";

/**
 * Community data access (board, chat, news, profiles). Every function needs the
 * Supabase backend; screens fall back to clearly labelled samples without it.
 */

export interface MemberProfile {
  id: string;
  display_name: string;
  role: "planner" | "newcomer" | "helper" | "provider";
  country: "lk" | "nz";
  city: string;
  bio: string;
  languages: string[];
  verified: boolean;
  plan: "trial" | "free" | "pro";
  trial_ends_at: string;
  created_at: string;
  situation: "in_lk" | "in_nz" | "elsewhere";
  stage: "exploring" | "preparing" | "applying" | "visa" | "arrived" | "settled";
  path: "student" | "worker" | "registered" | "family" | "business";
  interests: string[];
  onboarded: boolean;
}

export interface NewsItem {
  id: number;
  source: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  published_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  member_a: string;
  member_b: string;
  last_message_at: string;
  listing?: { title: string } | null;
  other?: { display_name: string } | null;
}

export interface Message {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error("This needs the online version of KiwiPath.");
  return sb;
}

function requireUser() {
  const user = useAuth.getState().user;
  if (!user) throw new Error("Sign in first.");
  return user;
}

const LISTING_FIELDS = "id, owner_id, category, title, description, price_nzd, price_unit, city, suburb, available_from, photos, status, created_at, owner:profiles(display_name, verified, role)";

export async function fetchListings(opts: { category?: ListingCategory | "all"; city?: string; q?: string; limit?: number }): Promise<Listing[]> {
  const sb = await client();
  let query = sb.from("listings").select(LISTING_FIELDS).eq("status", "active").order("created_at", { ascending: false }).limit(opts.limit ?? 60);
  if (opts.category && opts.category !== "all") query = query.eq("category", opts.category);
  if (opts.city && opts.city !== "All cities") query = query.eq("city", opts.city);
  if (opts.q?.trim()) {
    const term = opts.q.trim().replace(/[%,()]/g, " ");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,suburb.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Listing[];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const sb = await client();
  const { data, error } = await sb.from("listings").select(LISTING_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Listing | null;
}

export async function fetchMyListings(): Promise<Listing[]> {
  const sb = await client();
  const user = requireUser();
  const { data, error } = await sb.from("listings").select(LISTING_FIELDS).eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Listing[];
}

export interface NewListing {
  category: ListingCategory;
  title: string;
  description: string;
  price_nzd: number | null;
  price_unit: PriceUnit;
  city: string;
  suburb: string;
  available_from: string | null;
  photos: string[];
}

export async function createListing(input: NewListing): Promise<string> {
  const sb = await client();
  const user = requireUser();
  const { data, error } = await sb.from("listings").insert({ ...input, owner_id: user.id }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function setListingStatus(id: string, status: Listing["status"]): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("listings").update({ status }).eq("id", id);
  if (error) throw error;
}

/** Resizes a photo on the device before upload so posts stay fast on mobile data. */
async function compress(file: File, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.82));
}

export async function uploadPhoto(file: File): Promise<string> {
  const sb = await client();
  const user = requireUser();
  const blob = await compress(file);
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("listing-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return sb.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}

export async function fetchSavedIds(): Promise<Set<string>> {
  const sb = await client();
  const { data } = await sb.from("saved_listings").select("listing_id");
  return new Set((data ?? []).map((r) => r.listing_id as string));
}

export async function toggleSaved(listingId: string, save: boolean): Promise<void> {
  const sb = await client();
  requireUser();
  const { error } = save
    ? await sb.from("saved_listings").insert({ listing_id: listingId })
    : await sb.from("saved_listings").delete().eq("listing_id", listingId);
  if (error) throw error;
}

export async function reportTarget(targetType: "listing" | "message" | "profile", targetId: string, reason: string): Promise<void> {
  const sb = await client();
  requireUser();
  const { error } = await sb.from("reports").insert({ target_type: targetType, target_id: targetId, reason });
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

export async function startConversation(listingId: string): Promise<string> {
  const sb = await client();
  requireUser();
  const { data, error } = await sb.rpc("start_conversation", { p_listing: listingId });
  if (error) throw error;
  return data as string;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const sb = await client();
  const user = requireUser();
  const { data, error } = await sb
    .from("conversations")
    .select("id, listing_id, member_a, member_b, last_message_at, listing:listings(title), a:profiles!conversations_member_a_fkey(display_name), b:profiles!conversations_member_b_fkey(display_name)")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as Conversation & { a: { display_name: string } | null; b: { display_name: string } | null };
    return { ...r, other: r.member_a === user.id ? r.b : r.a };
  });
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const sb = await client();
  const { data, error } = await sb.from("messages").select("*").eq("conversation_id", conversationId).order("created_at").limit(500);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { error } = await sb.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (error) throw error;
}

/** Streams new messages in a conversation. Returns an unsubscribe function. */
export function subscribeMessages(conversationId: string, onMessage: (m: Message) => void): () => void {
  let stop = () => {};
  void getSupabase()?.then((sb) => {
    const channel = sb
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) =>
        onMessage(payload.new as Message),
      )
      .subscribe();
    stop = () => void sb.removeChannel(channel);
  });
  return () => stop();
}

export async function fetchNews(tag?: string): Promise<NewsItem[]> {
  const sb = await client();
  let query = sb.from("news_items").select("*").order("published_at", { ascending: false }).limit(50);
  if (tag && tag !== "all") query = query.contains("tags", [tag]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NewsItem[];
}

export async function refreshNews(): Promise<void> {
  const sb = await client();
  await sb.functions.invoke("fetch-news", { body: {} });
}

// ── Member profile (cloud) ────────────────────────────────────────────────

interface MemberState {
  profile: MemberProfile | null;
  isAdmin: boolean;
  loading: boolean;
}

export const useMember = create<MemberState>(() => ({ profile: null, isAdmin: false, loading: false }));

export async function loadMember(): Promise<void> {
  const user = useAuth.getState().user;
  const sb = await getSupabase();
  if (!sb || !user) {
    useMember.setState({ profile: null, isAdmin: false, loading: false });
    return;
  }
  useMember.setState({ loading: true });
  const [{ data: profile }, { data: admin }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.rpc("is_admin"),
  ]);
  useMember.setState({ profile: (profile as MemberProfile) ?? null, isAdmin: Boolean(admin), loading: false });
}

export type MemberPatch = Partial<
  Pick<MemberProfile, "display_name" | "role" | "country" | "city" | "bio" | "languages" | "situation" | "stage" | "path" | "interests" | "onboarded">
>;

export async function updateMember(patch: MemberPatch): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { data, error } = await sb.from("profiles").update(patch).eq("id", user.id).select("*").single();
  if (error) throw error;
  useMember.setState({ profile: data as MemberProfile });
}

/** Days of full access left in the free first month (0 when it has ended). */
export function trialDaysLeft(profile: Pick<MemberProfile, "plan" | "trial_ends_at"> | null, now = Date.now()): number {
  if (!profile || profile.plan !== "trial") return 0;
  return Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - now) / 86_400_000));
}

export type Access = "full" | "free";

/** Everyone gets every feature during the first month; paid gigs are always paid. */
export function accessLevel(profile: Pick<MemberProfile, "plan" | "trial_ends_at"> | null, now = Date.now()): Access {
  if (!profile) return "free";
  if (profile.plan === "pro") return "full";
  return trialDaysLeft(profile, now) > 0 ? "full" : "free";
}

// ── Admin ────────────────────────────────────────────────────────────────

export interface ReportRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
}

export async function fetchOpenReports(): Promise<ReportRow[]> {
  const sb = await client();
  const { data, error } = await sb.from("reports").select("*").eq("resolved", false).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function fetchHiddenListings(): Promise<Listing[]> {
  const sb = await client();
  const { data, error } = await sb.from("listings").select(LISTING_FIELDS).eq("status", "hidden").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Listing[];
}

export async function resolveReports(targetId: string, listingStatus?: Listing["status"]): Promise<void> {
  const sb = await client();
  if (listingStatus) {
    const { error } = await sb.from("listings").update({ status: listingStatus, report_count: 0 }).eq("id", targetId);
    if (error) throw error;
  }
  const { error } = await sb.from("reports").update({ resolved: true }).eq("target_id", targetId);
  if (error) throw error;
}

// ── Groups & meetups ─────────────────────────────────────────────────────

export interface Group {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "city" | "path" | "interest";
  tags: string[];
  member_count: number;
}

export interface GroupMessage {
  id: number;
  group_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: { display_name: string; verified: boolean } | null;
}

export interface Meetup {
  id: string;
  group_id: string;
  host_id: string;
  title: string;
  description: string;
  starts_at: string;
  online_link: string | null;
  place: string;
}

export async function fetchGroups(): Promise<{ groups: Group[]; joined: Set<string> }> {
  const sb = await client();
  const user = useAuth.getState().user;
  const [{ data, error }, mine] = await Promise.all([
    sb.from("groups").select("*").order("kind").order("member_count", { ascending: false }),
    user ? sb.from("group_members").select("group_id").eq("user_id", user.id) : Promise.resolve({ data: [] as { group_id: string }[] }),
  ]);
  if (error) throw error;
  return { groups: (data ?? []) as Group[], joined: new Set((mine.data ?? []).map((r) => r.group_id as string)) };
}

export async function fetchGroup(slug: string): Promise<Group | null> {
  const sb = await client();
  const { data } = await sb.from("groups").select("*").eq("slug", slug).maybeSingle();
  return (data as Group) ?? null;
}

export async function joinGroup(groupId: string, join = true): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { error } = join
    ? await sb.from("group_members").upsert({ group_id: groupId, user_id: user.id }, { onConflict: "group_id,user_id", ignoreDuplicates: true })
    : await sb.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  if (error) throw error;
}

/** Joins the groups that match a member's answers during onboarding. */
export async function joinGroupsBySlug(slugs: string[]): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { data } = await sb.from("groups").select("id, slug").in("slug", slugs);
  const rows = (data ?? []).map((g) => ({ group_id: g.id as string, user_id: user.id }));
  if (rows.length) await sb.from("group_members").upsert(rows, { onConflict: "group_id,user_id", ignoreDuplicates: true });
}

export async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const sb = await client();
  const { data, error } = await sb
    .from("group_messages")
    .select("id, group_id, sender_id, body, created_at, sender:profiles(display_name, verified)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as GroupMessage[]).reverse();
}

export async function postGroupMessage(groupId: string, body: string): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { error } = await sb.from("group_messages").insert({ group_id: groupId, sender_id: user.id, body });
  if (error) throw error;
}

export function subscribeGroup(groupId: string, onMessage: () => void): () => void {
  let stop = () => {};
  void getSupabase()?.then((sb) => {
    const channel = sb
      .channel(`group:${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` }, () => onMessage())
      .subscribe();
    stop = () => void sb.removeChannel(channel);
  });
  return () => stop();
}

export async function fetchMeetups(groupId: string): Promise<Meetup[]> {
  const sb = await client();
  const { data, error } = await sb.from("meetups").select("*").eq("group_id", groupId).gte("starts_at", new Date(Date.now() - 3 * 3600_000).toISOString()).order("starts_at");
  if (error) throw error;
  return (data ?? []) as Meetup[];
}

export async function createMeetup(input: { group_id: string; title: string; description: string; starts_at: string; place: string; online: boolean }): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const online_link = input.online ? `https://meet.jit.si/KiwiPath-${crypto.randomUUID().slice(0, 13)}` : null;
  const { error } = await sb.from("meetups").insert({
    group_id: input.group_id,
    host_id: user.id,
    title: input.title,
    description: input.description,
    starts_at: input.starts_at,
    place: input.place,
    online_link,
  });
  if (error) throw error;
}

// ── Agencies ─────────────────────────────────────────────────────────────

export interface Agency {
  id: string;
  name: string;
  city: string;
  website: string | null;
  services: string[];
  nz_partners: string[];
  description: string;
  status: "pending" | "approved" | "rejected";
  verified_note: string;
  created_at: string;
}

export async function fetchAgencies(status: Agency["status"] = "approved"): Promise<Agency[]> {
  const sb = await client();
  const { data, error } = await sb.from("agencies").select("*").eq("status", status).order("name");
  if (error) throw error;
  return (data ?? []) as Agency[];
}

export async function suggestAgency(input: Pick<Agency, "name" | "city" | "website" | "services" | "nz_partners" | "description">): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { error } = await sb.from("agencies").insert({ ...input, submitted_by: user.id });
  if (error) throw error;
}

export async function reviewAgency(id: string, status: Agency["status"], note: string): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("agencies").update({ status, verified_note: note }).eq("id", id);
  if (error) throw error;
}

// ── Admin console ────────────────────────────────────────────────────────

export interface AdminMember {
  id: string;
  email: string;
  display_name: string;
  situation: string;
  stage: string;
  path: string;
  city: string;
  role: string;
  plan: string;
  verified: boolean;
  interests: string[];
  onboarded: boolean;
  trial_ends_at: string;
  created_at: string;
  last_sign_in_at: string | null;
  listings: number;
  groups: number;
}

export async function adminMembers(search = ""): Promise<AdminMember[]> {
  const sb = await client();
  const { data, error } = await sb.rpc("admin_list_members", { p_search: search, p_limit: 500 });
  if (error) throw error;
  return (data ?? []) as AdminMember[];
}

export async function adminStats(): Promise<Record<string, number | Record<string, number>>> {
  const sb = await client();
  const { data, error } = await sb.rpc("admin_stats");
  if (error) throw error;
  return data as Record<string, number | Record<string, number>>;
}

export async function adminUpdateMember(id: string, patch: Record<string, unknown>): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export interface Setting {
  key: string;
  value: unknown;
  description: string;
}

export async function fetchSettings(): Promise<Setting[]> {
  const sb = await client();
  const { data, error } = await sb.from("app_settings").select("key, value, description").order("key");
  if (error) throw error;
  return (data ?? []) as Setting[];
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) throw error;
}

export interface PaymentRow {
  id: string;
  user_id: string | null;
  provider: string;
  kind: string;
  amount: number;
  currency: string;
  status: string;
  period_end: string | null;
  created_at: string;
}

export async function fetchPayments(): Promise<PaymentRow[]> {
  const sb = await client();
  const { data, error } = await sb.from("payments").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}
