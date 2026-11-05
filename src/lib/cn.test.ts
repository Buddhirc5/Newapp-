import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("lets later colours and backgrounds win", () => {
    expect(cn("rounded-card bg-surface p-4 shadow-card", "bg-night p-5 text-paper")).toBe("rounded-card shadow-card bg-night p-5 text-paper");
  });
  it("keeps font sizes and colours apart", () => {
    expect(cn("text-subhead text-label-2", "text-paper")).toBe("text-subhead text-paper");
    expect(cn("text-body text-label", "text-headline")).toBe("text-label text-headline");
  });
  it("keeps custom radius and shadow tokens", () => {
    expect(cn("rounded-tile shadow-card", "rounded-full")).toBe("shadow-card rounded-full");
  });
});
