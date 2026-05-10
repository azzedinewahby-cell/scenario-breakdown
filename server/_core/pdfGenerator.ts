import PDFDocument from "pdfkit";
import type { Client } from "../../drizzle/schema";

type DocumentType = "facture" | "devis" | "avoir";
type Line = { productName: string; quantity: number; unit?: string; unitPriceHT: number; vatRate: number; discount?: number; lineTotal: number; };
type Input = {
  type: DocumentType; number: string; issueDate: Date; dueDate?: Date | null;
  reference?: string | null; description?: string | null; status?: string;
  client: Client; clientNumber?: string; company: any;
  lines: Line[]; totalHT: number; totalVAT: number; totalTTC: number;
  paymentMethod?: string | null; notes?: string | null;
  acompteAmount?: number; acompteDate?: Date | null; resteAPayer?: number;
};

const f = (n: number, d = 2) => {
  const s = n.toFixed(d), [i, c] = s.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + c + " \u20ac";
};
const fd = (d: any) => d ? new Date(d).toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit",year:"numeric"}) : "";
const words = (n: number): string => {
  if (n===0) return "zéro";
  const u=["","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
  const t=["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];
  const lt100=(x:number)=>{if(x<20)return u[x];const[q,r]=[Math.floor(x/10),x%10];if(q===7||q===9)return t[q]+"-"+(q===7&&r===1?"et-":"")+u[10+r];if(r===0)return t[q]+(q===8?"s":"");if(r===1&&q<8)return t[q]+"-et-un";return t[q]+"-"+u[r];};
  const lt1k=(x:number)=>{if(x<100)return lt100(x);const[c,r]=[Math.floor(x/100),x%100];const h=c===1?"cent":u[c]+" cent"+(r===0?"s":"");return r===0?h:h+" "+lt100(r);};
  if(n<1000)return lt1k(n);const[k,r]=[Math.floor(n/1000),n%1000];return(k===1?"mille":lt1k(k)+" mille")+(r===0?"":" "+lt1k(r));
};

export async function generateDocumentPdf(input: Input): Promise<Buffer> {
  const { type, number, issueDate, dueDate, client, company, lines,
          totalHT, totalVAT, totalTTC, paymentMethod,
          acompteAmount=0, acompteDate, resteAPayer=0 } = input;

  const TITLE = {facture:"FACTURE",devis:"DEVIS",avoir:"AVOIR"}[type];
  const doc = new PDFDocument({ size:"A4", margins:{top:0,bottom:0,left:0,right:0}, bufferPages:true });
  const chunks: Buffer[] = [];
  doc.on("data", c => chunks.push(c));
  const done = new Promise<Buffer>(res => doc.on("end", () => res(Buffer.concat(chunks))));

  const PW = 595.28, PH = 841.89;
  const ML = 44, MR = 551, MW = MR - ML;

  // ── bande noire du haut ───────────────────────────────────────────────────
  doc.rect(0, 0, PW, 8).fill("#111111");

  // ── en-tête émetteur ─────────────────────────────────────────────────────
  const tradeName = (company.tradeName || company.companyName || "").toUpperCase();
  doc.fontSize(13).fillColor("#111111").font("Helvetica-Bold").text(tradeName, ML, 22, {lineBreak:false});
  doc.fontSize(8).fillColor("#666666").font("Helvetica");
  let hy = 39;
  for (const l of [...(company.address||"").split("\n"), company.email ? `Email : ${company.email}` : null, company.siret ? `Siret : ${company.siret}` : null].filter(Boolean) as string[]) {
    doc.text(l, ML, hy, {lineBreak:false}); hy += 10;
  }

  // ── titre + numéro (droite) ───────────────────────────────────────────────
  doc.fontSize(34).fillColor("#111111").font("Helvetica-Bold").text(TITLE, 0, 18, {width: MR, align:"right", lineBreak:false});
  doc.fontSize(9).fillColor("#111111").font("Helvetica");
  let iy = 60;
  for (const [lbl, val] of [
    ["N°", number],
    ["Date", fd(issueDate)],
    ["N° TVA", company.vatNumber||"NC"],
    ...(input.clientNumber ? [["N° client", input.clientNumber]] : []),
  ] as [string,string][]) {
    doc.font("Helvetica-Bold").text(lbl, 0, iy, {width: MR - 2, align:"right", lineBreak:false});
    const lw = doc.widthOfString(lbl);
    doc.font("Helvetica").text(` : ${val}`, MR - lw - 2, iy, {lineBreak:false});
    iy += 12;
  }

  // ── bloc client ───────────────────────────────────────────────────────────
  const CY = 130;
  doc.rect(ML + MW * 0.55, CY - 6, MW * 0.45, 1).fill("#111111");
  doc.fontSize(10).fillColor("#111111").font("Helvetica-Bold").text(client.name, ML + MW * 0.55 + 2, CY + 4, {width: MW*0.45-4, lineBreak:false});
  let cy = CY + 18;
  doc.fontSize(8.5).font("Helvetica").fillColor("#444444");
  for (const l of [...(client.address||"").split("\n"), client.siret?`Siret : ${client.siret}`:null, client.email||null].filter(Boolean) as string[]) {
    doc.text(l, ML + MW * 0.55 + 2, cy, {width: MW*0.45-4, lineBreak:false}); cy += 11;
  }

  // ── ligne séparatrice ─────────────────────────────────────────────────────
  let y = Math.max(cy + 12, 215);
  doc.rect(ML, y, MW, 0.5).fill("#dddddd"); y += 12;

  if (input.reference) { doc.fontSize(8.5).fillColor("#111111").font("Helvetica-Bold").text(`Réf. : ${input.reference}`, ML, y, {lineBreak:false}); y += 14; }
  if (input.description) { doc.fontSize(8.5).fillColor("#333333").font("Helvetica").text(input.description, ML, y, {width:MW, lineBreak:false}); y += 14; }

  // ── tableau ───────────────────────────────────────────────────────────────
  const RH = 17;
  const cols = [
    {label:"Libellé",    x:ML+3,    w:185, align:"left"  as const},
    {label:"Qté",        x:ML+192,  w:36,  align:"right" as const},
    {label:"Unité",      x:ML+232,  w:42,  align:"left"  as const},
    {label:"PU HT",      x:ML+278,  w:64,  align:"right" as const},
    {label:"Rem.",       x:ML+346,  w:36,  align:"right" as const},
    {label:"Montant HT", x:ML+386,  w:68,  align:"right" as const},
    {label:"TVA",        x:ML+458,  w:48,  align:"right" as const},
  ];

  // header
  doc.rect(ML, y, MW, RH).fill("#111111");
  for (const c of cols) doc.fontSize(8).fillColor("#ffffff").font("Helvetica-Bold").text(c.label, c.x, y+5, {width:c.w, align:c.align, lineBreak:false});
  y += RH;

  // lignes
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (i%2===1) doc.rect(ML, y, MW, RH).fill("#f6f6f6");
    const vals = [
      {v:l.productName, c:cols[0]},
      {v:l.quantity.toFixed(2), c:cols[1]},
      {v:l.unit||"u", c:cols[2]},
      {v:f(l.unitPriceHT), c:cols[3]},
      {v:`${(l.discount??0).toFixed(2)}%`, c:cols[4]},
      {v:f(l.lineTotal), c:cols[5]},
      {v:`${l.vatRate.toFixed(2)}%`, c:cols[6]},
    ];
    for (const {v,c} of vals) doc.fontSize(8).fillColor("#222222").font("Helvetica").text(v, c.x, y+5, {width:c.w, align:c.align, lineBreak:false});
    doc.rect(ML, y+RH-0.3, MW, 0.3).fill("#e0e0e0");
    y += RH;
    if (y > 640) { doc.addPage(); doc.rect(0,0,PW,8).fill("#111111"); y=30; }
  }
  doc.fontSize(7.5).fillColor("#aaaaaa").font("Helvetica").text("Type de vente : Vente de services", ML, y+5, {lineBreak:false});

  // ── totaux (juste après le contenu) ──────────────────────────────────────
  const BY = y + 20;

  // TVA
  doc.rect(ML, BY, 248, RH).fill("#111111");
  doc.fontSize(8).fillColor("#ffffff").font("Helvetica-Bold").text("Détail de la TVA", ML+4, BY+5, {lineBreak:false});
  doc.fontSize(7.5).fillColor("#222222");
  const tvh = BY+RH;
  doc.font("Helvetica-Bold");
  [[4,"Code"],[70,"Base HT"],[148,"Taux"],[192,"Montant"]].forEach(([x,lbl])=>
    doc.text(lbl as string, ML+(x as number), tvh+4, {lineBreak:false, width:60})
  );

  const vatMap = new Map<number,{b:number,v:number}>();
  for (const l of lines) {
    const e = vatMap.get(l.vatRate) ?? {b:0,v:0};
    e.b += l.lineTotal; e.v += Math.round(l.lineTotal*l.vatRate/100*100)/100;
    vatMap.set(l.vatRate, e);
  }
  let tvy = tvh + RH;
  doc.font("Helvetica");
  for (const [rate,v] of vatMap) {
    const lbl = rate===20?"Normale":rate===10?"Intermédiaire":`${rate}%`;
    doc.text(lbl,            ML+4,   tvy, {lineBreak:false});
    doc.text(f(v.b),         ML+70,  tvy, {width:60, align:"right", lineBreak:false});
    doc.text(`${rate.toFixed(2)}%`, ML+148, tvy, {width:40, lineBreak:false});
    doc.text(f(v.v),         ML+192, tvy, {width:56, align:"right", lineBreak:false});
    tvy += 13;
  }

  const RG = tvy + 8;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#111111").text("Règlement :", ML, RG, {lineBreak:false});
  doc.font("Helvetica").text(`  ${paymentMethod||"Virement"}`, ML+64, RG, {lineBreak:false});
  if (dueDate) {
    doc.font("Helvetica-Bold").text("Échéance(s) :", ML, RG+13, {lineBreak:false});
    doc.font("Helvetica").text(`  ${f(totalTTC)} au ${fd(dueDate)}`, ML+70, RG+13, {lineBreak:false});
  }

  // totaux droite
  const TX = 358, TW = MR - TX;
  doc.fontSize(9).fillColor("#222222").font("Helvetica");
  [[BY+4,"Total HT",totalHT],[BY+18,"TVA",totalVAT]].forEach(([yy,lbl,val])=>{
    doc.text(lbl as string, TX, yy as number, {width:TW, lineBreak:false});
    doc.text(f(val as number), TX, yy as number, {width:TW, align:"right", lineBreak:false});
  });

  // Total TTC bandeau
  doc.rect(TX-4, BY+36, TW+4, 28).fill("#111111");
  doc.fontSize(11).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("Total TTC", TX, BY+46, {width:TW, lineBreak:false});
  doc.text(f(totalTTC), TX, BY+46, {width:TW, align:"right", lineBreak:false});

  if (acompteAmount > 0) {
    doc.fontSize(8).fillColor("#222222").font("Helvetica");
    doc.text(`Acompte (${fd(acompteDate)}) :`, TX, BY+72, {width:TW, lineBreak:false});
    doc.text(`- ${f(acompteAmount/100)}`, TX, BY+72, {width:TW, align:"right", lineBreak:false});
    doc.font("Helvetica-Bold").text("Reste à payer :", TX, BY+86, {width:TW, lineBreak:false});
    doc.text(f((resteAPayer??0)/100), TX, BY+86, {width:TW, align:"right", lineBreak:false});
  }

  // lettres
  const LY = RG + 30;
  const ent = Math.floor(totalTTC);
  const cts = Math.round((totalTTC-ent)*100);
  doc.fontSize(7.5).fillColor("#222222").font("Helvetica")
     .text(`Le montant total s'élève à ${words(ent)}${cts>0?` euros et ${words(cts)} centimes`:" euros"}`, ML, LY, {width:MW, lineBreak:false});
  if (company.paymentConditions) {
    doc.fontSize(7).fillColor("#aaaaaa").font("Helvetica")
       .text(company.paymentConditions, ML, LY+12, {width:MW, lineBreak:false});
  }

  // ── RIB centré ────────────────────────────────────────────────────────────
  const ribY = PH - 68;
  const ribTxt = `RIB — Titulaire : ${company.bankOwner||"LES CRE'ARTEURS"}  |  Banque : ${company.bankName||"CIC MONTROUGE"}  |  IBAN : ${company.iban||"FR76 3006 6107 3100 0201 1710 183"}  |  BIC : ${company.bic||"CMCIFRPP"}`;
  doc.fontSize(7).fillColor("#888888").font("Helvetica");
  const rw = doc.widthOfString(ribTxt);
  doc.text(ribTxt, ML + (MW - rw) / 2, ribY, {lineBreak:false});

  // ── footer ────────────────────────────────────────────────────────────────
  doc.rect(0, PH-46, PW, 0.5).fill("#dddddd");
  if (company.legalMentions) {
    doc.fontSize(6.5).fillColor("#bbbbbb").font("Helvetica")
       .text(company.legalMentions, ML, PH-40, {width:MW, align:"center", lineBreak:false});
  }

  doc.end();
  return done;
}
