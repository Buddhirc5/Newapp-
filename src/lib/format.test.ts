import { describe, expect, it } from "vitest";
import { aucklandLeadHours, formatClock, formatLkr, formatNzd, lkrSpoken, timeIn, zonedTime, ZONES } from "./format";

describe("format", () => {
  it("formats currencies", () => {
    expect(formatNzd(12400)).toBe("NZ$12,400");
    expect(formatNzd(-50)).toBe("-NZ$50");
    expect(formatLkr(2480000)).toBe("Rs 2,480,000");
  });

  it("speaks rupees in lakhs and millions", () => {
    expect(lkrSpoken(2_480_000)).toBe("24.8 lakh");
    expect(lkrSpoken(12_000_000)).toBe("12 million");
    expect(lkrSpoken(50_000)).toBe("");
  });

  it("formats a clock", () => {
    expect(formatClock(125)).toBe("2:05");
  });

  it("knows Auckland is 7.5 hours ahead of Colombo in NZ summer and 6.5 in winter", () => {
    expect(aucklandLeadHours(new Date("2026-11-04T00:00:00Z"))).toBe(7.5);
    expect(aucklandLeadHours(new Date("2026-07-01T00:00:00Z"))).toBe(6.5);
  });

  it("converts an Auckland wall-clock time to the right instant", () => {
    // 7pm Auckland on 10 Nov 2026 (NZDT, UTC+13) is 06:00 UTC, 11:30am in Colombo.
    const when = zonedTime(ZONES.auckland, 2026, 11, 10, 19);
    expect(when.toISOString()).toBe("2026-11-10T06:00:00.000Z");
    expect(timeIn(ZONES.colombo, when)).toMatch(/11:30/);
    // 7pm Auckland on 10 Jul 2026 (NZST, UTC+12).
    expect(zonedTime(ZONES.auckland, 2026, 7, 10, 19).toISOString()).toBe("2026-07-10T07:00:00.000Z");
  });
});
