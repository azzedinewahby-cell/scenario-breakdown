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
  const [i, c] = n.toFixed(d).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + c + " \u20ac";
};
const fd = (d: any) => d ? new Date(d).toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit",year:"numeric"}) : "";
const words = (n: number): string => {
  if (n===0) return "zéro";
  const u=["","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
  const t=["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];
  const lt100=(x:number):string=>{if(x<20)return u[x];const q=Math.floor(x/10),r=x%10;if(q===7||q===9)return t[q]+"-"+(q===7&&r===1?"et-":"")+u[10+r];if(r===0)return t[q]+(q===8?"s":"");if(r===1&&q<8)return t[q]+"-et-un";return t[q]+"-"+u[r];};
  const lt1k=(x:number):string=>{if(x<100)return lt100(x);const c=Math.floor(x/100),r=x%100;const h=c===1?"cent":u[c]+" cent"+(r===0?"s":"");return r===0?h:h+" "+lt100(r);};
  if(n<1000)return lt1k(n);const k=Math.floor(n/1000),r=n%1000;return(k===1?"mille":lt1k(k)+" mille")+(r===0?"":" "+lt1k(r));
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
  const ML = 36, MR = 559, MW = MR - ML;

  const txt = (t: string, x: number, y: number, opts: any = {}) => {
    doc.fillColor(opts.color||"#111111")
       .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
       .fontSize(opts.size||8.5)
       .text(t, x, y, { width:opts.width, align:opts.align||"left", lineBreak:false });
  };

  // bande noire top
  doc.rect(0, 0, PW, 6).fill("#111111");

  // ── EN-TÊTE ÉMETTEUR ──────────────────────────────────────────────────────
  const tradeName = (company.tradeName||company.companyName||"").toUpperCase();
  txt(tradeName, ML, 20, { bold:true, size:13 });
  let hy = 37;
  for (const l of [...(company.address||"").split("\n"), company.email?`Email : ${company.email}`:null, company.siret?`Siret : ${company.siret}`:null].filter(Boolean) as string[]) {
    txt(l, ML, hy, { size:8.5, color:"#666666" }); hy += 11;
  }

  // ── TITRE + NUMÉRO ────────────────────────────────────────────────────────
  txt(TITLE, 0, 18, { bold:true, size:30, color:"#111111", width:MR, align:"right" });
  let iy = 58;
  for (const [lbl, val] of [["N°",number],["Date d'émission",fd(issueDate)],["N° TVA",company.vatNumber||"NC"]] as [string,string][]) {
    const line = `${lbl} : ${val}`;
    txt(line, 0, iy, { size:8.5, color:"#444444", width:MR, align:"right" }); iy += 12;
  }

  // ── BLOC CLIENT ───────────────────────────────────────────────────────────
  const CY = 140;
  doc.rect(ML + MW * 0.55, CY - 5, MW * 0.45, 1.5).fill("#111111");
  txt(client.name, ML + MW * 0.55 + 3, CY + 5, { bold:true, size:10, width:MW*0.45-6 });
  let cy = CY + 18;
  for (const l of [...(client.address||"").split("\n"), client.siret?`Siret : ${client.siret}`:null, client.email||null].filter(Boolean) as string[]) {
    txt(l, ML + MW * 0.55 + 3, cy, { size:8.5, color:"#555555", width:MW*0.45-6 }); cy += 11;
  }

  // ── SÉPARATEUR ────────────────────────────────────────────────────────────
  let y = Math.max(cy + 12, 220);
  doc.rect(ML, y, MW, 0.5).fill("#dddddd"); y += 12;
  if (input.reference) { txt(`Réf. : ${input.reference}`, ML, y, { bold:true, size:8.5 }); y += 13; }
  if (input.description) { txt(input.description, ML, y, { size:8.5, color:"#333333", width:MW }); y += 13; }

  // ── TABLEAU ───────────────────────────────────────────────────────────────
  const RH = 17;
  const C = [
    {x:ML+3,   w:180, a:"left"  as const, h:"Libellé"},
    {x:ML+187, w:36,  a:"right" as const, h:"Qté"},
    {x:ML+227, w:44,  a:"left"  as const, h:"Unité"},
    {x:ML+275, w:64,  a:"right" as const, h:"PU HT"},
    {x:ML+343, w:36,  a:"right" as const, h:"Rem."},
    {x:ML+383, w:70,  a:"right" as const, h:"Montant HT"},
    {x:ML+457, w:48,  a:"right" as const, h:"TVA"},
  ];

  doc.rect(ML, y, MW, RH).fill("#111111");
  for (const c of C) txt(c.h, c.x, y+5, { bold:true, size:9, color:"#ffffff", width:c.w, align:c.a });
  y += RH;

  for (let i=0; i<lines.length; i++) {
    const l = lines[i];
    if (i%2===1) doc.rect(ML, y, MW, RH).fill("#f7f7f7");
    const vals = [l.productName, l.quantity.toFixed(2), l.unit||"u", f(l.unitPriceHT), `${(l.discount??0).toFixed(2)}%`, f(l.lineTotal), `${l.vatRate.toFixed(2)}%`];
    for (let j=0;j<C.length;j++) txt(vals[j], C[j].x, y+5, { size:9, color:"#222222", width:C[j].w, align:C[j].a });
    doc.rect(ML, y+RH-0.3, MW, 0.3).fill("#e0e0e0");
    y += RH;
    if (y>640) { doc.addPage(); doc.rect(0,0,PW,6).fill("#111111"); y=30; }
  }
  txt("Type de vente : Vente de services", ML, y+5, { size:8, color:"#aaaaaa" });
  y += 32;

  // ── TVA + TOTAUX ──────────────────────────────────────────────────────────
  const BY = y;

  // TVA gauche
  doc.rect(ML, BY, 245, RH).fill("#111111");
  txt("Détail de la TVA", ML+4, BY+5, { bold:true, size:9, color:"#ffffff" });
  const tvH = BY + RH;
  for (const [x,lbl,w,a] of [[ML+4,"Code",60,"left"],[ML+68,"Base HT",65,"right"],[ML+142,"Taux",40,"right"],[ML+190,"Montant",55,"right"]] as [number,string,number,string][])
    txt(lbl, x, tvH+4, { bold:true, size:8.5, width:w, align:a as any });

  const vatMap = new Map<number,{b:number,v:number}>();
  for (const l of lines) { const e=vatMap.get(l.vatRate)??{b:0,v:0}; e.b+=l.lineTotal; e.v+=Math.round(l.lineTotal*l.vatRate/100*100)/100; vatMap.set(l.vatRate,e); }
  let tvy = tvH + RH;
  for (const [rate,v] of vatMap) {
    const lbl = rate===20?"Normale":rate===10?"Intermédiaire":`${rate}%`;
    txt(lbl,    ML+4,   tvy, { size:8.5, width:60 });
    txt(f(v.b), ML+68,  tvy, { size:8.5, width:65, align:"right" });
    txt(`${rate.toFixed(2)}%`, ML+142, tvy, { size:8.5, width:40 });
    txt(f(v.v), ML+190, tvy, { size:8.5, width:55, align:"right" });
    tvy += 13;
  }
  const RY = tvy + 8;
  txt("Règlement :", ML, RY, { bold:true, size:8.5 });
  txt(paymentMethod||"Virement", ML+62, RY, { size:8.5, color:"#333333" });
  if (dueDate) { txt("Échéance(s) :", ML, RY+13, { bold:true, size:8.5 }); txt(`${f(totalTTC)} au ${fd(dueDate)}`, ML+72, RY+13, { size:8.5, color:"#333333" }); }

  // Totaux droite
  const TX = 360, TW = MR - TX;
  txt("Total HT",  TX, BY+4,  { size:9, width:TW });
  txt(f(totalHT),  TX, BY+4,  { size:9, width:TW, align:"right" });
  txt("TVA",       TX, BY+18, { size:9, width:TW });
  txt(f(totalVAT), TX, BY+18, { size:9, width:TW, align:"right" });
  doc.rect(TX-4, BY+34, TW+4, 26).fill("#111111");
  txt("Total TTC", TX, BY+42, { bold:true, size:10.5, color:"#ffffff", width:TW });
  txt(f(totalTTC), TX, BY+42, { bold:true, size:10.5, color:"#ffffff", width:TW, align:"right" });

  if (acompteAmount>0) {
    txt(`Acompte (${fd(acompteDate)}) :`, TX, BY+68, { size:8.5, width:TW });
    txt(`- ${f(acompteAmount/100)}`, TX, BY+68, { size:8.5, width:TW, align:"right" });
    txt("Reste à payer :", TX, BY+82, { bold:true, size:9, width:TW });
    txt(f((resteAPayer??0)/100), TX, BY+82, { bold:true, size:9, width:TW, align:"right" });
  }

  // ── MENTIONS BAS DE PAGE ──────────────────────────────────────────────────
  const ent = Math.floor(totalTTC);
  const cts = Math.round((totalTTC-ent)*100);
  const letY = RY + 30;
  txt(`Le montant total s'élève à ${words(ent)}${cts>0?` euros et ${words(cts)} centimes`:" euros"}`, ML, letY, { size:8.5, color:"#333333", width:MW });
  if (company.paymentConditions) {
    txt(company.paymentConditions, ML, letY+13, { size:8.5, color:"#888888", width:MW });
  }

  // ── RIB centré ────────────────────────────────────────────────────────────
  const ribY = PH - 62;
  doc.rect(ML, ribY-5, MW, 0.5).fill("#e0e0e0");
  doc.rect(ML, ribY+12, MW, 0.5).fill("#e0e0e0");
  const ribTxt = `RIB — Titulaire : ${company.bankOwner||"LES CRE'ARTEURS"}  |  Banque : ${company.bankName||"CIC MONTROUGE"}  |  IBAN : ${company.iban||"FR76 3006 6107 3100 0201 1710 183"}  |  BIC : ${company.bic||"CMCIFRPP"}`;
  doc.fontSize(8.5).font("Helvetica").fillColor("#888888");
  const rw = doc.widthOfString(ribTxt);
  txt(ribTxt, ML + (MW-rw)/2, ribY, { size:8.5, color:"#888888" });

  // ── FOOTER mentions légales ───────────────────────────────────────────────
  if (company.legalMentions) {
    doc.fontSize(8.5).fillColor("#888888").font("Helvetica");
    const lw = doc.widthOfString(company.legalMentions);
    const lx = lw < MW ? ML + (MW-lw)/2 : ML;
    txt(company.legalMentions, lx, PH-40, { size:8.5, color:"#888888", width:MW, align: lw < MW ? "left" : "center" });
  }

  doc.end();
  return done;
}
