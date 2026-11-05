import { describe, expect, it } from "vitest";
import { docAlert } from "./docs";

const now = new Date("2026-11-05T12:00:00");

describe("docAlert", () => {
  it("flags police certificates older than 6 months", () => {
    expect(docAlert("police", { issued: "2026-04-01" }, now).level).toBe("expired");
    expect(docAlert("police", { issued: "2026-06-01" }, now).level).toBe("soon");
    expect(docAlert("police", { issued: "2026-10-01" }, now).level).toBe("ok");
  });
  it("wants passports valid 6 months ahead", () => {
    expect(docAlert("passport", { expires: "2027-03-01" }, now).level).toBe("expired");
    expect(docAlert("passport", { expires: "2028-03-01" }, now).level).toBe("ok");
  });
  it("is unknown without dates", () => {
    expect(docAlert("medical", undefined, now).level).toBe("unknown");
  });
});
