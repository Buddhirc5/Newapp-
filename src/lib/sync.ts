import { create } from "zustand";
import { freshData, pickData, useApp, type AppData } from "@/store/app";
import { readItem, writeItem } from "./storage";
import { useEffect, useState } from "react";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { getSupabase } from "./supabase";

export interface AuthState {
  ready: boolean;
  user: { id: string; email: string | null; name: string | null; phone: string | null } | null;
  status: "idle" | "syncing" | "synced" | "error";
  lastSyncedAt: string | null;
  error: string | null;
}

export const useAuth = create<AuthState>(() => ({
  ready: !HAS_SUPABASE,
  user: null,
  status: "idle",
  lastSyncedAt: null,
  error: null,
}));

const TABLE = "user_state";

/** Newer copy wins. A sample or brand-new local state never overwrites the cloud. */
export function chooseSource(local: AppData, remote: { state: AppData; updated_at: string } | null): "remote" | "local" | "none" {
  if (!remote) return local.isSample || !local.onboarded ? "none" : "local";
  if (local.isSample || !local.onboarded) return "remote";
  return new Date(remote.updated_at).getTime() > new Date(local.updatedAt).getTime() ? "remote" : "local";
}

// Which account the progress saved in this browser belongs to. Without it, a
// second person signing in on a shared phone could have the first person's
// journey, CV and plans uploaded into their account.
const OWNER_KEY = "kp-data-owner";
export const dataOwner = () => readItem(OWNER_KEY);
const setDataOwner = (id: string) => writeItem(OWNER_KEY, id);

async function pull(userId: string) {
  const sb = await getSupabase();
  if (!sb) return;
  // Progress saved here belongs to a different account: clear it before
  // anything else (even offline), and never merge or upload it.
  const foreign = Boolean(dataOwner()) && dataOwner() !== userId;
  if (foreign) {
    const settings = useApp.getState().settings;
    useApp.getState().replaceData({ ...freshData(), onboarded: useApp.getState().onboarded, settings });
  }
  setDataOwner(userId);
  useAuth.setState({ status: "syncing", error: null });
  const { data, error } = await sb.from(TABLE).select("state, updated_at").eq("user_id", userId).maybeSingle();
  if (error) {
    useAuth.setState({ status: "error", error: error.message });
    return;
  }
  const local = pickData(useApp.getState());
  if (foreign) {
    if (data) useApp.getState().replaceData({ ...(data.state as AppData), settings: local.settings });
    useAuth.setState({ status: data ? "synced" : "idle", lastSyncedAt: data ? new Date().toISOString() : null });
    return;
  }
  const source = chooseSource(local, data as { state: AppData; updated_at: string } | null);
  if (source === "remote" && data) {
    useApp.getState().replaceData({ ...(data.state as AppData), settings: local.settings });
    useAuth.setState({ status: "synced", lastSyncedAt: new Date().toISOString() });
  } else if (source === "local") {
    await push(userId);
  } else {
    useAuth.setState({ status: "idle" });
  }
}

async function push(userId: string) {
  const sb = await getSupabase();
  if (!sb) return;
  const state = pickData(useApp.getState());
  // Only upload progress that belongs to this account (see dataOwner).
  if (state.isSample || dataOwner() !== userId) return;
  useAuth.setState({ status: "syncing" });
  const { error } = await sb.from(TABLE).upsert({ user_id: userId, state, updated_at: state.updatedAt });
  useAuth.setState(error ? { status: "error", error: error.message } : { status: "synced", lastSyncedAt: new Date().toISOString(), error: null });
}

/** Starts auth listening and background sync. Returns a cleanup function. */
export function startSync(): () => void {
  const promise = getSupabase();
  if (!promise) return () => {};
  let timer: number | undefined;
  let stopAuth: (() => void) | undefined;
  let stopStore: (() => void) | undefined;
  let cancelled = false;

  promise.then(async (sb) => {
    if (cancelled) return;
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    useAuth.setState({ ready: true, user: user ? toAuthUser(user) : null });
    if (user) await pull(user.id);

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const next = session?.user;
      useAuth.setState({ user: next ? toAuthUser(next) : null });
      if (event === "SIGNED_IN" && next) void pull(next.id);
      if (event === "SIGNED_OUT") useAuth.setState({ status: "idle", lastSyncedAt: null });
    });
    stopAuth = () => sub.subscription.unsubscribe();

    stopStore = useApp.subscribe((state, prev) => {
      if (state.updatedAt === prev.updatedAt) return;
      const current = useAuth.getState().user;
      if (!current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void push(current.id), 1500);
    });
  });

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    stopAuth?.();
    stopStore?.();
  };
}

export async function sendSignInCode(email: string, captchaToken?: string): Promise<{ ok: boolean; message?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Cloud sync isn't set up for this app yet." };
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true, captchaToken: captchaToken || undefined } });
  return error ? { ok: false, message: error.message } : { ok: true };
}

const SIGN_IN_KEY = "kp-just-signed-in";

/** Marks that a sign-in is under way, so admins land in the admin console afterwards. */
export function markSignIn() {
  try {
    sessionStorage.setItem(SIGN_IN_KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
}

/** True once, right after a sign-in started in the last 10 minutes. */
export function takeSignIn(): boolean {
  try {
    const at = Number(sessionStorage.getItem(SIGN_IN_KEY));
    sessionStorage.removeItem(SIGN_IN_KEY);
    return at > Date.now() - 10 * 60_000;
  } catch {
    return false;
  }
}

export async function verifySignInCode(email: string, token: string): Promise<{ ok: boolean; message?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Cloud sync isn't set up for this app yet." };
  markSignIn();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  return error ? { ok: false, message: error.message } : { ok: true };
}

/** Signs out here, or on every device when `everywhere` is true. */
export async function signOut(everywhere = false): Promise<void> {
  const sb = await getSupabase();
  await sb?.auth.signOut({ scope: everywhere ? "global" : "local" });
}

/** Google sign-in through Supabase. Returns to the page the person started on. */
export async function signInWithGoogle(next = "/start"): Promise<{ ok: boolean; message?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Sign-in isn't available in this version." };
  markSignIn();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${next}`, queryParams: { prompt: "select_account" } },
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function signInWithPassword(email: string, password: string, captchaToken?: string): Promise<{ ok: boolean; message?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Sign-in isn't available in this version." };
  const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } });
  return error ? { ok: false, message: error.message } : { ok: true };
}

let googlePromise: Promise<boolean> | null = null;

/** Asks Supabase which sign-in methods are switched on, so the Google button only shows when it works. */
export function googleEnabled(): Promise<boolean> {
  if (!HAS_SUPABASE) return Promise.resolve(false);
  googlePromise ??= fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { external?: { google?: boolean } } | null) => Boolean(d?.external?.google))
    .catch(() => false);
  return googlePromise;
}

export function useGoogleEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let active = true;
    void googleEnabled().then((v) => active && setOn(v));
    return () => {
      active = false;
    };
  }, []);
  return on;
}

function toAuthUser(u: { id: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> }) {
  const meta = u.user_metadata ?? {};
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
  return { id: u.id, email: u.email ?? null, name, phone: u.phone || null };
}
