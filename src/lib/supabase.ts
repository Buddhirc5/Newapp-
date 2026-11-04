import type { SupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { readItem, removeItem, writeItem } from "./storage";

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Lazily loads supabase-js only when the project is configured, so local mode
 * (and the preview) never download it.
 */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!HAS_SUPABASE) return null;
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: { getItem: readItem, setItem: writeItem, removeItem },
      },
    }),
  );
  return clientPromise;
}
