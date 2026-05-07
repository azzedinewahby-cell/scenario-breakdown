import PDFDocument from "pdfkit";
import type { Client, CompanySettings, Invoice, Quote, Credit, InvoiceLine, QuoteLine, Product } from "../../drizzle/schema";

type DocumentType = "facture" | "devis" | "avoir";

type LineWithProduct = {
  productName: string;
  description?: string | null;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
  lineTotal: number;
};

type GeneratePdfInput = {
  type: DocumentType;
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  status?: string;
  client: Client;
  company: CompanySettings;
  lines: LineWithProduct[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  paymentMethod?: string | null;
  notes?: string | null;
};

const COLORS = {
  primary: "#1e293b",   // slate-800
  accent: "#0f172a",    // slate-900
  muted: "#64748b",     // slate-500
  light: "#f1f5f9",     // slate-100
  border: "#cbd5e1",    // slate-300
  success: "#16a34a",   // green-600
};

function formatCurrency(cents: number): string {
  // Stored in cents (or directly in euros - we'll handle both)
  // If value > 1000000, assume it's in cents
  const value = cents > 100000 ? cents / 100 : cents;
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateDocumentPdf(input: GeneratePdfInput): Promise<Buffer> {
  const { type, number, issueDate, dueDate, client, company, lines, totalHT, totalVAT, totalTTC, paymentMethod, notes } = input;

  const docTitleMap: Record<DocumentType, string> = {
    facture: "FACTURE",
    devis: "DEVIS",
    avoir: "AVOIR",
  };
  const docTitle = docTitleMap[type];

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const buffers: Buffer[] = [];
  doc.on("data", b => buffers.push(b));
  const pdfPromise = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(buffers))));

  // ─── HEADER ─────────────────────────────────────────────────────────────
  doc.fontSize(28).fillColor(COLORS.accent).font("Helvetica-Bold").text(docTitle, 50, 50);
  doc.fontSize(11).fillColor(COLORS.muted).font("Helvetica").text(`N° ${number}`, 50, 85);

  // Company name top right - tradeName en grand, dénomination légale en petit
  const displayName = (company as any).tradeName || company.companyName;
  const legalName = (company as any).tradeName ? company.companyName : null;

  doc.fontSize(16).fillColor(COLORS.primary).font("Helvetica-Bold")
     .text(displayName, 300, 50, { align: "right", width: 245 });
  let companyY = 72;
  if (legalName) {
    doc.fontSize(8).fillColor(COLORS.muted).font("Helvetica-Oblique")
       .text(`(${legalName})`, 300, companyY, { align: "right", width: 245 });
    companyY += 12;
  }
  doc.fontSize(9).fillColor(COLORS.muted).font("Helvetica");
  if (company.address) {
    doc.text(company.address, 300, companyY, { align: "right", width: 245 });
    companyY += doc.heightOfString(company.address, { width: 245 }) + 2;
  }
  if (company.phone) { doc.text(`Tél : ${company.phone}`, 300, companyY, { align: "right", width: 245 }); companyY += 12; }
  if (company.email) { doc.text(company.email, 300, companyY, { align: "right", width: 245 }); companyY += 12; }
  if (company.siret) { doc.text(`SIRET : ${company.siret}`, 300, companyY, { align: "right", width: 245 }); companyY += 12; }
  if (company.vatNumber) { doc.text(`TVA : ${company.vatNumber}`, 300, companyY, { align: "right", width: 245 }); companyY += 12; }

  // ─── CLIENT BLOCK ───────────────────────────────────────────────────────
  const clientY = Math.max(140, companyY + 20);
  doc.rect(50, clientY, 240, 100).fillAndStroke(COLORS.light, COLORS.border);
  doc.fontSize(9).fillColor(COLORS.muted).font("Helvetica").text("FACTURÉ À", 60, clientY + 10);
  doc.fontSize(11).fillColor(COLORS.accent).font("Helvetica-Bold").text(client.nom, 60, clientY + 25);
  doc.fontSize(9).fillColor(COLORS.primary).font("Helvetica");
  let cy = clientY + 45;
  if (client.adresse) { doc.text(client.adresse, 60, cy, { width: 220 }); cy += doc.heightOfString(client.adresse, { width: 220 }) + 2; }
  if (client.codePostal || client.ville) { doc.text(`${client.codePostal ?? ""} ${client.ville ?? ""}`.trim(), 60, cy); cy += 12; }
  if (client.email) { doc.text(client.email, 60, cy); cy += 12; }
  if (client.siret) { doc.text(`SIRET : ${client.siret}`, 60, cy); cy += 12; }

  // ─── DATES BLOCK ────────────────────────────────────────────────────────
  doc.rect(305, clientY, 240, 100).fillAndStroke(COLORS.light, COLORS.border);
  doc.fontSize(9).fillColor(COLORS.muted).font("Helvetica").text("INFORMATIONS", 315, clientY + 10);
  doc.fontSize(9).fillColor(COLORS.primary).font("Helvetica");
  doc.text("Date d'émission :", 315, clientY + 28);
  doc.font("Helvetica-Bold").text(formatDate(issueDate), 440, clientY + 28);
  if (dueDate) {
    doc.font("Helvetica").text("Date d'échéance :", 315, clientY + 45);
    doc.font("Helvetica-Bold").text(formatDate(dueDate), 440, clientY + 45);
  }
  if (paymentMethod) {
    doc.font("Helvetica").text("Règlement :", 315, clientY + 62);
    doc.font("Helvetica-Bold").text(paymentMethod, 440, clientY + 62, { width: 100 });
  }

  // ─── LINES TABLE ────────────────────────────────────────────────────────
  let tableY = clientY + 130;
  // Header
  doc.rect(50, tableY, 495, 25).fill(COLORS.accent);
  doc.fontSize(10).fillColor("white").font("Helvetica-Bold");
  doc.text("Description", 60, tableY + 8, { width: 240 });
  doc.text("Qté", 305, tableY + 8, { width: 35, align: "right" });
  doc.text("PU HT", 345, tableY + 8, { width: 60, align: "right" });
  doc.text("TVA", 410, tableY + 8, { width: 35, align: "right" });
  doc.text("Total HT", 450, tableY + 8, { width: 85, align: "right" });

  tableY += 25;
  doc.fontSize(9).fillColor(COLORS.primary).font("Helvetica");

  for (const [i, line] of lines.entries()) {
    const rowHeight = Math.max(22, doc.heightOfString(line.productName, { width: 240 }) + 8);
    if (i % 2 === 0) doc.rect(50, tableY, 495, rowHeight).fill("#fafbfc");
    doc.fillColor(COLORS.primary).font("Helvetica-Bold").text(line.productName, 60, tableY + 6, { width: 240 });
    if (line.description) {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(line.description, 60, tableY + 18, { width: 240 });
      doc.fontSize(9);
    }
    doc.fillColor(COLORS.primary).font("Helvetica");
    doc.text(String(line.quantity), 305, tableY + 6, { width: 35, align: "right" });
    doc.text(formatCurrency(line.unitPriceHT), 345, tableY + 6, { width: 60, align: "right" });
    doc.text(`${line.vatRate}%`, 410, tableY + 6, { width: 35, align: "right" });
    doc.text(formatCurrency(line.lineTotal), 450, tableY + 6, { width: 85, align: "right" });
    tableY += rowHeight;

    // page break check
    if (tableY > 700) {
      doc.addPage();
      tableY = 50;
    }
  }

  // ─── TOTALS ─────────────────────────────────────────────────────────────
  tableY += 20;
  const totalsX = 350;
  doc.fontSize(10).fillColor(COLORS.primary).font("Helvetica");
  doc.text("Sous-total HT", totalsX, tableY);
  doc.text(formatCurrency(totalHT), totalsX + 100, tableY, { width: 95, align: "right" });
  tableY += 18;
  doc.text("TVA", totalsX, tableY);
  doc.text(formatCurrency(totalVAT), totalsX + 100, tableY, { width: 95, align: "right" });
  tableY += 22;

  doc.rect(totalsX - 10, tableY - 5, 205, 28).fill(COLORS.accent);
  doc.fontSize(12).fillColor("white").font("Helvetica-Bold");
  doc.text("TOTAL TTC", totalsX, tableY + 4);
  doc.text(formatCurrency(totalTTC), totalsX + 100, tableY + 4, { width: 95, align: "right" });
  tableY += 50;

  // ─── BANK DETAILS / NOTES ───────────────────────────────────────────────
  if (company.bankDetails && type === "facture") {
    doc.fontSize(9).fillColor(COLORS.muted).font("Helvetica-Bold").text("COORDONNÉES BANCAIRES", 50, tableY);
    doc.fontSize(9).fillColor(COLORS.primary).font("Helvetica").text(company.bankDetails, 50, tableY + 14, { width: 495 });
    tableY += doc.heightOfString(company.bankDetails, { width: 495 }) + 25;
  }

  if (notes) {
    doc.fontSize(9).fillColor(COLORS.muted).font("Helvetica-Bold").text("NOTES", 50, tableY);
    doc.fontSize(9).fillColor(COLORS.primary).font("Helvetica").text(notes, 50, tableY + 14, { width: 495 });
    tableY += doc.heightOfString(notes, { width: 495 }) + 20;
  }

  // ─── FOOTER (legal mentions) ────────────────────────────────────────────
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 80;
  if (company.legalMentions) {
    doc.fontSize(7).fillColor(COLORS.muted).font("Helvetica-Oblique")
       .text(company.legalMentions, 50, footerY, { width: 495, align: "center" });
  }
  doc.fontSize(7).fillColor(COLORS.muted).font("Helvetica")
     .text(`${docTitle} ${number} — ${company.companyName}`, 50, pageHeight - 35, { width: 495, align: "center" });

  doc.end();
  return pdfPromise;
}
