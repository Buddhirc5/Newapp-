import { getSupabase } from "@/lib/supabase";

/**
 * Remembers where a visitor first came from (a Facebook group link, WhatsApp,
 * Google...), so admins can see which posts bring sign-ups. First visit wins.
 */
const KEY = "kp-first-touch";

interface Touch {
  source: string;
  campaign: string;
  referrer: string;
}

function guessSource(referrer: string): string {
  if (!referrer) return "direct";
  if (/facebook|fb\.|messenger/.test(referrer)) return "facebook";
  if (/whatsapp|wa\.me/.test(referrer)) return "whatsapp";
  if (/google\./.test(referrer)) return "google";
  if (/instagram/.test(referrer)) return "instagram";
  if (/tiktok/.test(referrer)) return "tiktok";
  if (/youtube/.test(referrer)) return "youtube";
  if (/linkedin/.test(referrer)) return "linkedin";
  if (/bing\.|duckduckgo|yahoo/.test(referrer)) return "search";
  return referrer;
}

/** Call once on load. Keeps the first source seen in this browser. */
export function captureFirstTouch() {
  try {
    if (localStorage.getItem(KEY)) return;
    const q = new URLSearchParams(location.search);
    let referrer = "";
    try {
      const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      referrer = host && host !== location.hostname.replace(/^www\./, "") ? host : "";
    } catch {
      /* bad referrer */
    }
    // Facebook adds ?fbclid= to every outbound link.
    const source = q.get("utm_source") || q.get("ref") || (q.has("fbclid") ? "facebook" : guessSource(referrer));
    const touch: Touch = { source: source.slice(0, 60), campaign: (q.get("utm_campaign") ?? "").slice(0, 80), referrer: referrer.slice(0, 120) };
    localStorage.setItem(KEY, JSON.stringify(touch));
  } catch {
    /* storage blocked */
  }
}

/** Saves the first-touch source on the member's profile (only the first time). */
export async function saveSignupSource() {
  try {
    const raw = localStorage.getItem(KEY);
    const t: Touch = raw ? JSON.parse(raw) : { source: "direct", campaign: "", referrer: "" };
    const sb = await getSupabase();
    await sb?.rpc("set_signup_source", { p_source: t.source, p_campaign: t.campaign, p_referrer: t.referrer });
  } catch {
    /* not critical */
  }
}
