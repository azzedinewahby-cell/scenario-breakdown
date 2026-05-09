import PDFDocument from "pdfkit";
import path from "path";
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

// ─── Palette Noir & Blanc ────────────────────────────────────────────────────
const C = {
  black:      "#000000",
  dark:       "#1a1a1a",
  mid:        "#555555",
  light:      "#999999",
  border:     "#cccccc",
  bg:         "#f5f5f5",
  white:      "#ffffff",
};

function eurVal(euros: number, decimals = 2): string {
  const val = (euros ?? 0).toFixed(decimals);
  const [int, dec] = val.split(".");
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${intFormatted},${dec} \u20ac`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function nbEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const units = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf",
                 "dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
  const tens  = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];
  const lt100 = (x: number): string => {
    if (x < 20) return units[x];
    const t = Math.floor(x/10), u = x%10;
    if (t===7||t===9) return tens[t]+"-"+(t===7&&u===1?"et-":"")+units[10+u];
    if (u===0) return tens[t]+(t===8?"s":"");
    if (u===1&&t<8) return tens[t]+"-et-un";
    return tens[t]+"-"+units[u];
  };
  const lt1000 = (x: number): string => {
    if (x<100) return lt100(x);
    const c=Math.floor(x/100),r=x%100;
    const cent=c===1?"cent":units[c]+" cent"+(r===0?"s":"");
    return r===0?cent:cent+" "+lt100(r);
  };
  if (n<1000) return lt1000(n);
  if (n<1000000) {
    const k=Math.floor(n/1000),r=n%1000;
    return (k===1?"mille":lt1000(k)+" mille")+(r===0?"":" "+lt1000(r));
  }
  return n.toString();
}

export async function generateDocumentPdf(input: GeneratePdfInput): Promise<Buffer> {
  const { type, number, issueDate, dueDate, reference, description,
          client, clientNumber, company, lines, totalHT, totalVAT, totalTTC, paymentMethod } = input;

  const docTitle = { facture:"FACTURE", devis:"DEVIS", avoir:"AVOIR" }[type];

  const doc = new PDFDocument({ size:"A4", margins:{top:36,bottom:55,left:40,right:40}, bufferPages:true });
  const buffers: Buffer[] = [];
  doc.on("data", b => buffers.push(b));
  const pdfPromise = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(buffers))));

  const L = 40, R = 555, W = 515;
  const pageH = doc.page.height; // 841.89

  // ─── LOGO + EN-TÊTE SOCIÉTÉ ───────────────────────────────────────────────
  const logoPath = path.join(process.cwd(), "server", "assets", "logo.png");
  try {
    doc.image(logoPath, L, 36, { width: 45 }); // ratio préservé, pas de height
  } catch {}

  const tradeName = company.tradeName || company.companyName;
  doc.fontSize(11).fillColor(C.black).font("Helvetica-Bold").text(tradeName, L + 56, 36);
  doc.fontSize(8).fillColor(C.mid).font("Helvetica");
  let cy = 50;
  if (company.address) {
    for (const line of (company.address as string).split("\n")) { doc.text(line, L + 56, cy); cy += 10; }
  }
  if (company.email) { doc.text(`Email : ${company.email}`, L + 56, cy); cy += 10; }
  doc.text(`Siret : ${company.siret}`, L + 56, cy); cy += 10;

  // Titre document (droite)
  doc.fontSize(26).fillColor(C.black).font("Helvetica-Bold")
     .text(docTitle, 300, 34, { width: 255, align: "right" });

  // Infos doc (droite)
  let iy = 68;
  doc.fontSize(8.5).fillColor(C.dark).font("Helvetica");
  doc.text(`N\u00b0 : ${number}`, 300, iy, { width:255, align:"right" }); iy += 12;
  doc.text(`Date d\u2019\u00e9mission : ${formatDate(issueDate)}`, 300, iy, { width:255, align:"right" }); iy += 12;
  doc.text(`N\u00b0 TVA : ${company.vatNumber || "NC"}`, 300, iy, { width:255, align:"right" }); iy += 12;
  if (clientNumber) { doc.text(`N\u00b0 client : ${clientNumber}`, 300, iy, { width:255, align:"right" }); }

  // ─── BLOC CLIENT ─────────────────────────────────────────────────────────
  const clientY = 155;
  doc.fontSize(10).fillColor(C.black).font("Helvetica-Bold")
     .text(client.name, 320, clientY, { width:235 });
  doc.fontSize(8.5).fillColor(C.dark).font("Helvetica");
  let cly = clientY + 13;
  if (client.address) {
    for (const line of (client.address as string).split("\n")) { doc.text(line, 320, cly, { width:235 }); cly += 10; }
  }
  if (client.siret) { doc.text(`Siret : ${client.siret}`, 320, cly, { width:235 }); cly += 10; }
  if (client.email) { doc.text(client.email, 320, cly, { width:235 }); cly += 10; }

  // Ligne séparatrice
  let y = Math.max(cly + 12, 230);
  doc.save().moveTo(L, y).lineTo(R, y).strokeColor(C.border).lineWidth(0.5).stroke().restore();
  y += 10;

  // ─── RÉFÉRENCE & DESCRIPTION ─────────────────────────────────────────────
  if (reference) {
    doc.fontSize(8.5).fillColor(C.dark).font("Helvetica-Bold")
       .text(`R\u00e9f. : `, L, y, { continued:true })
       .font("Helvetica").text(reference, { lineBreak:false });
    y += 12;
  }
  if (description) {
    doc.fontSize(8.5).fillColor(C.dark).font("Helvetica")
       .text(description, L, y, { width:W });
    y += doc.heightOfString(description, { width:W }) + 8;
  } else { y += 4; }

  // ─── TABLEAU ─────────────────────────────────────────────────────────────
  const cols = {
    libelle: { x: L+5,   w: 190 },
    qte:     { x: L+198, w: 36  },
    unite:   { x: L+237, w: 30  },
    pu:      { x: L+270, w: 70  },
    rem:     { x: L+343, w: 36  },
    montant: { x: L+382, w: 68  },
    tva:     { x: L+453, w: 58  },
  };

  // Header tableau — fond noir, texte blanc
  doc.rect(L, y, W, 18).fill(C.black);
  doc.fontSize(8).fillColor(C.white).font("Helvetica-Bold");
  doc.text("Libellé",      cols.libelle.x, y+5, { lineBreak:false });
  doc.text("Qté",          cols.qte.x,     y+5, { width:cols.qte.w,     align:"right", lineBreak:false });
  doc.text("Unité",        cols.unite.x,   y+5, { lineBreak:false });
  doc.text("PU HT",        cols.pu.x,      y+5, { width:cols.pu.w,      align:"right", lineBreak:false });
  doc.text("Rem.",         cols.rem.x,     y+5, { width:cols.rem.w,     align:"right", lineBreak:false });
  doc.text("Montant HT",   cols.montant.x, y+5, { width:cols.montant.w, align:"right", lineBreak:false });
  doc.text("TVA",          cols.tva.x,     y+5, { width:cols.tva.w,     align:"right", lineBreak:false });
  y += 18;

  // Lignes
  lines.forEach((line, i) => {
    const lh = 16;
    if (i % 2 === 1) { doc.rect(L, y, W, lh).fill(C.bg); }
    doc.fillColor(C.dark).font("Helvetica").fontSize(8);
    doc.text(line.productName,                                                 cols.libelle.x, y+4, { width:cols.libelle.w, lineBreak:false });
    doc.text(line.quantity.toFixed(2),                                         cols.qte.x,     y+4, { width:cols.qte.w,     align:"right", lineBreak:false });
    doc.text(line.unit ?? "u",                                                 cols.unite.x,   y+4, { lineBreak:false });
    doc.text(eurVal(line.unitPriceHT, 2),                                      cols.pu.x,      y+4, { width:cols.pu.w,      align:"right", lineBreak:false });
    doc.text(`${(line.discount??0).toFixed(2)}%`,                              cols.rem.x,     y+4, { width:cols.rem.w,     align:"right", lineBreak:false });
    doc.text(eurVal(line.lineTotal),                                            cols.montant.x, y+4, { width:cols.montant.w, align:"right", lineBreak:false });
    doc.text(`${line.vatRate.toFixed(2)}%`,                                    cols.tva.x,     y+4, { width:cols.tva.w,     align:"right", lineBreak:false });
    doc.save().moveTo(L, y+lh).lineTo(R, y+lh).strokeColor(C.border).lineWidth(0.3).stroke().restore();
    y += lh;
  });

  y += 6;
  doc.fontSize(7.5).fillColor(C.light).font("Helvetica")
     .text("Type de vente : Vente de services", L, y, { lineBreak:false });

  // ─── BAS DE PAGE (positionné fixe par rapport au bas) ────────────────────
  const bottomY = pageH - 220;

  // ── Détail TVA (gauche) ──
  doc.rect(L, bottomY, 250, 16).fill(C.black);
  doc.fontSize(8).fillColor(C.white).font("Helvetica-Bold")
     .text("Détail de la TVA", L+4, bottomY+4, { lineBreak:false });

  let tvaY = bottomY + 16;
  doc.fontSize(7.5).fillColor(C.dark).font("Helvetica-Bold");
  doc.text("Code",    L+4,   tvaY+3, { lineBreak:false });
  doc.text("Base HT", L+70,  tvaY+3, { width:65, align:"right", lineBreak:false });
  doc.text("Taux",    L+145, tvaY+3, { width:35, align:"right", lineBreak:false });
  doc.text("Montant", L+185, tvaY+3, { width:60, align:"right", lineBreak:false });
  tvaY += 14;

  const vatByRate = new Map<number, { base: number; vat: number }>();
  for (const line of lines) {
    const e = vatByRate.get(line.vatRate) ?? { base:0, vat:0 };
    e.base += line.lineTotal;
    e.vat  += Math.round(line.lineTotal * line.vatRate / 100 * 100) / 100;
    vatByRate.set(line.vatRate, e);
  }
  doc.font("Helvetica").fillColor(C.dark).fontSize(7.5);
  for (const [rate, vals] of vatByRate.entries()) {
    const label = rate===20?"Normale":rate===10?"Intermédiaire":rate===5.5?"Réduite":`${rate}%`;
    doc.text(label,             L+4,   tvaY+2, { lineBreak:false });
    doc.text(eurVal(vals.base), L+70,  tvaY+2, { width:65, align:"right", lineBreak:false });
    doc.text(`${rate.toFixed(2)}%`, L+145, tvaY+2, { width:35, align:"right", lineBreak:false });
    doc.text(eurVal(vals.vat),  L+185, tvaY+2, { width:60, align:"right", lineBreak:false });
    tvaY += 13;
  }

  // ── Règlement / Échéance ──
  const regY = tvaY + 6;
  doc.fontSize(8).fillColor(C.dark).font("Helvetica-Bold").text("Règlement :", L, regY, { continued:true })
     .font("Helvetica").text(`  ${paymentMethod || "Virement"}`, { lineBreak:false });
  if (dueDate) {
    doc.font("Helvetica-Bold").text("Échéance(s) :", L, regY + 12, { continued:true })
       .font("Helvetica").text(`  ${eurVal(totalTTC)} au ${formatDate(dueDate)}`, { lineBreak:false });
  }

  // ── Totaux (droite) ──
  const totX = 355, totW = 200;
  doc.fontSize(9).fillColor(C.dark).font("Helvetica");
  doc.text("Total HT",  totX, bottomY+4,  { width:totW, lineBreak:false });
  doc.text(eurVal(totalHT),  totX, bottomY+4,  { width:totW, align:"right", lineBreak:false });
  doc.text("TVA",       totX, bottomY+18, { width:totW, lineBreak:false });
  doc.text(eurVal(totalVAT), totX, bottomY+18, { width:totW, align:"right", lineBreak:false });

  // Total TTC — bandeau noir
  doc.rect(totX-5, bottomY+36, totW+5, 24).fill(C.black);
  doc.fontSize(10).fillColor(C.white).font("Helvetica-Bold");
  doc.text("Total TTC", totX, bottomY+43, { lineBreak:false });
  doc.text(eurVal(totalTTC), totX, bottomY+43, { width:totW, align:"right", lineBreak:false });

  // ── Montant en lettres ──
  const entiers = Math.floor(totalTTC);
  const centimes = Math.round((totalTTC - entiers) * 100);
  const enLettres = nbEnLettres(entiers) + (centimes > 0 ? ` euros et ${nbEnLettres(centimes)} centimes` : " euros");
  const lettresY = regY + 28;
  doc.fontSize(7.5).fillColor(C.dark).font("Helvetica")
     .text(`Le montant total s\u2019\u00e9l\u00e8ve \u00e0 ${enLettres}`, L, lettresY, { width: W, lineBreak: false });

  // ── Conditions ──
  if (company.paymentConditions) {
    doc.fontSize(7).fillColor(C.light).font("Helvetica")
       .text(company.paymentConditions, L, lettresY + 11, { width: W, height: 28, lineBreak: true });
  }

  // ─── RIB + FOOTER : toujours sur la page 1 ───────────────────────────────
  // On revient sur la page 0 et on dessine à coordonnées absolues fixes
  doc.switchToPage(0);

  const ribY = pageH - 78;
  doc.save().moveTo(L, ribY - 4).lineTo(R, ribY - 4)
     .strokeColor(C.border).lineWidth(0.5).stroke().restore();

  doc.fontSize(7).fillColor(C.dark).font("Helvetica-Bold")
     .text("RIB \u2014 ", L, ribY, { continued: true })
     .font("Helvetica")
     .text(
       `Titulaire : ${company.bankOwner || "LES CRE'ARTEURS"}   |   Banque : ${company.bankName || "CIC MONTROUGE"}   |   IBAN : ${company.iban || "FR76 3006 6107 3100 0201 1710 183"}   |   BIC : ${company.bic || "CMCIFRPP"}`,
       { lineBreak: false }
     );

  doc.save().moveTo(L, pageH - 52).lineTo(R, pageH - 52)
     .strokeColor(C.border).lineWidth(0.5).stroke().restore();
  if (company.legalMentions) {
    doc.fontSize(6.5).fillColor(C.light).font("Helvetica")
       .text(company.legalMentions, L, pageH - 47, { width: W, align: "center", lineBreak: false });
  }

  // Supprimer les pages supplémentaires si pdfkit en a créé
  const range = doc.bufferedPageRange();
  for (let i = range.start + range.count - 1; i > 0; i--) {
    // pdfkit ne permet pas de supprimer une page, mais on peut la vider
    doc.switchToPage(i);
    // Couvrir toute la page en blanc pour masquer tout contenu parasite
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.white);
  }
  doc.switchToPage(0);

  doc.end();
  return pdfPromise;
}
