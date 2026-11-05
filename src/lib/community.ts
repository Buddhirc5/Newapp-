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
  plan: "trial" | "free" | "pro" | "ultra";
  trial_ends_at: string;
  plan_ends_at?: string | null;
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
  // Admins can read removed stories; keep them out of the public feed.
  return ((data ?? []) as (NewsItem & { hidden?: boolean })[]).filter((n) => !n.hidden);
}

export async function refreshNews(): Promise<number> {
  const sb = await client();
  const { data, error } = await sb.functions.invoke("fetch-news", { body: {} });
  if (error) throw error;
  return Number((data as { saved?: number } | null)?.saved ?? 0);
}

/** Admins: every recent story, including removed ones. */
export async function adminNews(): Promise<(NewsItem & { hidden: boolean })[]> {
  const sb = await client();
  const { data, error } = await sb.from("news_items").select("*").order("published_at", { ascending: false }).limit(80);
  if (error) throw error;
  return (data ?? []) as (NewsItem & { hidden: boolean })[];
}

export async function setNewsHidden(id: number, hidden: boolean): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("news_items").update({ hidden }).eq("id", id);
  if (error) throw error;
}

// ── Member profile (cloud) ────────────────────────────────────────────────

interface MemberState {
  profile: MemberProfile | null;
  isAdmin: boolean;
  loading: boolean;
  /** The account this profile and admin flag were loaded for. */
  userId: string | null;
}

export const useMember = create<MemberState>(() => ({ profile: null, isAdmin: false, loading: false, userId: null }));

// When the signed-in account changes, forget the previous account's profile and
// admin flag immediately (in the same update), so no screen can render with
// someone else's permissions while the new ones load.
useAuth.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) useMember.setState({ profile: null, isAdmin: false, loading: Boolean(state.user), userId: null });
});

export async function loadMember(): Promise<void> {
  const user = useAuth.getState().user;
  const sb = await getSupabase();
  if (!sb || !user) {
    useMember.setState({ profile: null, isAdmin: false, loading: false, userId: null });
    return;
  }
  useMember.setState({ loading: true });
  const [{ data: profile }, adminRes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    // Admin list membership only; real admin rights also need the authenticator step.
    sb.rpc("is_admin_account"),
  ]);
  // Older databases without is_admin_account() fall back to is_admin().
  const admin = adminRes.error ? (await sb.rpc("is_admin")).data : adminRes.data;
  // Ignore the answer if someone else signed in while it was loading.
  if (useAuth.getState().user?.id !== user.id) return;
  useMember.setState({ profile: (profile as MemberProfile) ?? null, isAdmin: Boolean(admin), loading: false, userId: user.id });
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
export function accessLevel(profile: Pick<MemberProfile, "plan" | "trial_ends_at" | "plan_ends_at"> | null, now = Date.now()): Access {
  if (!profile) return "free";
  if (profile.plan === "pro" || profile.plan === "ultra") {
    // Same 3-day renewal grace as the database's effective_plan().
    return !profile.plan_ends_at || new Date(profile.plan_ends_at).getTime() + 3 * 86_400_000 > now ? "full" : "free";
  }
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

// ── Gigs, bookings and providers ─────────────────────────────────────────

export type GigCategory = "visa" | "legal" | "education" | "career" | "settling" | "mentoring";

export interface Gig {
  id: string;
  provider_id: string;
  category: GigCategory;
  title: string;
  description: string;
  price_lkr: number;
  duration_min: number;
  mode: "video" | "chat" | "in_person";
  active: boolean;
  created_at: string;
  provider?: { display_name: string; verified: boolean; role: string; city: string; bio: string } | null;
}

export interface GigOrder {
  id: string;
  gig_id: string;
  buyer_id: string;
  provider_id: string | null;
  slot: string;
  note: string;
  amount_lkr: number;
  platform_fee_lkr: number;
  meeting_link: string | null;
  status: "requested" | "accepted" | "declined" | "paid" | "completed" | "cancelled";
  created_at: string;
  gig?: { title: string; duration_min: number; mode: string } | null;
  buyer?: { display_name: string } | null;
  provider?: { display_name: string } | null;
}

const GIG_FIELDS = "*, provider:profiles(display_name, verified, role, city, bio)";

export async function fetchGigs(category: GigCategory | "all" = "all"): Promise<Gig[]> {
  const sb = await client();
  let q = sb.from("gigs").select(GIG_FIELDS).eq("active", true).order("created_at", { ascending: false }).limit(100);
  if (category !== "all") q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Gig[];
}

export async function fetchGig(id: string): Promise<Gig | null> {
  const sb = await client();
  const { data } = await sb.from("gigs").select(GIG_FIELDS).eq("id", id).maybeSingle();
  return (data as unknown as Gig) ?? null;
}

export async function fetchMyGigs(): Promise<Gig[]> {
  const sb = await client();
  const user = requireUser();
  const { data, error } = await sb.from("gigs").select(GIG_FIELDS).eq("provider_id", user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Gig[];
}

export async function saveGig(gig: Pick<Gig, "category" | "title" | "description" | "price_lkr" | "duration_min" | "mode"> & { id?: string; active?: boolean }): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { id, ...rest } = gig;
  const { error } = id ? await sb.from("gigs").update(rest).eq("id", id) : await sb.from("gigs").insert({ ...rest, provider_id: user.id });
  if (error) throw new Error(/row-level security/i.test(error.message) ? "Visa and legal sessions are for verified providers. Apply below to get verified." : error.message);
}

export async function bookGig(gigId: string, slotIso: string, note: string): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { error } = await sb.from("gig_orders").insert({ gig_id: gigId, buyer_id: user.id, slot: slotIso, note });
  if (error) throw error;
}

