/**
 * Reads the text out of an uploaded CV on this device. PDF uses pdf.js and
 * Word (.docx) is unzipped directly; both libraries load only when needed.
 */

export interface CvFile {
  text: string;
  pages?: number;
  /** A picture sits on the first page (most likely a photo). */
  hasPhoto: boolean;
}

export class CvFileError extends Error {}

const MAX_BYTES = 10 * 1024 * 1024;

export async function readCvFile(file: File): Promise<CvFile> {
  if (file.size > MAX_BYTES) throw new CvFileError("That file is over 10 MB. Try exporting a smaller PDF.");
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return readPdf(file);
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return readDocx(file);
  if (name.endsWith(".txt") || file.type === "text/plain") return { text: await file.text(), hasPhoto: false };
  if (name.endsWith(".doc")) throw new CvFileError("Old Word (.doc) files can't be read. In Word, choose Save As → .docx or PDF, then upload again.");
  if (file.type.startsWith("image/")) throw new CvFileError("That's a photo of a CV. Upload the PDF or Word file instead, or use Document Check for scanned pages.");
  throw new CvFileError("Upload a PDF or Word (.docx) file.");
}

async function readPdf(file: File): Promise<CvFile> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch {
    throw new CvFileError("This PDF couldn't be opened. If it has a password, remove it and try again.");
  }
  const lines: string[] = [];
  let hasPhoto = false;
  for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);
    if (i === 1) {
      const ops = await page.getOperatorList();
      const imageOps = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageXObjectRepeat]);
      hasPhoto = ops.fnArray.some((fn) => imageOps.has(fn));
    }
  }
  const text = lines.join("\n").replace(/[ \t]+\n/g, "\n").trim();
  await doc.destroy();
  if (text.length < 40) throw new CvFileError("This PDF is a scanned image, so there's no text to read. Upload the Word file, or use Document Check for scans.");
  return { text, pages: doc.numPages, hasPhoto };
}

async function readDocx(file: File): Promise<CvFile> {
  const { unzipSync, strFromU8 } = await import("fflate");
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => f.name === "word/document.xml" || f.name.startsWith("word/media/") });
  } catch {
    throw new CvFileError("This Word file couldn't be opened. Save it again as .docx or PDF and retry.");
  }
  const xml = files["word/document.xml"];
  if (!xml) throw new CvFileError("This doesn't look like a Word document.");
  return { text: docxText(strFromU8(xml)), hasPhoto: Object.keys(files).some((n) => n.startsWith("word/media/")) };
}

/** Paragraph-aware text from WordprocessingML. Exported for tests. */
export function docxText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    // Only text inside <w:t> runs is content; everything else is markup.
    .replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<[^>]+>|[^<]+/g, (m, t?: string) => (t !== undefined ? t : m.startsWith("<") ? "" : m.replace(/[^\n\t]/g, "")))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
