/** Built with `--mode preview`: a self-contained demo with in-memory routing and no network services. */
export const IS_PREVIEW = import.meta.env.MODE === "preview";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const SUPABASE_URL = url ?? "";
export const SUPABASE_ANON_KEY = key ?? "";

/** Supabase is optional. Without keys the app runs in local mode and saves to this browser only. */
export const HAS_SUPABASE = Boolean(url && key) && !IS_PREVIEW;