const ORDER_FIELDS = "*, gig:gigs(title, duration_min, mode), buyer:profiles!gig_orders_buyer_id_fkey(display_name), provider:profiles!gig_orders_provider_id_fkey(display_name)";

export async function fetchMyOrders(): Promise<{ buying: GigOrder[]; selling: GigOrder[] }> {
  const sb = await client();
  const user = requireUser();
  const { data, error } = await sb.from("gig_orders").select(ORDER_FIELDS).order("slot", { ascending: true }).limit(200);
  if (error) throw error;
  const rows = (data ?? []) as unknown as GigOrder[];
  return { buying: rows.filter((r) => r.buyer_id === user.id), selling: rows.filter((r) => r.provider_id === user.id) };
}

export async function adminOrders(): Promise<GigOrder[]> {
  const sb = await client();
  const { data, error } = await sb.from("gig_orders").select(ORDER_FIELDS).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as GigOrder[];
}

export async function setOrderStatus(id: string, status: GigOrder["status"]): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("gig_orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export interface ProviderApplication {
  id: string;
  user_id: string;
  kind: "lawyer" | "adviser" | "consultant" | "agent";
  full_name: string;
  licence_number: string;
  licence_body: string;
  website: string | null;
  bio: string;
  status: "pending" | "approved" | "rejected";
  review_note: string;
  created_at: string;
}

export async function applyAsProvider(app: Pick<ProviderApplication, "kind" | "full_name" | "licence_number" | "licence_body" | "website" | "bio">): Promise<void> {
  const sb = await client();
  const user = requireUser();
  const { error } = await sb.from("provider_applications").insert({ ...app, user_id: user.id });
  if (error) throw error;
}

export async function fetchMyApplications(): Promise<ProviderApplication[]> {
  const sb = await client();
  const { data } = await sb.from("provider_applications").select("*").order("created_at", { ascending: false });
  return (data ?? []) as ProviderApplication[];
}

export async function fetchPendingApplications(): Promise<ProviderApplication[]> {
  const sb = await client();
  const { data, error } = await sb.from("provider_applications").select("*").eq("status", "pending").order("created_at");
  if (error) throw error;
  return (data ?? []) as ProviderApplication[];
}

