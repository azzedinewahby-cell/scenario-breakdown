import PDFDocument from "pdfkit";
import type { Client } from "../../drizzle/schema";

type DocumentType = "facture" | "devis" | "avoir";

type LineWithProduct = {
  productName: string;
  description?: string | null;
  quantity: number;
  unit?: string;
  unitPriceHT: number;
  vatRate: number;
  discount?: number;
  lineTotal: number;
};

type GeneratePdfInput = {
  type: DocumentType;
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  reference?: string | null;
  description?: string | null;
  status?: string;
  client: Client;
  clientNumber?: string;
  company: any;
  lines: LineWithProduct[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  paymentMethod?: string | null;
  notes?: string | null;
};

const COLORS = {
  accent: "#3FA8B0",
  accentLight: "#E8F5F6",
  text: "#1f2937",
  muted: "#6b7280",
  white: "#ffffff",
};

function eur(cents: number, decimals = 2): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + " €";
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function nbEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
                 "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  const lt100 = (x: number): string => {
    if (x < 20) return units[x];
    const t = Math.floor(x / 10), u = x % 10;
    if (t === 7 || t === 9) return tens[t] + "-" + (t === 7 && u === 1 ? "et-" : "") + units[10 + u];
    if (u === 0) return tens[t] + (t === 8 ? "s" : "");
    if (u === 1 && t < 8) return tens[t] + "-et-un";
    return tens[t] + "-" + units[u];
  };
  const lt1000 = (x: number): string => {
    if (x < 100) return lt100(x);
    const c = Math.floor(x / 100), r = x % 100;
    const cent = c === 1 ? "cent" : units[c] + " cent" + (r === 0 ? "s" : "");
    return r === 0 ? cent : cent + " " + lt100(r);
  };
  if (n < 1000) return lt1000(n);
  if (n < 1000000) {
    const k = Math.floor(n / 1000), r = n % 1000;
    const mille = k === 1 ? "mille" : lt1000(k) + " mille";
    return r === 0 ? mille : mille + " " + lt1000(r);
  }
  return n.toString();
}

