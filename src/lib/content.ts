import { create } from "zustand";
import { PATHWAYS } from "@/data/pathways";
import type { PathId, Pathway } from "@/types";
import { getSupabase } from "./supabase";

interface ContentState {
  pathways: Record<PathId, Pathway>;
  list: Pathway[];
  source: "bundled" | "remote";
}

const bundled = Object.fromEntries(PATHWAYS.map((p) => [p.id, p])) as Record<PathId, Pathway>;

/**
 * Pathway content ships with the app and can be corrected from the `pathways`
 * table in Supabase without a new release. Remote rows replace bundled ones only
 * when they have the expected shape.
 */
export const useContent = create<ContentState>(() => ({ pathways: bundled, list: PATHWAYS, source: "bundled" }));

export const usePathways = () => useContent((s) => s.pathways);
export const usePathwayList = () => useContent((s) => s.list);

function isPathway(value: unknown, id: string): value is Pathway {
  const p = value as Partial<Pathway> | null;
  return Boolean(
    p &&
      p.id === id &&
      typeof p.name === "string" &&
      Array.isArray(p.levels) &&
      p.levels.every((l) => Array.isArray(l?.tasks) && l.tasks.every((t) => typeof t?.id === "string" && typeof t?.title === "string")),
  );
}

export async function loadRemoteContent(): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { data, error } = await sb.from("pathways").select("id, content");
  if (error || !data?.length) return;
  const next = { ...bundled };
  for (const row of data as { id: string; content: unknown }[]) {
    if (row.id in next && isPathway(row.content, row.id)) next[row.id as PathId] = row.content;
  }
  useContent.setState({ pathways: next, list: PATHWAYS.map((p) => next[p.id]), source: "remote" });
}