export async function reviewApplication(id: string, status: "approved" | "rejected", note: string): Promise<void> {
  const sb = await client();
  const { error } = await sb.from("provider_applications").update({ status, review_note: note }).eq("id", id);
  if (error) throw error;
}

// ── AI document checks ───────────────────────────────────────────────────

export interface DocReview {
  document_type: string;
  readable: boolean;
  summary: string;
  fields: { label: string; value: string }[];
  issues: { severity: "fix" | "improve" | "ok"; title: string; detail: string }[];
  next_steps: string[];
}

export async function aiChecksEnabled(): Promise<boolean> {
  const sb = await client();
  const { data } = await sb.from("app_settings").select("value").eq("key", "ai_enabled").maybeSingle();
  return data?.value === true;
}

export async function analyzeDocument(file: File, docType: string): Promise<{ result: DocReview; remaining: number }> {
  const sb = await client();
  const user = requireUser();
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/check-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await sb.storage.from("documents").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (upErr) throw upErr;
  const { data, error } = await sb.functions.invoke("analyze-document", { body: { path, docType, fileName: file.name } });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error((body as { error?: string } | null)?.error ?? "The check couldn't run. Try again.");
  }
  return data as { result: DocReview; remaining: number };
}

export async function fetchDocReviews(): Promise<{ id: string; doc_type: string; file_name: string; result: DocReview; created_at: string }[]> {
  const sb = await client();
  const { data } = await sb.from("document_reviews").select("*").order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as { id: string; doc_type: string; file_name: string; result: DocReview; created_at: string }[];
}

// ── Packages, AI help and checkout ───────────────────────────────────────

export type PaidPlan = "pro" | "ultra";

export const PLAN_NAME: Record<MemberProfile["plan"], string> = { trial: "Free month", free: "Free", pro: "Main", ultra: "Ultra" };

export interface AiQuota {
  plan: MemberProfile["plan"];
  limit: number;
  used: number;
  enabled: boolean;
}

export async function aiQuota(): Promise<AiQuota> {
  const sb = await client();
  requireUser();
  const { data, error } = await sb.rpc("my_ai_quota");
  if (error) throw error;
  return data as AiQuota;
}

export interface Packages {
  mainPrice: number;
  ultraPrice: number;
  mainYearly: number;
  ultraYearly: number;
  mainLimit: number;
  ultraLimit: number;
  paymentsEnabled: boolean;
}

export async function fetchPackages(): Promise<Packages> {
  const sb = await client();
  const { data } = await sb
    .from("app_settings")
    .select("key, value")
    .in("key", ["main_price_lkr", "ultra_price_lkr", "main_yearly_price_lkr", "ultra_yearly_price_lkr", "ai_daily_limit_pro", "ai_daily_limit_ultra", "payments_enabled"]);
  const get = (k: string, d: number) => Number(data?.find((r) => r.key === k)?.value ?? d);
  return {
    mainPrice: get("main_price_lkr", 1990),
    ultraPrice: get("ultra_price_lkr", 5990),
    mainYearly: get("main_yearly_price_lkr", 19900),
    ultraYearly: get("ultra_yearly_price_lkr", 59900),
    mainLimit: get("ai_daily_limit_pro", 15),
    ultraLimit: get("ai_daily_limit_ultra", 60),
    paymentsEnabled: data?.find((r) => r.key === "payments_enabled")?.value === true,
  };
}

/** An error from an Edge Function, with whether upgrading would help. */
export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly upgrade = false,
  ) {
    super(message);
  }
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const sb = await client();
  requireUser();
  const { data, error } = await sb.functions.invoke(fn, { body });
  if (error) {
    const payload = (await (error as { context?: Response }).context?.json?.().catch(() => null)) as { error?: string; upgrade?: boolean } | null;
    throw new AiRequestError(payload?.error ?? "That didn't work. Try again.", Boolean(payload?.upgrade));
  }
  return data as T;
}

export interface CvPolish {
  summary: string;
  skills: string[];
  experience: { id: string; bullets: string[] }[];
  tips: string[];
}

