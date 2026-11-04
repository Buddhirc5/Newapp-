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

export async function updateMember(patch: Partial<Pick<MemberProfile, "display_name" | "role" | "country" | "city" | "bio" | "languages">>): Promise<void> {
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
