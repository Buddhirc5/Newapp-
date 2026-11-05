import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile CAPTCHA, shown only when VITE_TURNSTILE_SITE_KEY is set
 * (and CAPTCHA is switched on in Supabase → Authentication → Attack protection).
 * Calls onToken with a fresh token, or "" when it expires.
 */
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}

let loader: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve((window as unknown as { turnstile: TurnstileApi }).turnstile);
    s.onerror = () => reject(new Error("CAPTCHA couldn't load"));
    document.head.appendChild(s);
  });
  return loader;
}

export function Captcha({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    let api: TurnstileApi | null = null;
    let cancelled = false;
    loadTurnstile().then(
      (t) => {
        if (cancelled || !box.current) return;
        api = t;
        id.current = t.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => cb.current(token),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      },
      () => cb.current(""),
    );
    return () => {
      cancelled = true;
      if (api && id.current) api.remove(id.current);
    };
  }, []);

  useEffect(() => {
    if (resetKey && id.current) loader?.then((t) => t.reset(id.current!));
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
