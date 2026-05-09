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

const C = {
  accent:     "#3FA8B0",
  accentDark: "#2E8A91",
  accentLight:"#E8F5F6",
  text:       "#1f2937",
  muted:      "#6b7280",
  border:     "#d1d5db",
  white:      "#ffffff",
  rowAlt:     "#f9fafb",
};

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function eur(cents: number, decimals = 2): string {
  return ((cents ?? 0) / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }) + " €";
}

// Pour les valeurs déjà en euros (lignes de devis/facture)
function eurVal(euros: number, decimals = 2): string {
  return (euros ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }) + " €";
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

  const doc = new PDFDocument({ size:"A4", margins:{top:40,bottom:60,left:40,right:40}, bufferPages:true });
  const buffers: Buffer[] = [];
  doc.on("data", b => buffers.push(b));
  const pdfPromise = new Promise<Buffer>(resolve => doc.on("end", () => resolve(Buffer.concat(buffers))));

  const L = 40, R = 555, W = 515;

  // ─── HEADER ──────────────────────────────────────────────────────────────
  const tradeName = company.tradeName || company.companyName;
  doc.fontSize(12).fillColor(C.accent).font("Helvetica-Bold").text(tradeName, L, 40);

  doc.fontSize(8.5).fillColor(C.text).font("Helvetica");
  let cy = 56;
  if (company.address) {
    for (const line of (company.address as string).split("\n")) { doc.text(line, L, cy); cy += 11; }
  }
  if (company.email)  { doc.text(`Email : ${company.email}`, L, cy); cy += 11; }
  if (company.siret)  { doc.text(`Siret : ${company.siret}`, L, cy); cy += 11; }
  if (company.vatNumber && company.vatNumber !== "NC") {
    doc.text(`N° TVA : ${company.vatNumber}`, L, cy);
  }

  // Titre document (droite)
  doc.fontSize(30).fillColor(C.accent).font("Helvetica-Bold")
     .text(docTitle, 300, 38, { width: 255, align:"right" });

  // Infos doc (droite)
  let iy = 80;
  doc.fontSize(9).fillColor(C.text).font("Helvetica");
  doc.text(`N° : ${number}`, 300, iy, { width:255, align:"right" }); iy += 13;
  doc.text(`Date d'émission : ${formatDate(issueDate)}`, 300, iy, { width:255, align:"right" }); iy += 13;
  doc.text(`N° TVA : ${company.vatNumber || "NC"}`, 300, iy, { width:255, align:"right" }); iy += 13;
  if (clientNumber) { doc.text(`N° client : ${clientNumber}`, 300, iy, { width:255, align:"right" }); }

  // ─── BLOC CLIENT ─────────────────────────────────────────────────────────
  const clientY = 170;
  doc.fontSize(10).fillColor(C.accent).font("Helvetica-Bold")
     .text(client.name, 320, clientY, { width:235 });
  doc.fontSize(8.5).fillColor(C.text).font("Helvetica");
  let cly = clientY + 14;
  if (client.address) {
    for (const line of (client.address as string).split("\n")) { doc.text(line, 320, cly, { width:235 }); cly += 11; }
  }
  if (client.siret) { doc.text(`Siret : ${client.siret}`, 320, cly, { width:235 }); cly += 11; }
  if (client.email) { doc.text(client.email, 320, cly, { width:235 }); cly += 11; }

  // Ligne séparatrice
  let y = Math.max(cly + 20, 260);
  doc.moveTo(L, y).lineTo(R, y).strokeColor(C.border).lineWidth(0.5).stroke();
  y += 12;

  // ─── RÉFÉRENCE & DESCRIPTION ─────────────────────────────────────────────
  if (reference) {
    doc.fontSize(9).fillColor(C.text).font("Helvetica-Bold")
       .text(`Réf. : `, L, y, { continued:true })
       .font("Helvetica").text(reference);
    y += 14;
  }
  if (description) {
    doc.fontSize(9).fillColor(C.text).font("Helvetica")
       .text(description, L, y, { width:W });
    y += doc.heightOfString(description, { width:W }) + 10;
  } else { y += 6; }

  // ─── TABLEAU ─────────────────────────────────────────────────────────────
  const cols = {
    libelle: { x: L+6,   w: 195 },
    qte:     { x: L+205, w: 38  },
    unite:   { x: L+247, w: 32  },
    pu:      { x: L+283, w: 68  },
    rem:     { x: L+355, w: 38  },
    montant: { x: L+397, w: 68  },
    tva:     { x: L+469, w: 42  },
  };

  // Header tableau — fond accent, texte blanc
  const rowH = 20;
  doc.rect(L, y, W, rowH).fill(C.accent);
  doc.fontSize(8.5).fillColor(C.white).font("Helvetica-Bold");
  doc.text("Libellé",     cols.libelle.x, y+6);
  doc.text("Qté",         cols.qte.x,     y+6, { width:cols.qte.w,     align:"right" });
  doc.text("Unité",       cols.unite.x,   y+6, { width:cols.unite.w                  });
  doc.text("PU HT",       cols.pu.x,      y+6, { width:cols.pu.w,      align:"right" });
  doc.text("Rem.",        cols.rem.x,     y+6, { width:cols.rem.w,     align:"right" });
  doc.text("Montant HT",  cols.montant.x, y+6, { width:cols.montant.w, align:"right" });
  doc.text("TVA",         cols.tva.x,     y+6, { width:cols.tva.w,     align:"right" });
  y += rowH;

  // Lignes
  doc.fontSize(8.5).fillColor(C.text).font("Helvetica");
  lines.forEach((line, i) => {
    const textH = Math.max(doc.heightOfString(line.productName, { width:cols.libelle.w }), 10);
    const lh = textH + 10;
    if (i % 2 === 1) { doc.rect(L, y, W, lh).fill(C.rowAlt); }
    doc.fillColor(C.text);
    doc.text(line.productName,                                              cols.libelle.x, y+5, { width:cols.libelle.w });
    doc.text(line.quantity.toLocaleString("fr-FR",{minimumFractionDigits:2}), cols.qte.x, y+5, { width:cols.qte.w,     align:"right" });
    doc.text(line.unit ?? "u",                                             cols.unite.x,   y+5, { width:cols.unite.w                  });
    doc.text(eurVal(line.unitPriceHT, 2),                                     cols.pu.x,      y+5, { width:cols.pu.w,      align:"right" });
    doc.text(`${(line.discount??0).toFixed(2)}%`,                          cols.rem.x,     y+5, { width:cols.rem.w,     align:"right" });
    doc.text(eurVal(line.lineTotal),                                           cols.montant.x, y+5, { width:cols.montant.w, align:"right" });
    doc.text(`${line.vatRate.toFixed(2)}%`,                                cols.tva.x,     y+5, { width:cols.tva.w,     align:"right" });
    // Bordure basse
    doc.moveTo(L, y+lh).lineTo(R, y+lh).strokeColor(C.border).lineWidth(0.3).stroke();
    y += lh;
    if (y > 680) { doc.addPage(); y = 50; }
  });

  y += 8;
  doc.fontSize(8).fillColor(C.muted).font("Helvetica")
     .text("Type de vente : Vente de services", L, y);
  y += 20;

  // ─── BAS DE PAGE (dynamique) ─────────────────────────────────────────────
  // On calcule la hauteur nécessaire en bas et on se positionne au moins à y ou à 580
  const bottomY = Math.max(y + 10, 570);

  // ── Détail TVA (gauche) ──
  doc.rect(L, bottomY, 255, 20).fill(C.accent);
  doc.fontSize(9).fillColor(C.white).font("Helvetica-Bold")
     .text("Détail de la TVA", L+6, bottomY+6);

  let tvaY = bottomY + 20;
  // Sous-header TVA
  doc.fontSize(8.5).fillColor(C.text).font("Helvetica-Bold");
  doc.text("Code",    L+6,   tvaY+4);
  doc.text("Base HT", L+70,  tvaY+4, { width:70, align:"right" });
  doc.text("Taux",    L+150, tvaY+4, { width:40, align:"right" });
  doc.text("Montant", L+195, tvaY+4, { width:55, align:"right" });
  tvaY += 16;

  const vatByRate = new Map<number, { base: number; vat: number }>();
  for (const line of lines) {
    const e = vatByRate.get(line.vatRate) ?? { base:0, vat:0 };
    e.base += line.lineTotal;
    e.vat  += Math.round(line.lineTotal * line.vatRate / 100);
    vatByRate.set(line.vatRate, e);
  }
  doc.font("Helvetica").fillColor(C.text);
  for (const [rate, vals] of vatByRate.entries()) {
    const label = rate===20?"Normale":rate===10?"Intermédiaire":rate===5.5?"Réduite":`${rate}%`;
    doc.text(label,             L+6,   tvaY+4);
    doc.text(eurVal(vals.base),    L+70,  tvaY+4, { width:70, align:"right" });
    doc.text(`${rate.toFixed(2)}%`, L+150, tvaY+4, { width:40, align:"right" });
    doc.text(eurVal(vals.vat),     L+195, tvaY+4, { width:55, align:"right" });
    tvaY += 15;
  }

  // ── Règlement ──
  const regY = tvaY + 10;
  doc.rect(L, regY, 80, 16).fill(C.accentLight);
  doc.fontSize(8.5).fillColor(C.accent).font("Helvetica-Bold").text("Règlement", L+4, regY+4);
  doc.font("Helvetica").fillColor(C.text).text(paymentMethod || "Virement", L+88, regY+4);

  const echeY = regY + 18;
  doc.rect(L, echeY, 80, 16).fill(C.accentLight);
  doc.fontSize(8.5).fillColor(C.accent).font("Helvetica-Bold").text("Echéance(s)", L+4, echeY+4);
  if (dueDate) {
    doc.font("Helvetica").fillColor(C.text)
       .text(`${eurVal(totalTTC)} au ${formatDate(dueDate)}`, L+88, echeY+4);
  }

  // ── Totaux (droite) ──
  const totX = 360, totW = 195;
  doc.fontSize(9).fillColor(C.text).font("Helvetica");
  doc.text("Total HT", totX, bottomY+4);
  doc.text(eurVal(totalHT), totX, bottomY+4, { width:totW, align:"right" });

  doc.text("TVA", totX, bottomY+20);
  doc.text(eurVal(totalVAT), totX, bottomY+20, { width:totW, align:"right" });

  // Total TTC — bandeau accent
  doc.rect(totX-5, bottomY+40, totW+5, 28).fill(C.accent);
  doc.fontSize(11).fillColor(C.white).font("Helvetica-Bold");
  doc.text("Total TTC", totX, bottomY+49);
  doc.text(eurVal(totalTTC), totX, bottomY+49, { width:totW, align:"right" });

  // ── Montant en lettres ──
  const ttcVal = totalTTC / 100;
  const entiers = Math.floor(ttcVal);
  const cents = Math.round((ttcVal - entiers) * 100);
  const enLettres = nbEnLettres(entiers) + (cents > 0 ? ` euros et ${nbEnLettres(cents)} centimes` : " euros");
  const lettresY = echeY + 40;
  doc.fontSize(8).fillColor(C.text).font("Helvetica")
     .text(`Le montant total s'élève à ${enLettres}`, L, lettresY, { width:W });

  // ── Conditions de paiement ──
  if (company.paymentConditions) {
    doc.fontSize(7).fillColor(C.muted).font("Helvetica")
       .text(company.paymentConditions, L, lettresY+14, { width:W });
  }

  // ─── FOOTER ──────────────────────────────────────────────────────────────
  const pageH = doc.page.height;
  doc.moveTo(L, pageH-50).lineTo(R, pageH-50).strokeColor(C.border).lineWidth(0.5).stroke();
  if (company.legalMentions) {
    doc.fontSize(7).fillColor(C.muted).font("Helvetica")
       .text(company.legalMentions, L, pageH-44, { width:W, align:"center" });
  }

  doc.end();
  return pdfPromise;
}
