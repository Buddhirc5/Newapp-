import { IS_PREVIEW } from "./env";

/** Copies text, falling back to a hidden textarea when the async clipboard is refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

interface DownloadsApi {
  save(file: { filename: string; data: string | Blob }): Promise<unknown>;
}

interface ClaudeHost {
  use?: (name: string) => Promise<unknown>;
}

export type SaveOutcome = "saved" | "declined" | "unavailable";

/** Saves a generated file. In the embedded preview the viewer confirms the save first. */
export async function saveFile(filename: string, data: string, mime = "text/plain"): Promise<SaveOutcome> {
  if (IS_PREVIEW) {
    try {
      const host = (window as unknown as { claude?: ClaudeHost }).claude;
      const downloads = (await host?.use?.("downloads")) as DownloadsApi | null | undefined;
      if (!downloads) return "unavailable";
      await downloads.save({ filename, data: new Blob([data], { type: mime }) });
      return "saved";
    } catch (e) {
      const code = (e as { code?: string })?.code;
      return code === "declined" || code === "rate_limited" ? "declined" : "unavailable";
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "saved";
  } catch {
    return "unavailable";
  }
}

/** Printing (and Save as PDF) is unavailable inside the embedded preview. */
export const CAN_PRINT = !IS_PREVIEW;
