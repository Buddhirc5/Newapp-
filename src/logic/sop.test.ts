import { describe, expect, it } from "vitest";
import { checkSop, draftSop, EMPTY_SOP } from "./sop";

const input = {
  ...EMPTY_SOP,
  programme: "Master of Data Science",
  university: "University of Canterbury",
  degree: "a BSc in Statistics at the University of Colombo in 2020",
  experience: "For three years I worked as a data analyst at a logistics company in Colombo, where I cut reporting time by 40%",
  whyProgramme: "its machine learning papers and industry project",
  whyNz: "New Zealand's universities work closely with industry",
  careerGoal: "become a data scientist in the logistics sector",
  funding: "My parents and an education loan from my bank will cover my fees and living costs",
};

describe("SOP builder", () => {
  it("drafts paragraphs in the recommended order", () => {
    const text = draftSop(input);
    expect(text.indexOf("Master of Data Science")).toBeLessThan(text.indexOf("BSc"));
    expect(text).toContain("After graduating, I plan to become a data scientist");
    expect(text.split("\n\n").length).toBe(7);
  });

  it("flags generic phrases and short drafts", () => {
    const checks = checkSop("I want to study at a world-class university in a beautiful country.", input);
    expect(checks.find((c) => c.text.includes("generic") || c.text.includes("world-class"))?.ok).toBe(false);
    expect(checks[0].ok).toBe(false);
  });
});
