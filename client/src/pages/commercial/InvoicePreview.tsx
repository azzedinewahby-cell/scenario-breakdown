import { trpc } from "@/lib/trpc";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  invoiceId: number;
  onClose: () => void;
  onDownload: () => void;
}

export default function InvoicePreview({ invoiceId, onClose, onDownload }: Props) {
  const { data: invoice, isLoading } = trpc.commercial.invoices.get.useQuery({ invoiceId });
  const { data: clients = [] } = trpc.commercial.clients.list.useQuery();

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-center">Chargement...</div>
    </div>
  );
  if (!invoice) return null;

  const client = clients.find((c: any) => c.id === invoice.clientId);


  const fmtNum = (n: number) => {
    const [i, c] = (n ?? 0).toFixed(2).split(".");
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "," + c + "\u00a0€";
  };
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  const lines = (invoice as any).lines ?? [];
  const totalHT = invoice.totalHT ?? 0;
  const totalVAT = invoice.totalVAT ?? 0;
  const totalTTC = invoice.totalTTC ?? 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="relative">
        {/* Contrôles */}
        <div className="flex gap-2 justify-end mb-3">
          <Button size="sm" variant="outline" className="bg-white gap-1" onClick={onDownload}>
            <Download size={14} /> Télécharger PDF
          </Button>
          <Button size="sm" variant="outline" className="bg-white" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        {/* Facture A4 */}
        <div style={{
          width: "595px", minHeight: "842px", background: "white",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: "10px", color: "#111", position: "relative",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)"
        }}>
          {/* bande noire top */}
          <div style={{ height: "6px", background: "#111", width: "100%" }} />

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 36px 14px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.4px", color: "#111", marginBottom: "5px" }}>
                LA KABINE PRODUCTION
              </div>
              <div style={{ color: "#666", lineHeight: 1.7, fontSize: "8.5px" }}>
                14 rue Babères<br />92120 MONTROUGE<br />Email : contact@lakabine.net<br />Siret : 53534086300021
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#111", lineHeight: 1, marginBottom: "7px" }}>
                {invoice.number?.startsWith("FA") ? "FACTURE" : invoice.number?.startsWith("DV") ? "DEVIS" : "AVOIR"}
              </div>
              <div style={{ color: "#444", fontSize: "8.5px", lineHeight: 1.8 }}>
                <b>N°</b> : {invoice.number}<br />
                <b>Date d'émission</b> : {fmtDate(invoice.issueDate)}<br />
                <b>N° TVA</b> : FR03535340863
              </div>
            </div>
          </div>

          {/* bloc client */}
          <div style={{ padding: "0 36px 14px", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "42%", borderTop: "1.5px solid #111", paddingTop: "7px" }}>
              <div style={{ fontWeight: 700, fontSize: "10px", color: "#111", marginBottom: "3px" }}>
                {client?.name ?? "—"}
              </div>
              <div style={{ color: "#555", fontSize: "8.5px", lineHeight: 1.7 }}>
                {client?.address?.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
                {client?.siret && <span>Siret : {client.siret}<br /></span>}
                {client?.email && <span>{client.email}</span>}
              </div>
            </div>
          </div>

          {/* séparateur */}
          <div style={{ height: "0.5px", background: "#ddd", margin: "0 36px 12px" }} />

          {/* TABLEAU */}
          <div style={{ padding: "0 36px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 48px 66px 38px 68px 50px", background: "#111", color: "white", fontWeight: 600, fontSize: "8.5px", padding: "5px 6px", gap: "3px" }}>
              <div>Libellé</div>
              <div style={{ textAlign: "right" }}>Qté</div>
              <div>Unité</div>
              <div style={{ textAlign: "right" }}>PU HT</div>
              <div style={{ textAlign: "right" }}>Rem.</div>
              <div style={{ textAlign: "right" }}>Montant HT</div>
              <div style={{ textAlign: "right" }}>TVA</div>
            </div>
            {lines.map((l: any, i: number) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 44px 48px 66px 38px 68px 50px", padding: "4px 6px", gap: "3px", fontSize: "8.5px", background: i % 2 === 1 ? "#f7f7f7" : "white", borderBottom: "0.5px solid #e8e8e8" }}>
                <div>{l.productName}</div>
                <div style={{ textAlign: "right" }}>{Number(l.quantity).toFixed(2)}</div>
                <div>{l.unit || "u"}</div>
                <div style={{ textAlign: "right" }}>{fmtNum(l.unitPriceHT)}</div>
                <div style={{ textAlign: "right" }}>{(l.discount ?? 0).toFixed(2)}%</div>
                <div style={{ textAlign: "right" }}>{fmtNum(l.lineTotal)}</div>
                <div style={{ textAlign: "right" }}>{Number(l.vatRate).toFixed(2)}%</div>
              </div>
            ))}
            <div style={{ fontSize: "7.5px", color: "#aaa", padding: "5px 0 0 4px" }}>Type de vente : Vente de services</div>
          </div>

          {/* BAS DE PAGE — ancré */}
          <div style={{ position: "absolute", bottom: "100px", left: "36px", right: "36px" }}>
            <div style={{ display: "flex", gap: "18px", marginBottom: "14px" }}>
              {/* TVA */}
              <div style={{ flex: 1 }}>
                <div style={{ background: "#111", color: "white", fontWeight: 600, fontSize: "8.5px", padding: "4px 6px" }}>Détail de la TVA</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 44px 56px", fontWeight: 600, fontSize: "8px", padding: "4px 6px", color: "#333", borderBottom: "0.5px solid #ddd" }}>
                  <div>Code</div><div style={{ textAlign: "right" }}>Base HT</div><div style={{ textAlign: "right" }}>Taux</div><div style={{ textAlign: "right" }}>Montant</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 44px 56px", fontSize: "8px", padding: "4px 6px", color: "#333" }}>
                  <div>Normale</div>
                  <div style={{ textAlign: "right" }}>{fmtNum(totalHT)}</div>
                  <div style={{ textAlign: "right" }}>20,00%</div>
                  <div style={{ textAlign: "right" }}>{fmtNum(totalVAT)}</div>
                </div>
                <div style={{ marginTop: "10px", fontSize: "8.5px", color: "#333", lineHeight: 1.8 }}>
                  <b>Règlement :</b>&nbsp; {invoice.paymentMethod || "Virement"}<br />
                  {invoice.dueDate && <><b>Échéance(s) :</b>&nbsp; {fmtNum(totalTTC)} au {fmtDate(invoice.dueDate)}</>}
                </div>
              </div>
              {/* Totaux */}
              <div style={{ width: "196px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#333", padding: "3px 0" }}>
                  <span>Total HT</span><span>{fmtNum(totalHT)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#333", padding: "3px 0", borderBottom: "0.5px solid #ddd", marginBottom: "6px" }}>
                  <span>TVA</span><span>{fmtNum(totalVAT)}</span>
                </div>
                <div style={{ background: "#111", color: "white", display: "flex", justifyContent: "space-between", padding: "7px 10px", fontWeight: 700, fontSize: "10.5px" }}>
                  <span>Total TTC</span><span>{fmtNum(totalTTC)}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: "8.5px", color: "#333", marginBottom: "5px" }}>
              Le montant total s'élève à {totalTTC.toFixed(2)} euros
            </div>
            <div style={{ fontSize: "8.5px", color: "#888", lineHeight: 1.6 }}>
              En cas de retard de paiement, application d'un intérêt de retard au taux légal en vigueur (article L.441-10 du Code de commerce) ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (article D.441-5).
            </div>
          </div>

          {/* RIB centré */}
          <div style={{ position: "absolute", bottom: "48px", left: "36px", right: "36px" }}>
            <div style={{ height: "0.5px", background: "#e0e0e0", marginBottom: "7px" }} />
            <div style={{ textAlign: "center", fontSize: "8.5px", color: "#888" }}>
              RIB — Titulaire : LES CRE'ARTEURS &nbsp;|&nbsp; Banque : CIC MONTROUGE &nbsp;|&nbsp; IBAN : FR76 3006 6107 3100 0201 1710 183 &nbsp;|&nbsp; BIC : CMCIFRPP
            </div>
            <div style={{ height: "0.5px", background: "#e0e0e0", marginTop: "7px" }} />
          </div>

          {/* footer */}
          <div style={{ position: "absolute", bottom: "16px", left: "36px", right: "36px", textAlign: "center", fontSize: "8.5px", color: "#888", lineHeight: 1.5 }}>
            Association déclarée loi 1901 — SIREN 535 340 863 — Code NAF/APE 90.01Z — Inscrite à l'INSEE le 09/03/2011 — Convention collective IDCC 3090 — Membre de l'Économie Sociale et Solidaire (ESS).
          </div>
        </div>
      </div>
    </div>
  );
}
