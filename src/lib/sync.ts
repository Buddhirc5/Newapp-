import { create } from "zustand";
import { pickData, useApp, type AppData } from "@/store/app";
import { HAS_SUPABASE } from "./env";
import { getSupabase } from "./supabase";

export interface AuthState {
  ready: boolean;
  user: { id: string; email: string | null } | null;
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

async function pull(userId: string) {
  const sb = await getSupabase();
  if (!sb) return;
  useAuth.setState({ status: "syncing", error: null });
  const { data, error } = await sb.from(TABLE).select("state, updated_at").eq("user_id", userId).maybeSingle();
  if (error) {
    useAuth.setState({ status: "error", error: error.message });
    return;
  }
  const local = pickData(useApp.getState());
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
  if (state.isSample) return;
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
    useAuth.setState({ ready: true, user: user ? { id: user.id, email: user.email ?? null } : null });
    if (user) await pull(user.id);

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const next = session?.user;
      useAuth.setState({ user: next ? { id: next.id, email: next.email ?? null } : null });
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

export async function sendSignInCode(email: string): Promise<{ ok: boolean; message?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Cloud sync isn't set up for this app yet." };
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function verifySignInCode(email: string, token: string): Promise<{ ok: boolean; message?: string }> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Cloud sync isn't set up for this app yet." };
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase();
  await sb?.auth.signOut();
}
