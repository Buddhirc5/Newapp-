import { describe, expect, it } from "vitest";
import { analyzeTranscript, countLongPauses, feedback, toBars } from "./speech";

describe("analyzeTranscript", () => {
  it("counts words, pace and fillers", () => {
    const m = analyzeTranscript("Um, I think, you know, Galle is beautiful. Um, the fort is old and, you know, lovely.", 30);
    expect(m.words).toBe(17);
    expect(m.wpm).toBe(34);
    expect(m.fillerCount).toBe(4);
    expect(m.fillers.find((f) => f.word === "you know")?.count).toBe(2);
  });
});

describe("countLongPauses", () => {
  const speech = Array(20).fill(0.5);
  const silence = (n: number) => Array(n).fill(0.01);

  it("counts pauses between speech but not leading or trailing silence", () => {
    // 100 ms frames: 3 s silence inside, 1 s silence inside, silence at both ends.
    const levels = [...silence(30), ...speech, ...silence(30), ...speech, ...silence(10), ...speech, ...silence(40)];
    expect(countLongPauses(levels, 100, 2000)).toBe(1);
  });

  it("returns 0 for silence", () => {
    expect(countLongPauses(silence(50), 100)).toBe(0);
  });
});

describe("toBars", () => {
  it("normalises to the loudest bar", () => {
    const bars = toBars([0.1, 0.2, 0.4, 0.2], 2);
    expect(bars).toEqual([0.5, 1]);
  });
});

describe("feedback", () => {
  it("praises a full, well-paced answer", () => {
    const tips = feedback({ seconds: 115, targetSeconds: 120, wpm: 130, fillerCount: 1, longPauses: 0, uniqueRatio: 0.6 });
    expect(tips.every((t) => t.good)).toBe(true);
  });

  it("suggests improvements for a short, hesitant answer", () => {
    const tips = feedback({ seconds: 40, targetSeconds: 120, wpm: 80, fillerCount: 7, longPauses: 4, uniqueRatio: 0.3 });
    expect(tips.filter((t) => !t.good).length).toBe(5);
  });
});
