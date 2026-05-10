import PDFDocument from "pdfkit";
import path from "path";
import type { Client } from "../../drizzle/schema";

type DocumentType = "facture" | "devis" | "avoir";

type LineItem = {
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
  lines: LineItem[];
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  paymentMethod?: string | null;
  notes?: string | null;
  acompteAmount?: number;
  acompteDate?: Date | null;
  resteAPayer?: number;
};

function fmt(n: number, dec = 2): string {
  const s = Math.abs(n).toFixed(dec);
  const [int, d] = s.split(".");
  const intF = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${n < 0 ? "-" : ""}${intF},${d}\u202f\u20ac`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toWords(n: number): string {
  if (n === 0) return "zéro";
  const u = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf",
             "dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
  const t = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];
  const lt100 = (x: number): string => {
    if (x<20) return u[x];
    const [q,r] = [Math.floor(x/10), x%10];
    if (q===7||q===9) return t[q]+"-"+(q===7&&r===1?"et-":"")+u[10+r];
    if (r===0) return t[q]+(q===8?"s":"");
    if (r===1&&q<8) return t[q]+"-et-un";
    return t[q]+"-"+u[r];
  };
  const lt1000 = (x: number): string => {
    if (x<100) return lt100(x);
    const [c,r] = [Math.floor(x/100), x%100];
    const cent = c===1?"cent":u[c]+" cent"+(r===0?"s":"");
    return r===0?cent:cent+" "+lt100(r);
  };
  if (n<1000) return lt1000(n);
  if (n<1000000) {
    const [k,r] = [Math.floor(n/1000), n%1000];
    return (k===1?"mille":lt1000(k)+" mille")+(r===0?"":" "+lt1000(r));
  }
  return n.toString();
}

// ─── couleurs & constantes ────────────────────────────────────────────────────
const BLK = "#111111";
const GRY = "#777777";
const LGT = "#aaaaaa";
const WHT = "#ffffff";
const BDR = "#cccccc";
const BG2 = "#f7f7f7";

export async function generateDocumentPdf(input: GeneratePdfInput): Promise<Buffer> {
  const { type, number, issueDate, dueDate, client, company,
          lines, totalHT, totalVAT, totalTTC, paymentMethod,
          acompteAmount = 0, acompteDate, resteAPayer = 0 } = input;

  const TITLE = { facture: "FACTURE", devis: "DEVIS", avoir: "AVOIR" }[type];

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 44, right: 44 },
    bufferPages: true,
    info: { Title: `${TITLE} ${number}`, Author: company.tradeName || company.companyName }
  });

  const chunks: Buffer[] = [];
  doc.on("data", c => chunks.push(c));
  const done = new Promise<Buffer>(res => doc.on("end", () => res(Buffer.concat(chunks))));

  const L = 44, R = 551, W = R - L;
  const PH = doc.page.height; // 841.89

  // helper: draw filled rect (state-safe)
  const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
    const cur = doc._fillColor ?? [BLK];
    doc.rect(x, y, w, h).fill(color);
    doc.fillColor(Array.isArray(cur) ? cur[0] : cur);
    doc.strokeColor(BDR);
  };

  // helper: draw line (state-safe)
  const line = (x1: number, y1: number, x2: number, y2: number, color = BDR, w = 0.5) => {
    doc.save();
    doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(color).lineWidth(w).stroke();
    doc.restore();
  };

  // helper: text cell
  const cell = (text: string, x: number, y: number, opts: any = {}) => {
    doc.fillColor(opts.color || BLK)
       .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
       .fontSize(opts.size || 8.5)
       .text(text, x, y, {
         width: opts.width,
         align: opts.align || "left",
         lineBreak: false,
       });
  };

  // ── LOGO (converti en JPEG pour éviter les problèmes d'alpha PNG) ────────
  const logoPath = path.join(process.cwd(), "server", "assets", "logo.png");
  let logoH = 0;
  try {
    const sharp = await import("sharp");
    const jpegBuf = await sharp.default(logoPath)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // fond blanc, supprime alpha
      .jpeg({ quality: 95 })
      .toBuffer();
    doc.image(jpegBuf, L, 36, { width: 50 });
    logoH = 50;
  } catch { logoH = 0; }

  // ── EN-TÊTE ÉMETTEUR (gauche) ─────────────────────────────────────────────
  const HX = logoH > 0 ? L + 58 : L;
  const tradeName = company.tradeName || company.companyName;
  cell(tradeName, HX, 38, { bold: true, size: 10.5 });
  let hy = 52;
  const headerLines = [
    ...(company.address || "").split("\n"),
    company.email ? `Email : ${company.email}` : null,
    company.siret ? `Siret : ${company.siret}` : null,
  ].filter(Boolean) as string[];
  for (const hl of headerLines) {
    cell(hl, HX, hy, { size: 7.5, color: GRY }); hy += 10;
  }

  // ── TITRE + INFOS DOCUMENT (droite) ──────────────────────────────────────
  cell(TITLE, 310, 36, { bold: true, size: 28, color: BLK, width: 241, align: "right" });
  let iy = 76;
  const docInfos = [
    `N\u00b0 : ${number}`,
    `Date d\u2019\u00e9mission : ${fmtDate(issueDate)}`,
    `N\u00b0 TVA : ${company.vatNumber || "NC"}`,
    ...(input.clientNumber ? [`N\u00b0 client : ${input.clientNumber}`] : []),
  ];
  for (const di of docInfos) {
    cell(di, 310, iy, { size: 8.5, width: 241, align: "right" }); iy += 12;
  }

  // ── BLOC CLIENT (droite) ──────────────────────────────────────────────────
  const CY = 155;
  cell(client.name, 320, CY, { bold: true, size: 10, width: 231 });
  let cy = CY + 14;
  for (const cl of [
    ...(client.address || "").split("\n"),
    client.siret ? `Siret : ${client.siret}` : null,
    client.email || null,
    client.phone || null,
  ].filter(Boolean) as string[]) {
    cell(cl, 320, cy, { size: 8.5, width: 231, color: GRY }); cy += 11;
  }

  // ── SÉPARATEUR + RÉFÉRENCE ────────────────────────────────────────────────
  let y = Math.max(cy + 10, 235);
  line(L, y, R, y);
  y += 10;
  if (input.reference) {
    cell(`Réf. : ${input.reference}`, L, y, { bold: true, size: 8.5 }); y += 14;
  }
  if (input.description) {
    cell(input.description, L, y, { size: 8.5, width: W }); y += 14;
  }

  // ── TABLEAU ──────────────────────────────────────────────────────────────
  const C = {
    lib: { x: L + 4,   w: 185 },
    qte: { x: L + 193, w: 36  },
    uni: { x: L + 233, w: 40  },
    pu:  { x: L + 277, w: 66  },
    rem: { x: L + 347, w: 36  },
    mht: { x: L + 387, w: 68  },
    tva: { x: L + 459, w: 48  },
  };
  const ROW_H = 18;

  // header
  fillRect(L, y, W, ROW_H, BLK);
  const hcols: [string, any][] = [
    ["Libellé",     { ...C.lib, color: WHT, bold: true }],
    ["Qté",         { ...C.qte, color: WHT, bold: true, align: "right" }],
    ["Unité",       { ...C.uni, color: WHT, bold: true }],
    ["PU HT",       { ...C.pu,  color: WHT, bold: true, align: "right" }],
    ["Rem.",        { ...C.rem, color: WHT, bold: true, align: "right" }],
    ["Montant HT",  { ...C.mht, color: WHT, bold: true, align: "right" }],
    ["TVA",         { ...C.tva, color: WHT, bold: true, align: "right" }],
  ];
  for (const [txt, opt] of hcols) cell(txt, opt.x, y + 5, opt);
  y += ROW_H;

  // rows
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (i % 2 === 1) fillRect(L, y, W, ROW_H, BG2);
    cell(l.productName,                          C.lib.x, y+5, { width: C.lib.w });
    cell(l.quantity.toFixed(2),                  C.qte.x, y+5, { width: C.qte.w, align: "right" });
    cell(l.unit ?? "u",                          C.uni.x, y+5, { width: C.uni.w });
    cell(fmt(l.unitPriceHT),                     C.pu.x,  y+5, { width: C.pu.w,  align: "right" });
    cell(`${(l.discount ?? 0).toFixed(2)}%`,     C.rem.x, y+5, { width: C.rem.w, align: "right" });
    cell(fmt(l.lineTotal),                       C.mht.x, y+5, { width: C.mht.w, align: "right" });
    cell(`${l.vatRate.toFixed(2)}%`,             C.tva.x, y+5, { width: C.tva.w, align: "right" });
    y += ROW_H;
    if (y > 660) { doc.addPage(); y = 50; }
  }

  cell("Type de vente : Vente de services", L, y + 4, { size: 7.5, color: LGT });

  // ── BAS DE PAGE (position fixe) ───────────────────────────────────────────
  const BOT = PH - 290;

  // TVA gauche
  fillRect(L, BOT, 250, 17, BLK);
  cell("Détail de la TVA", L + 4, BOT + 4, { bold: true, size: 8, color: WHT });
  cell("Code",    L + 4,   BOT + 22, { bold: true, size: 8 });
  cell("Base HT", L + 70,  BOT + 22, { bold: true, size: 8, width: 65, align: "right" });
  cell("Taux",    L + 145, BOT + 22, { bold: true, size: 8, width: 35, align: "right" });
  cell("Montant", L + 185, BOT + 22, { bold: true, size: 8, width: 60, align: "right" });

  const vatMap = new Map<number, { base: number; vat: number }>();
  for (const l of lines) {
    const e = vatMap.get(l.vatRate) ?? { base: 0, vat: 0 };
    e.base += l.lineTotal;
    e.vat  += Math.round(l.lineTotal * l.vatRate / 100 * 100) / 100;
    vatMap.set(l.vatRate, e);
  }
  let tvy = BOT + 37;
  for (const [rate, v] of vatMap) {
    const label = rate === 20 ? "Normale" : rate === 10 ? "Intermédiaire" : `${rate}%`;
    cell(label,         L + 4,   tvy, { size: 8 });
    cell(fmt(v.base),   L + 70,  tvy, { size: 8, width: 65, align: "right" });
    cell(`${rate.toFixed(2)}%`, L + 145, tvy, { size: 8, width: 35, align: "right" });
    cell(fmt(v.vat),    L + 185, tvy, { size: 8, width: 60, align: "right" });
    tvy += 14;
  }

  const RY = tvy + 8;
  cell(`Règlement :`, L, RY, { bold: true, size: 8 });
  cell(paymentMethod || "Virement", L + 62, RY, { size: 8 });
  if (dueDate) {
    cell(`Échéance(s) :`, L, RY + 13, { bold: true, size: 8 });
    cell(`${fmt(totalTTC)} au ${fmtDate(dueDate)}`, L + 68, RY + 13, { size: 8 });
  }

  // Totaux droite
  const TX = 355, TW = 196;
  cell("Total HT",  TX, BOT + 4,  { size: 9, width: TW });
  cell(fmt(totalHT), TX, BOT + 4,  { size: 9, width: TW, align: "right" });
  cell("TVA",       TX, BOT + 18, { size: 9, width: TW });
  cell(fmt(totalVAT), TX, BOT + 18, { size: 9, width: TW, align: "right" });

  fillRect(TX - 4, BOT + 35, TW + 4, 26, BLK);
  cell("Total TTC",  TX, BOT + 43, { bold: true, size: 10, color: WHT, width: TW });
  cell(fmt(totalTTC), TX, BOT + 43, { bold: true, size: 10, color: WHT, width: TW, align: "right" });

  // acompte
  if (acompteAmount > 0) {
    let ay = BOT + 68;
    cell(`Acompte versé le ${fmtDate(acompteDate)} :`, TX, ay, { size: 8, width: TW });
    cell(`- ${fmt(acompteAmount / 100)}`, TX, ay, { size: 8, bold: true, width: TW, align: "right" });
    ay += 13;
    cell("Reste à payer :", TX, ay, { size: 9, bold: true, width: TW });
    cell(fmt((resteAPayer ?? 0) / 100), TX, ay, { size: 9, bold: true, width: TW, align: "right" });
  }

  // lettres + conditions
  const LY = RY + 30;
  const entiers = Math.floor(totalTTC);
  const cts = Math.round((totalTTC - entiers) * 100);
  const words = toWords(entiers) + (cts > 0 ? ` euros et ${toWords(cts)} centimes` : " euros");
  cell(`Le montant total s'élève à ${words}`, L, LY, { size: 7.5, color: BLK, width: W });
  if (company.paymentConditions) {
    cell(company.paymentConditions, L, LY + 11, { size: 7, color: LGT, width: W });
  }

  // ── RIB centré ───────────────────────────────────────────────────────────
  const ribY = PH - 72;
  const ribTxt = `RIB  —  Titulaire : ${company.bankOwner || "LES CRE'ARTEURS"}   |   Banque : ${company.bankName || "CIC MONTROUGE"}   |   IBAN : ${company.iban || "FR76 3006 6107 3100 0201 1710 183"}   |   BIC : ${company.bic || "CMCIFRPP"}`;
  doc.fontSize(7).fillColor(GRY).font("Helvetica");
  const rw = doc.widthOfString(ribTxt);
  doc.text(ribTxt, L + (W - rw) / 2, ribY, { lineBreak: false });

  // ── FOOTER mentions légales ───────────────────────────────────────────────
  if (company.legalMentions) {
    doc.fontSize(6.5).fillColor(LGT).font("Helvetica")
       .text(company.legalMentions, L, PH - 48, { width: W, align: "center", lineBreak: false });
  }

  doc.end();
  return done;
}
