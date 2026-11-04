import { describe, expect, it } from "vitest";
import { analyzeMessage, SAMPLE_MESSAGE, segment } from "./scam";

describe("analyzeMessage", () => {
  it("treats very short input as empty", () => {
    expect(analyzeMessage("hi").level).toBe("empty");
  });

  it("flags the classic fee-and-guarantee scam as high risk", () => {
    const result = analyzeMessage(SAMPLE_MESSAGE);
    expect(result.level).toBe("high");
    const ids = result.warnings.map((w) => w.rule.id);
    expect(ids).toEqual(expect.arrayContaining(["upfront-fee", "guarantee", "payment-method", "urgency", "free-email", "official-claim", "free-perks"]));
    // Most severe rules are listed first.
    expect(result.warnings[0].rule.severity).toBe("high");
  });

  it("keeps a normal employer email low risk and notices good signs", () => {
    const text =
      "Hi Kasun, thanks for your application. We are an accredited employer and would like to invite you to a video interview on Teams next week. " +
      "If successful, we will complete the Job Check and send you an employment agreement to review. Our NZBN is 9429041234567.";
    const result = analyzeMessage(text);
    expect(result.level).toBe("low");
    expect(result.positives.map((p) => p.rule.id)).toEqual(expect.arrayContaining(["nzbn", "process-terms", "interview"]));
  });

  it("never lets good signs hide a serious warning", () => {
    const text = "We are an accredited employer. Video interview done. Now pay the processing fee of Rs 300,000 to confirm.";
    const result = analyzeMessage(text);
    expect(result.level).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it("warns about working on a visitor visa", () => {
    expect(analyzeMessage("Come on a visitor visa and we will convert it to a work visa there.").warnings[0].rule.id).toBe("visitor-work");
  });

  it("produces non-overlapping highlight segments that rebuild the original text", () => {
    const result = analyzeMessage(SAMPLE_MESSAGE);
    const parts = segment(SAMPLE_MESSAGE, result.highlights);
    expect(parts.map((p) => p.text).join("")).toBe(SAMPLE_MESSAGE);
    for (let i = 1; i < result.highlights.length; i++) {
      expect(result.highlights[i].start).toBeGreaterThanOrEqual(result.highlights[i - 1].end);
    }
  });
});
