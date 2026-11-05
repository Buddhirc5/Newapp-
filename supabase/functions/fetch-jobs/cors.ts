// Origin allow-list for KiwiPath Edge Functions that browsers call.
// Source of truth: supabase/functions/_shared/cors.ts (copied by `npm run sync:functions`).

// Browsers may call these functions only from KiwiPath itself (kiwipath.space, plus the old vercel.app address while it redirects) (and localhost
// while developing). Extra origins, such as a custom domain or a Vercel preview,
// can be added as a comma-separated list in the ALLOWED_ORIGINS secret. A
// pattern like *.vercel.app would let anyone's Vercel project in.
const ORIGIN_RE = /^https:\/\/(www\.)?kiwipath\.space$|^https:\/\/kiwipath-nz\.vercel\.app$|^http:\/\/localhost:\d+$/;

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return ORIGIN_RE.test(origin) || extra.includes(origin) ? origin : null;
}

/** Wraps a handler with an origin allow-list (CORS) and preflight handling. */
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const origin = allowedOrigin(req.headers.get("origin"));
    const cors: Record<string, string> = {
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
      "access-control-allow-methods": "POST, OPTIONS",
      vary: "Origin",
    };
    if (origin) cors["access-control-allow-origin"] = origin;
    if (req.method === "OPTIONS") return new Response(origin ? "ok" : "forbidden", { status: origin ? 200 : 403, headers: cors });
    // A browser on another site gets no answer it can read, and nothing runs.
    if (req.headers.get("origin") && !origin) return new Response(JSON.stringify({ error: "Not allowed from this site." }), { status: 403, headers: cors });
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  };
}
