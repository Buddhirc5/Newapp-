import { describe, expect, it } from "vitest";
import { accessLevel, trialDaysLeft } from "./community";

const now = Date.parse("2026-11-04T00:00:00Z");
const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();

describe("free first month", () => {
  it("counts trial days left", () => {
    expect(trialDaysLeft({ plan: "trial", trial_ends_at: inDays(30) }, now)).toBe(30);
    expect(trialDaysLeft({ plan: "trial", trial_ends_at: inDays(-1) }, now)).toBe(0);
    expect(trialDaysLeft(null, now)).toBe(0);
  });

  it("unlocks everything during the trial and for Pro", () => {
    expect(accessLevel({ plan: "trial", trial_ends_at: inDays(3) }, now)).toBe("full");
    expect(accessLevel({ plan: "trial", trial_ends_at: inDays(-3) }, now)).toBe("free");
    expect(accessLevel({ plan: "pro", trial_ends_at: inDays(-90) }, now)).toBe("full");
    expect(accessLevel({ plan: "free", trial_ends_at: inDays(10) }, now)).toBe("free");
  });
});
