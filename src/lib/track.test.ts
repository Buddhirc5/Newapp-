import { describe, expect, it } from "vitest";
import { screenName } from "./track";

describe("screenName", () => {
  it("hides ids but keeps readable names", () => {
    expect(screenName("/board/8f2c1a2b-1234-4cde-9abc-0123456789ab")).toBe("/board/:id");
    expect(screenName("/experts/42?x=1")).toBe("/experts/:id");
    expect(screenName("/groups/auckland")).toBe("/groups/auckland");
    expect(screenName("/")).toBe("/");
    expect(screenName("/tools/")).toBe("/tools");
  });
});