export async function generateDocumentPdf(input: GeneratePdfInput): Promise<Buffer> {
  const { type, number, issueDate, dueDate, reference, description, client, clientNumber,
    company, lines, totalHT, totalVAT, totalTTC, paymentMethod } = input;

  const titleMap: Record<DocumentType, string> = { facture: "FACTURE", devis: "DEVIS", avoir: "AVOIR" };
  const docTitle = titleMap[type];

  const doc = new PDFDocument({ size: "A4", margins: { top: 40, bottom: 60, left: 40, right: 40 }, bufferPages: true });
  const buffers: Buffer[] = [];
  doc.on("data", b => buffers.push(b));
  const pdfPromise = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(buffers))));

  // ─── HEADER ─────────────────────────────────────────────────────────────
  const tradeName = company.tradeName || company.companyName;
  doc.fontSize(13).fillColor(COLORS.accent).font("Helvetica-Bold").text(tradeName, 40, 40);

  doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
  let cy = 60;
  if (company.address) {
    for (const line of company.address.split("\n")) {
      doc.text(line, 40, cy); cy += 11;
    }
  }
  if (company.siret) { doc.text(`Siret : ${company.siret}`, 40, cy); cy += 11; }

  doc.fontSize(28).fillColor(COLORS.accent).font("Helvetica-Bold")
     .text(docTitle, 360, 40, { width: 195, align: "right" });

  doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
  let infoY = 80;
  doc.text(`N° : ${number}`, 360, infoY, { width: 195, align: "right" }); infoY += 13;
  doc.text(`Date d'émission : ${formatDate(issueDate)}`, 360, infoY, { width: 195, align: "right" }); infoY += 13;
  doc.text(`N° TVA : ${company.vatNumber || "NC"}`, 360, infoY, { width: 195, align: "right" }); infoY += 13;
  if (clientNumber) { doc.text(`N° client : ${clientNumber}`, 360, infoY, { width: 195, align: "right" }); }

  // ─── BLOC CLIENT ────────────────────────────────────────────────────────
  const clientY = 165;
  doc.fontSize(11).fillColor(COLORS.accent).font("Helvetica-Bold")
     .text(client.name, 320, clientY, { width: 235 });
  doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
  let cly = clientY + 15;
  if (client.address) {
    for (const line of client.address.split("\n")) {
      doc.text(line, 320, cly, { width: 235 }); cly += 11;
    }
  }
  if (client.siret) { doc.text(`Siret : ${client.siret}`, 320, cly, { width: 235 }); cly += 11; }
  if (client.email) { doc.text(client.email, 320, cly, { width: 235 }); cly += 11; }

  // ─── RÉFÉRENCE & DESCRIPTION ────────────────────────────────────────────
  let y = Math.max(cly + 20, 260);
  if (reference) {
    doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
    doc.text(`Réf. : ${reference}`, 40, y); y += 14;
  }
  if (description) {
    doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
    doc.text(description, 40, y, { width: 515 });
    y += doc.heightOfString(description, { width: 515 }) + 10;
  } else { y += 5; }

  // ─── TABLEAU LIGNES ─────────────────────────────────────────────────────
  const tableX = 40, tableW = 515;
  const cols = {
    libelle: { x: tableX + 6 },
    qte: { x: tableX + 215, w: 35 },
    unite: { x: tableX + 255 },
    pu: { x: tableX + 290, w: 65 },
    rem: { x: tableX + 360, w: 35 },
    montant: { x: tableX + 400, w: 65 },
    tva: { x: tableX + 470, w: 40 },
  };

  doc.rect(tableX, y, tableW, 22).fill(COLORS.accentLight);
  doc.fontSize(9).fillColor(COLORS.accent).font("Helvetica-Bold");
  doc.text("Libellé", cols.libelle.x, y + 7);
  doc.text("Qté", cols.qte.x, y + 7, { width: cols.qte.w, align: "right" });
  doc.text("Unité", cols.unite.x, y + 7);
  doc.text("PU HT", cols.pu.x, y + 7, { width: cols.pu.w, align: "right" });
  doc.text("Rem.", cols.rem.x, y + 7, { width: cols.rem.w, align: "right" });
  doc.text("Montant HT", cols.montant.x, y + 7, { width: cols.montant.w, align: "right" });
  doc.text("TVA", cols.tva.x, y + 7, { width: cols.tva.w, align: "right" });
  y += 22;

  doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
  for (const line of lines) {
    const lineHeight = Math.max(18, doc.heightOfString(line.productName, { width: 200 }) + 8);
    doc.text(line.productName, cols.libelle.x, y + 5, { width: 200 });
    doc.text(line.quantity.toLocaleString("fr-FR", { minimumFractionDigits: 2 }), cols.qte.x, y + 5, { width: cols.qte.w, align: "right" });
    doc.text(line.unit ?? "u", cols.unite.x, y + 5);
    doc.text(eur(line.unitPriceHT, 5), cols.pu.x, y + 5, { width: cols.pu.w, align: "right" });
    doc.text(`${(line.discount ?? 0).toFixed(2)}%`, cols.rem.x, y + 5, { width: cols.rem.w, align: "right" });
    doc.text(eur(line.lineTotal), cols.montant.x, y + 5, { width: cols.montant.w, align: "right" });
    doc.text(`${line.vatRate.toFixed(2)}%`, cols.tva.x, y + 5, { width: cols.tva.w, align: "right" });
    y += lineHeight;
    if (y > 680) { doc.addPage(); y = 50; }
  }

  y += 10;
  doc.fontSize(8).fillColor(COLORS.muted).font("Helvetica")
     .text("Type de vente : Vente de services", tableX, y);

  // ─── BAS DE PAGE ────────────────────────────────────────────────────────
  const bottomY = 600;

  // Bloc TVA (gauche)
  doc.rect(40, bottomY, 280, 22).fill(COLORS.accentLight);
  doc.fontSize(10).fillColor(COLORS.accent).font("Helvetica-Bold")
     .text("Détail de la TVA", 46, bottomY + 7);

  let tvaY = bottomY + 22;
  doc.fontSize(9).fillColor(COLORS.text).font("Helvetica-Bold");
  doc.text("Code", 46, tvaY + 5);
  doc.text("Base HT", 115, tvaY + 5);
  doc.text("Taux", 195, tvaY + 5);
  doc.text("Montant", 250, tvaY + 5);
  tvaY += 18;

  const vatByRate = new Map<number, { base: number; vat: number }>();
  for (const line of lines) {
    const existing = vatByRate.get(line.vatRate) ?? { base: 0, vat: 0 };
    existing.base += line.lineTotal;
    existing.vat += Math.round(line.lineTotal * line.vatRate / 100);
    vatByRate.set(line.vatRate, existing);
  }

  doc.font("Helvetica");
  for (const [rate, vals] of vatByRate.entries()) {
    const label = rate === 20 ? "Normale" : rate === 10 ? "Intermédiaire" : rate === 5.5 ? "Réduite" : `${rate}%`;
    doc.text(label, 46, tvaY + 5);
    doc.text(eur(vals.base), 110, tvaY + 5, { width: 70 });
    doc.text(`${rate.toFixed(2)}%`, 195, tvaY + 5);
    doc.text(eur(vals.vat), 240, tvaY + 5, { width: 70 });
    tvaY += 16;
  }

  // Bloc Règlement
  const regY = tvaY + 10;
  doc.rect(40, regY, 90, 38).fill(COLORS.accentLight);
  doc.fontSize(9).fillColor(COLORS.accent).font("Helvetica-Bold");
  doc.text("Règlement", 46, regY + 5);
  doc.text("Echéance(s)", 46, regY + 22);
  doc.fontSize(9).fillColor(COLORS.text).font("Helvetica");
  doc.text(paymentMethod || "Virement", 140, regY + 5);
  if (dueDate) {
    doc.text(`${eur(totalTTC)} au ${formatDate(dueDate)}`, 140, regY + 22);
  }

  // Totaux (droite)
  doc.fontSize(10).fillColor(COLORS.text).font("Helvetica");
  doc.text("Total HT", 370, bottomY + 5);
  doc.text(eur(totalHT), 370, bottomY + 5, { width: 175, align: "right" });
  doc.text("TVA", 370, bottomY + 25);
  doc.text(eur(totalVAT), 370, bottomY + 25, { width: 175, align: "right" });

  doc.rect(360, bottomY + 50, 195, 30).fill(COLORS.accent);
  doc.fontSize(13).fillColor(COLORS.white).font("Helvetica-Bold");
  doc.text("Total TTC", 370, bottomY + 60);
  doc.text(eur(totalTTC), 370, bottomY + 60, { width: 175, align: "right" });

  // Mention en lettres
  const ttc = totalTTC / 100;
  const entiers = Math.floor(ttc);
  const cents = Math.round((ttc - entiers) * 100);
  const enLettres = nbEnLettres(entiers) + (cents > 0 ? ` euros et ${nbEnLettres(cents)} centimes` : " euros");
  doc.fontSize(8).fillColor(COLORS.muted).font("Helvetica");
  doc.text(`Le montant total s'élève à ${enLettres}`, 40, regY + 50, { width: 515 });

  // Conditions
  if (company.paymentConditions) {
    doc.fontSize(7).fillColor(COLORS.muted).font("Helvetica");
    doc.text(company.paymentConditions, 40, regY + 70, { width: 515 });
  }

  // Footer
  const pageHeight = doc.page.height;
  if (company.legalMentions) {
    doc.fontSize(7).fillColor(COLORS.muted).font("Helvetica");
    doc.text(company.legalMentions, 40, pageHeight - 50, { width: 515, align: "center" });
  }

  doc.end();
  return pdfPromise;
}
