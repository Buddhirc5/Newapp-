import { describe, expect, it } from "vitest";
import { cvPdf, cvFileName } from "./cvPdf";
import { EMPTY_CV } from "@/logic/cv";

describe("cvPdf", () => {
  it("builds a text PDF and a tidy file name", async () => {
    const cv = {
      ...EMPTY_CV,
      fullName: "Nimali Perera",
      headline: "Senior Accountant | IFRS",
      summary: "CIMA-qualified accountant with 7 years’ experience.",
      skills: "IFRS, Power BI, Xero",
      experience: [{ id: "1", role: "Senior Accountant", company: "ABC", location: "Colombo", start: "Mar 2021", end: "Present", bullets: "Cut close from 8 to 5 days\nTrained 12 staff" }],
    };
    const blob = await cvPdf(cv, { draft: true });
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe("%PDF-");
    expect(blob.size).toBeGreaterThan(2000);
    expect(cvFileName(cv, "pdf", true)).toBe("nimali-perera-cv-draft.pdf");
  });
});
