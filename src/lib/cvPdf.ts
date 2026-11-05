import type { CvDraft } from "@/types";
import { refereeLines, splitLines, splitList } from "@/logic/cv";

/**
 * Builds an NZ-style CV as a real text PDF (selectable, and readable by
 * applicant tracking systems): A4, one column, no photo, clear headings.
 */
export async function cvPdf(cv: CvDraft, opts: { draft?: boolean } = {}): Promise<Blob> {
  const { jsPDF, GState } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 18;
  const CW = W - M * 2;
  const TEAL: [number, number, number] = [0, 118, 95];
  const INK: [number, number, number] = [27, 26, 20];
  const GREY: [number, number, number] = [95, 95, 90];
  let y = M;

  const pt = (size: number) => size * 0.3528; // points to mm
  const ensure = (needed: number) => {
    if (y + needed > H - M - 6) {
      doc.addPage();
      y = M;
    }
  };
  const text = (value: string, size: number, opts2: { bold?: boolean; color?: [number, number, number]; x?: number; width?: number; gap?: number } = {}) => {
    doc.setFont("helvetica", opts2.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts2.color ?? INK));
    const x = opts2.x ?? M;
    const lines = doc.splitTextToSize(clean(value), opts2.width ?? CW - (x - M)) as string[];
    const lh = pt(size) * 1.35;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, x, y + pt(size));
      y += lh;
    }
    y += opts2.gap ?? 0;
  };
  const heading = (title: string) => {
    ensure(14);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEAL);
    doc.setCharSpace(0.6);
    doc.text(title.toUpperCase(), M, y + pt(9.5));
    doc.setCharSpace(0);
    y += pt(9.5) + 1.6;
    doc.setDrawColor(210, 210, 200);
    doc.setLineWidth(0.25);
    doc.line(M, y, W - M, y);
    y += 2.6;
  };
  const bullet = (value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(clean(value), CW - 5) as string[];
    const lh = pt(10.5) * 1.35;
    lines.forEach((line, i) => {
      ensure(lh);
      doc.setTextColor(...INK);
      if (i === 0) doc.text("•", M + 1, y + pt(10.5));
      doc.text(line, M + 5, y + pt(10.5));
      y += lh;
    });
    y += 0.6;
  };

  // Header
  text(cv.fullName || "Your Name", 22, { bold: true, gap: 0.5 });
  if (cv.headline) text(cv.headline, 11.5, { bold: true, color: TEAL, gap: 0.8 });
  const contact = [cv.location, cv.phone, cv.email, cv.linkedin].filter(Boolean).join("   |   ");
  if (contact) text(contact, 9.5, { color: GREY, gap: 0.4 });
  if (cv.workRights) text(`Work rights: ${cv.workRights}`, 9.5, { bold: true, gap: 0.5 });

  if (cv.summary.trim()) {
    heading("Profile");
    text(cv.summary, 10.5);
  }
  const skills = splitList(cv.skills);
  if (skills.length) {
    heading("Key skills");
    // Two columns of skills keep the first page tight.
    const half = Math.ceil(skills.length / 2);
    const startY = y;
    let leftEnd = y;
    skills.slice(0, half).forEach((s) => bullet(s));
    leftEnd = y;
    if (skills.length > 1) {
      y = startY;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const lh = pt(10.5) * 1.35;
      for (const s of skills.slice(half)) {
        const lines = doc.splitTextToSize(clean(s), CW / 2 - 6) as string[];
        lines.forEach((line, i) => {
          if (i === 0) doc.text("•", M + CW / 2 + 1, y + pt(10.5));
          doc.text(line, M + CW / 2 + 5, y + pt(10.5));
          y += lh;
        });
        y += 0.6;
      }
      y = Math.max(y, leftEnd);
    }
  }
  if (cv.experience.length) {
    heading("Work experience");
    cv.experience.forEach((job, i) => {
      ensure(16);
      if (i) y += 2;
      const dates = [job.start, job.end].filter(Boolean).join(" – ");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const dw = dates ? doc.getTextWidth(dates) + 3 : 0;
      const top = y;
      text(job.role || "Job title", 11, { bold: true, width: CW - dw });
      if (dates) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...GREY);
        doc.text(dates, W - M, top + pt(11), { align: "right" });
      }
      const where = [job.company, job.location].filter(Boolean).join(", ");
      if (where) text(where, 10, { color: GREY, gap: 0.8 });
      splitLines(job.bullets).forEach(bullet);
    });
  }
  const eduLines = splitLines(cv.education);
  if (eduLines.length) {
    heading("Education");
    eduLines.forEach((l) => text(l, 10.5, { gap: 0.8 }));
  }
  const certs = splitLines(cv.certifications);
  if (certs.length) {
    heading("Certifications");
    certs.forEach((l) => text(l, 10.5, { gap: 0.8 }));
  }
  const vol = splitLines(cv.volunteering ?? "");
  if (vol.length) {
    heading("Volunteering");
    vol.forEach(bullet);
  }
  if (cv.interests?.trim()) {
    heading("Interests");
    text(cv.interests, 10.5);
  }
  heading("Referees");
  const refs = refereeLines(cv);
  refs.forEach((l, i) => {
    if (!l) {
      y += 2;
      return;
    }
    const isName = (i === 0 || refs[i - 1] === "") && l !== "Available on request";
    text(l, 10.5, { bold: isName });
  });

  // Footer and draft mark on every page.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (opts.draft) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(90);
      doc.setTextColor(150, 150, 140);
      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.12 }));
      doc.text("DRAFT", W / 2, H / 2 + 20, { align: "center", angle: 35 });
      doc.restoreGraphicsState();
    }
    if (pages > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GREY);
      doc.text(`${cv.fullName || "CV"} – page ${p} of ${pages}`, W / 2, H - 10, { align: "center" });
    }
  }
  doc.setProperties({ title: `${cv.fullName || "CV"} – CV`, subject: "Curriculum vitae", creator: "KiwiPath CV Studio" });
  return doc.output("blob");
}

/** Helvetica in PDFs only covers Latin-1; swap common typographic characters. */
function clean(value: string): string {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/→/g, "->")
    .replace(/[^\t\n\x20-\x7e\xa0-\xff]/g, "");
}

export function cvFileName(cv: CvDraft, ext: string, draft = false): string {
  const base = (cv.fullName || "my").trim().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${base}-cv${draft ? "-draft" : ""}.${ext}`;
}
