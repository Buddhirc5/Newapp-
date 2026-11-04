import { useEffect, useState } from "react";
import { IS_PREVIEW } from "./env";
import { readJson, writeJson } from "./storage";

export interface Rate {
  /** Sri Lankan rupees for one New Zealand dollar. */
  lkrPerNzd: number;
  /** ISO date the rate was published. */
  asOf: string;
  live: boolean;
}

/** Used offline and before the first fetch. Mid-market rate on 4 Nov 2026. */
export const FALLBACK_RATE: Rate = { lkrPerNzd: 186.96, asOf: "2026-11-04", live: false };

const CACHE_KEY = "kp-rate-v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
// Free, keyless and CORS-enabled. Updates once a day.
const ENDPOINT = "https://open.er-api.com/v6/latest/NZD";

interface Cached extends Rate {
  fetchedAt: number;
}

let inflight: Promise<Rate> | null = null;

export async function fetchRate(signal?: AbortSignal): Promise<Rate> {
  const cached = readJson<Cached>(CACHE_KEY);
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return { ...cached, live: true };
  if (IS_PREVIEW || typeof fetch === "undefined") return cached ?? FALLBACK_RATE;

  inflight ??= (async () => {
    try {
      const timeout = AbortSignal.timeout?.(6000);
      const res = await fetch(ENDPOINT, { signal: signal ?? timeout });
      if (!res.ok) throw new Error(`Rate request failed: ${res.status}`);
      const body = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
      const lkr = body.rates?.LKR;
      if (body.result !== "success" || typeof lkr !== "number" || !Number.isFinite(lkr) || lkr <= 0) {
        throw new Error("Rate response did not include LKR");
      }
      const asOf = body.time_last_update_unix
        ? new Date(body.time_last_update_unix * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const rate: Cached = { lkrPerNzd: lkr, asOf, live: true, fetchedAt: Date.now() };
      writeJson(CACHE_KEY, rate);
      return rate;
    } catch {
      return cached ? { ...cached, live: false } : FALLBACK_RATE;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Current NZD→LKR rate. Starts from the cached or fallback value and refreshes in the background. */
export function useRate(): Rate {
  const [rate, setRate] = useState<Rate>(() => {
    const cached = readJson<Cached>(CACHE_KEY);
    return cached ? { ...cached, live: Date.now() - cached.fetchedAt < MAX_AGE_MS } : FALLBACK_RATE;
  });
  useEffect(() => {
    let active = true;
    fetchRate().then((next) => {
      if (active) setRate(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return rate;
}
