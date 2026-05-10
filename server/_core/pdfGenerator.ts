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
       .text(t, x, y, { width:opts.width||MW, align:opts.align||"left", lineBreak:false });
  };

  // ── bande noire top (6px) ─────────────────────────────────────────────────
  doc.rect(0, 0, PW, 6).fill("#111111");

  // ── EN-TÊTE : émetteur gauche ─────────────────────────────────────────────
  const tradeName = (company.tradeName||company.companyName||"").toUpperCase();
  txt(tradeName, ML, 20, { bold:true, size:13 });
  let hy = 36;
  for (const l of [...(company.address||"").split("\n"), company.email?`Email : ${company.email}`:null, company.siret?`Siret : ${company.siret}`:null].filter(Boolean) as string[]) {
    txt(l, ML, hy, { size:8.5, color:"#666666" }); hy += 11;
  }

  // ── EN-TÊTE : titre + infos droite ───────────────────────────────────────
  txt(TITLE, 0, 18, { bold:true, size:28, color:"#111111", width:MR, align:"right" });
  let iy = 58;
  const vatDisplay = company.vatNumber && company.vatNumber !== "NC" && company.vatNumber !== "" ? company.vatNumber : "NC";
  for (const [lbl, val] of [["N°",number],["Date d'émission",fd(issueDate)],["N° TVA",vatDisplay]] as [string,string][]) {
    txt(`${lbl} : ${val}`, 0, iy, { size:8.5, color:"#444444", width:MR, align:"right" }); iy += 12;
  }

  // ── BLOC CLIENT (droite, 42%) ─────────────────────────────────────────────
  const CY = 130;
  const CX = ML + MW * 0.58;
  const CW = MW * 0.42 - 3;
  doc.rect(CX, CY - 4, CW, 1.5).fill("#111111");
  txt(client.name, CX + 3, CY + 5, { bold:true, size:10, width:CW - 6 });
  let cy = CY + 18;
  for (const l of [...(client.address||"").split("\n"), client.siret?`Siret : ${client.siret}`:null, client.email||null].filter(Boolean) as string[]) {
    txt(l, CX + 3, cy, { size:8.5, color:"#555555", width:CW - 6 }); cy += 11;
  }

  // ── SÉPARATEUR ────────────────────────────────────────────────────────────
  let y = Math.max(cy + 10, 215);
  doc.rect(ML, y, MW, 0.5).fill("#dddddd"); y += 12;
  if (input.reference) { txt(`Réf. : ${input.reference}`, ML, y, { bold:true, size:8.5 }); y += 13; }
  if (input.description) { txt(input.description, ML, y, { size:8.5, color:"#333333" }); y += 13; }

  // ── TABLEAU ───────────────────────────────────────────────────────────────
  const RH = 16;
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
  for (const c of C) txt(c.h, c.x, y+4, { bold:true, size:8.5, color:"#ffffff", width:c.w, align:c.a });
  y += RH;

  for (let i=0; i<lines.length; i++) {
    const l = lines[i];
    if (i%2===1) doc.rect(ML, y, MW, RH).fill("#f7f7f7");
    const vals = [l.productName, l.quantity.toFixed(2), l.unit||"u", f(l.unitPriceHT), `${(l.discount??0).toFixed(2)}%`, f(l.lineTotal), `${l.vatRate.toFixed(2)}%`];
    for (let j=0;j<C.length;j++) txt(vals[j], C[j].x, y+4, { size:8.5, color:"#222222", width:C[j].w, align:C[j].a });
    doc.rect(ML, y+RH-0.3, MW, 0.3).fill("#e8e8e8");
    y += RH;
    if (y>560) { doc.addPage(); doc.rect(0,0,PW,6).fill("#111111"); y=30; }
  }
  txt("Type de vente : Vente de services", ML+3, y+5, { size:7.5, color:"#aaaaaa" });

  // ── BAS DE PAGE (ancré à bottom:100 = PH-100 vers le bas) ────────────────
  // Bloc TVA+totaux: bottom edge à PH-100px → top environ à PH-260
  const BY = PH - 260;

  // TVA gauche
  doc.rect(ML, BY, 245, RH).fill("#111111");
  txt("Détail de la TVA", ML+4, BY+4, { bold:true, size:8.5, color:"#ffffff", width:240 });
  const tvH = BY + RH;
  for (const [x,lbl,w,a] of [[ML+3,"Code",55,"left"],[ML+66,"Base HT",62,"right"],[ML+138,"Taux",42,"right"],[ML+188,"Montant",54,"right"]] as [number,string,number,string][])
    txt(lbl, x, tvH+3, { bold:true, size:8, width:w, align:a as any });

  const vatMap = new Map<number,{b:number,v:number}>();
  for (const l of lines) { const e=vatMap.get(l.vatRate)??{b:0,v:0}; e.b+=l.lineTotal; e.v+=Math.round(l.lineTotal*l.vatRate/100*100)/100; vatMap.set(l.vatRate,e); }
  let tvy = tvH + RH;
  for (const [rate,v] of vatMap) {
    const lbl = rate===20?"Normale":rate===10?"Intermédiaire":`${rate}%`;
    txt(lbl,    ML+3,   tvy, { size:8, width:55 });
    txt(f(v.b), ML+66,  tvy, { size:8, width:62, align:"right" });
    txt(`${rate.toFixed(2)}%`, ML+138, tvy, { size:8, width:42 });
    txt(f(v.v), ML+188, tvy, { size:8, width:54, align:"right" });
    tvy += 13;
  }
  const RY = tvy + 8;
  txt("Règlement :", ML, RY, { bold:true, size:8.5 });
  txt(paymentMethod||"Virement", ML+60, RY, { size:8.5, color:"#333333" });
  if (dueDate) {
    txt("Échéance(s) :", ML, RY+13, { bold:true, size:8.5 });
    txt(`${f(totalTTC)} au ${fd(dueDate)}`, ML+70, RY+13, { size:8.5, color:"#333333" });
  }

  // Totaux droite
  const TX = 358, TW = MR - TX;
  txt("Total HT",  TX, BY+3,  { size:8.5, width:TW });
  txt(f(totalHT),  TX, BY+3,  { size:8.5, width:TW, align:"right" });
  txt("TVA",       TX, BY+17, { size:8.5, width:TW });
  txt(f(totalVAT), TX, BY+17, { size:8.5, width:TW, align:"right" });

  doc.rect(TX-3, BY+33, TW+3, 24).fill("#111111");
  txt("Total TTC", TX, BY+41, { bold:true, size:10.5, color:"#ffffff", width:TW });
  txt(f(totalTTC), TX, BY+41, { bold:true, size:10.5, color:"#ffffff", width:TW, align:"right" });

  if (acompteAmount>0) {
    txt(`Acompte (${fd(acompteDate)}) :`, TX, BY+64, { size:8.5, width:TW });
    txt(`- ${f(acompteAmount/100)}`, TX, BY+64, { size:8.5, width:TW, align:"right" });
    txt("Reste à payer :", TX, BY+78, { bold:true, size:9, width:TW });
    txt(f((resteAPayer??0)/100), TX, BY+78, { bold:true, size:9, width:TW, align:"right" });
  }

  // lettres + conditions
  const letY = RY + 28;
  const ent = Math.floor(totalTTC);
  const cts = Math.round((totalTTC-ent)*100);
  txt(`Le montant total s'élève à ${words(ent)}${cts>0?` euros et ${words(cts)} centimes`:" euros"}`, ML, letY, { size:8.5, color:"#333333" });
  if (company.paymentConditions)
    txt(company.paymentConditions, ML, letY+13, { size:8.5, color:"#888888" });

  // ── RIB centré (bottom: 48px → y = PH-48-20) ─────────────────────────────
  const ribY = PH - 62;
  doc.rect(ML, ribY-6, MW, 0.5).fill("#e0e0e0");
  doc.rect(ML, ribY+11, MW, 0.5).fill("#e0e0e0");
  const ribTxt = `RIB — Titulaire : ${company.bankOwner||"LES CRE'ARTEURS"}  |  Banque : ${company.bankName||"CIC MONTROUGE"}  |  IBAN : ${company.iban||"FR76 3006 6107 3100 0201 1710 183"}  |  BIC : ${company.bic||"CMCIFRPP"}`;
  doc.fontSize(8.5).font("Helvetica").fillColor("#888888");
  const rw = doc.widthOfString(ribTxt);
  txt(ribTxt, ML + Math.max(0, (MW-rw)/2), ribY, { size:8.5, color:"#888888" });

  // ── FOOTER (bottom: 16px → y = PH-30) ────────────────────────────────────
  if (company.legalMentions) {
    doc.fontSize(8.5).fillColor("#888888").font("Helvetica");
    const lw = doc.widthOfString(company.legalMentions);
    txt(company.legalMentions, ML + Math.max(0,(MW-lw)/2), PH-36, { size:8.5, color:"#888888", width:MW, align: lw<MW?"left":"center" });
  }

  doc.end();
  return done;
}
