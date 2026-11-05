import { describe, expect, it } from "vitest";
import { checkCv, cvToText, EMPTY_CV, guessContact, refereeLines, SAMPLE_SL_CV } from "./cv";

const EMPTY = EMPTY_CV;

describe("checkCv", () => {
  it("finds the personal details NZ CVs leave out", () => {
    const report = checkCv(SAMPLE_SL_CV);
    const ids = report.issues.filter((i) => i.kind === "remove").map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["dob", "nic", "religion", "marital", "parents", "personal-traits", "declaration"]));
    expect(report.score).toBeLessThan(40);
  });

  it("suggests achievements over duties and a profile over an objective", () => {
    const ids = checkCv(SAMPLE_SL_CV).issues.map((i) => i.id);
    expect(ids).toContain("duties");
    expect(ids).toContain("objective");
  });

  it("scores a clean, achievement-led CV highly", () => {
    const text = `Nimali Perera
Senior Accountant | Requires AEWV sponsorship
nimali@example.com | +94 77 123 4567
Profile: CIMA-qualified accountant with 7 years in retail and manufacturing.
Experience
Led a team of 6 and reduced month-end close from 8 to 5 days.
Automated supplier reconciliations, saving 20 hours a month.
Improved cash forecasting accuracy by 15%.
Implemented a new ERP module across 3 sites.
Trained 12 junior staff on IFRS reporting.
Negotiated payment terms that saved Rs 4,500,000 a year.
`.repeat(3) + "Referees available on request";
    const report = checkCv(text);
    expect(report.issues.filter((i) => i.kind === "remove")).toHaveLength(0);
    expect(report.issues.find((i) => i.id === "rights")?.kind).toBe("good");
    expect(report.score).toBeGreaterThanOrEqual(90);
  });

  it("does not mistake a phone number for an NIC number", () => {
    expect(checkCv("Call me on 0771234567 any time").issues.some((i) => i.id === "nic")).toBe(false);
  });
});

describe("cvToText", () => {
  it("renders a plain-text CV with referees", () => {
    const text = cvToText({
      ...EMPTY_CV,
      fullName: "Nimali Perera",
      skills: "IFRS, Power BI",
      experience: [{ id: "a", role: "Accountant", company: "ABC", location: "Colombo", start: "2019", end: "Present", bullets: "- Led a team\n- Cut costs" }],
    });
    expect(text).toContain("Nimali Perera");
    expect(text).toContain("• IFRS");
    expect(text).toContain("• Led a team");
    expect(text).toContain("Available on request");
  });
});


describe("NZ CV extras", () => {
  it("flags US spelling, missing referees and NZQA for Sri Lankan degrees", () => {
    const r = checkCv("Kamal Perera\nkamal@mail.com +94 77 123 4567\nBSc, University of Moratuwa\nOrganized a team of 12 and analyzed costs");
    const ids = r.issues.map((i) => i.id);
    expect(ids).toContain("spelling");
    expect(ids).toContain("referees");
    expect(ids).toContain("nzqa");
  });

  it("uses the photo flag from an uploaded file", () => {
    expect(checkCv("Some text about work", { hasPhoto: true }).issues[0].id).toBe("photo");
  });

  it("guesses contact details from a CV", () => {
    const g = guessContact("CURRICULUM VITAE\nNIMALI PERERA\nnimali.p@gmail.com | +94 77 123 4567\nlinkedin.com/in/nimali-p");
    expect(g.fullName).toBe("Nimali Perera");
    expect(g.email).toBe("nimali.p@gmail.com");
    expect(g.linkedin).toBe("linkedin.com/in/nimali-p");
    expect(g.phone).toContain("77 123 4567");
  });

  it("lists referees or says available on request", () => {
    expect(refereeLines(EMPTY)).toEqual(["Available on request"]);
    const lines = refereeLines({
      ...EMPTY,
      refereesOnRequest: false,
      referees: [{ id: "1", name: "Sunil Silva", title: "Finance Manager", company: "ABC", phone: "+94 11 234 5678", email: "s@abc.lk", relationship: "Direct manager" }],
    });
    expect(lines[0]).toBe("Sunil Silva – Finance Manager, ABC");
    expect(lines).toContain("+94 11 234 5678 | s@abc.lk");
  });
});
