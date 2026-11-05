/**
 * A4 payment receipt as a real text PDF. Used by admins (Revenue page) and by
 * members for their own payments (Me → Receipts).
 */
export interface ReceiptData {
  receiptNo: number;
  date: string;
  name: string;
  email: string;
  description: string;
  periodEnd?: string | null;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  status: string;
}

export const receiptNumber = (n: number) => `KP-${String(n).padStart(6, "0")}`;

const money = (amount: number, currency: string) =>
  `${currency === "LKR" ? "Rs" : currency} ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export async function receiptPdf(r: ReceiptData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 20;
  const TEAL: [number, number, number] = [0, 118, 95];
  const INK: [number, number, number] = [27, 26, 20];
  const GREY: [number, number, number] = [110, 110, 104];

  // Header band
  doc.setFillColor(16, 15, 6);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(245, 244, 237);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("KiwiPath", M, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Colombo to Aotearoa · kiwipath.space", M, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RECEIPT", W - M, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(receiptNumber(r.receiptNo), W - M, 25, { align: "right" });

  let y = 50;
  const label = (t: string, x: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(t.toUpperCase(), x, y);
  };
  const value = (t: string, x: number, dy = 5.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(t, x, y + dy);
  };

  label("Billed to", M);
  label("Receipt date", 120);
  value(r.name || "KiwiPath member", M);
  value(day(r.date), 120);
  y += 6;
  value(r.email, M);
  y += 14;
  label("Payment method", M);
  label("Status", 120);
  value(r.method, M);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...(r.status === "paid" ? TEAL : INK));
  doc.text(r.status === "paid" ? "PAID" : r.status.toUpperCase(), 120, y + 5.5);
  if (r.reference) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(`Reference: ${r.reference}`, M, y + 5.5);
  }

  // Line items
  y += 20;
  doc.setDrawColor(220, 220, 212);
  doc.setFillColor(245, 244, 237);
  doc.rect(M, y, W - 2 * M, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text("DESCRIPTION", M + 3, y + 6);
  doc.text("AMOUNT", W - M - 3, y + 6, { align: "right" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(r.description, M + 3, y);
  doc.text(money(r.amount, r.currency), W - M - 3, y, { align: "right" });
  if (r.periodEnd) {
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(`Covers access until ${day(r.periodEnd)}`, M + 3, y + 5.5);
  }
  y += 14;
  doc.line(M, y, W - M, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Total paid", M + 3, y);
  doc.text(money(r.amount, r.currency), W - M - 3, y, { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  const foot = [
    "Thank you for supporting KiwiPath. Card payments are processed securely by PayHere; KiwiPath never sees your card details.",
    "KiwiPath shares general information, not immigration advice. Keep this receipt for your records.",
  ];
  doc.text(doc.splitTextToSize(foot.join(" "), W - 2 * M) as string[], M, 272);
  doc.setProperties({ title: `KiwiPath receipt ${receiptNumber(r.receiptNo)}`, creator: "KiwiPath" });
  return doc.output("blob");
}

export async function downloadReceipt(r: ReceiptData) {
  const blob = await receiptPdf(r);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `kiwipath-receipt-${receiptNumber(r.receiptNo)}.pdf` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const PLAN_ITEM: Record<string, string> = { pro: "KiwiPath Main, 1 month", ultra: "KiwiPath Ultra, 1 month" };
