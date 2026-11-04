import { describe, expect, it } from "vitest";
import { freshData, sampleData } from "@/store/app";
import { chooseSource } from "./sync";

const local = { ...freshData(), onboarded: true, updatedAt: "2026-11-04T10:00:00.000Z" };

describe("chooseSource", () => {
  it("uploads local progress when the cloud is empty", () => {
    expect(chooseSource(local, null)).toBe("local");
  });

  it("never uploads the sample journey or an empty profile", () => {
    expect(chooseSource(sampleData(), null)).toBe("none");
    expect(chooseSource(freshData(), null)).toBe("none");
  });

  it("prefers the cloud copy over a sample or new device", () => {
    expect(chooseSource(sampleData(), { state: local, updated_at: "2026-01-01T00:00:00.000Z" })).toBe("remote");
  });

  it("keeps whichever copy is newer", () => {
    expect(chooseSource(local, { state: local, updated_at: "2026-11-05T00:00:00.000Z" })).toBe("remote");
    expect(chooseSource(local, { state: local, updated_at: "2026-11-01T00:00:00.000Z" })).toBe("local");
  });
});