export interface JourneyInsight {
  headline: string;
  next_steps: { title: string; why: string }[];
  risks: string[];
  encouragement: string;
}

export const polishCv = (cv: unknown, target: string) => invoke<{ result: CvPolish; remaining: number }>("ai-assist", { kind: "cv", cv, target });
export const writeSop = (sop: unknown) => invoke<{ result: { draft: string; tips: string[] }; remaining: number }>("ai-assist", { kind: "sop", sop });
export const reviewJourney = () => invoke<{ result: JourneyInsight; remaining: number }>("ai-assist", { kind: "journey" });

export interface AssistantAction {
  type: "set_target_month" | "set_city" | "set_path" | "set_doc_status" | "set_doc_date" | "complete_task" | "open";
  target: string;
  value: string;
  label: string;
}
export interface ChatReply {
  answer: string;
  links: { title: string; url: string }[];
  follow_ups: string[];
  actions?: AssistantAction[];
}
export const askAssistant = (messages: { role: "user" | "assistant"; text: string }[], app: Record<string, string>) =>
  invoke<{ result: ChatReply; remaining: number }>("ai-assist", { kind: "chat", messages, app });

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  url: string;
  salaryMin: number | null;
  salaryMax: number | null;
  contract: string;
  created: string;
  sponsor: boolean;
}
export const fetchJobs = (what: string, where: string, sponsor: boolean, page = 1) =>
  invoke<{ configured: boolean; jobs: Job[]; total?: number; error?: string }>("fetch-jobs", { what, where, sponsor, page });

export async function latestInsight(): Promise<{ insight: JourneyInsight; created_at: string; source: string } | null> {
  const sb = await client();
  const user = requireUser();
  const { data } = await sb.from("journey_insights").select("insight, created_at, source").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as { insight: JourneyInsight; created_at: string; source: string } | null) ?? null;
}

/** Starts a PayHere checkout: posts the signed fields to PayHere's hosted payment page. */
export async function startCheckout(plan: PaidPlan, phone: string, city: string, billing: "month" | "year" = "month"): Promise<void> {
  const res = await invoke<{ action: string; fields: Record<string, string> }>("payhere-checkout", { plan, billing, phone, city, returnUrl: window.location.href });
  const form = document.createElement("form");
  form.method = "POST";
  form.action = res.action;
  for (const [name, value] of Object.entries(res.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

// ── Security (admins) ────────────────────────────────────────────────────

export interface AuditRow {
  id: number;
  actor: string | null;
  actor_email?: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
}

export async function fetchAudit(): Promise<AuditRow[]> {
  const sb = await client();
  const { data, error } = await sb.from("admin_audit").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}

export interface PaymentEventRow {
  id: number;
  order_ref: string | null;
  status_code: string | null;
  accepted: boolean;
  reason: string;
  created_at: string;
}

export async function fetchPaymentEvents(): Promise<PaymentEventRow[]> {
  const sb = await client();
  const { data, error } = await sb.from("payment_events").select("id, order_ref, status_code, accepted, reason, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as PaymentEventRow[];
}

/** Permanently deletes the signed-in member's account and data. */
export async function deleteMyAccount(): Promise<void> {
  const sb = await client();
  requireUser();
  const { error } = await sb.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
  if (error) {
    const payload = (await (error as { context?: Response }).context?.json?.().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Couldn't delete the account. Try again.");
  }
  await sb.auth.signOut({ scope: "local" });
}

export interface MyPayment {
  id: string;
  receipt_no: number;
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

/** The signed-in member's successful charges, newest first. */
export async function fetchMyReceipts(): Promise<MyPayment[]> {
  const sb = await client();
  requireUser();
  const { data, error } = await sb
    .from("payments")
    .select("id, receipt_no, provider, provider_ref, kind, plan, amount, currency, status, period_end, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  // PayHere: the checkout row and each charge row are both "paid"; receipts are per charge.
  return ((data ?? []) as MyPayment[]).filter((p) => p.provider !== "payhere" || (p.provider_ref ?? "").startsWith("pay:"));
}
