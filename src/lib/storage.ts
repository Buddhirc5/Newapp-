import type { StateStorage } from "zustand/middleware";

/**
 * localStorage can be missing or throw (private windows, blocked site data,
 * embedded previews). Every access goes through these guarded helpers so the
 * app keeps working in memory when storage is unavailable.
 */
const memory = new Map<string, string>();

function local(): Storage | null {
  try {
    const store = globalThis.localStorage;
    const probe = "__kp_probe__";
    store.setItem(probe, probe);
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export function readItem(key: string): string | null {
  try {
    const store = local();
    if (store) return store.getItem(key);
  } catch {
    /* fall through to memory */
  }
  return memory.get(key) ?? null;
}

export function writeItem(key: string, value: string): void {
  memory.set(key, value);
  try {
    local()?.setItem(key, value);
  } catch {
    /* quota or access errors: the in-memory copy still works for this session */
  }
}

export function removeItem(key: string): void {
  memory.delete(key);
  try {
    local()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeItem(key, JSON.stringify(value));
}

export const safeStateStorage: StateStorage = {
  getItem: (name) => readItem(name),
  setItem: (name, value) => writeItem(name, value),
  removeItem: (name) => removeItem(name),
};
