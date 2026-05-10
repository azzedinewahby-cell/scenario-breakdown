import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, Trash2, X, CheckCircle, CreditCard, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import InvoiceFormDirect from "./InvoiceFormDirect";
import InvoicePreview from "./InvoicePreview";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon",  color: "bg-slate-100 text-slate-600"    },
  envoyée:   { label: "Envoyée",    color: "bg-blue-100 text-blue-700"      },
  payée:     { label: "Payée",      color: "bg-green-100 text-green-700"    },
  acompte:   { label: "Acompte",    color: "bg-amber-100 text-amber-700"    },
  "en retard":{ label: "En retard", color: "bg-red-100 text-red-600"        },
};

const PAYMENT_METHODS = ["Virement", "Espèces", "Carte bancaire", "Chèque"];

export default function InvoicesTab() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ clientId: "", quoteId: "", notes: "" });
  const [payModal, setPayModal] = useState<{ invoiceId: number; type: "payée" | "acompte"; totalTTC: number } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("Virement");
  const [acompteAmount, setAcompteAmount] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);

  const { data: invoices, isLoading, refetch } = trpc.commercial.invoices.list.useQuery();
  const { data: clients } = trpc.commercial.clients.list.useQuery();
  const { data: quotes } = trpc.commercial.quotes.list.useQuery();

  const createMutation = trpc.commercial.invoices.create.useMutation();
  const updateMutation = trpc.commercial.invoices.update.useMutation({
    onSuccess: () => { refetch(); setPayModal(null); },
  });

  const generatePdfMutation = trpc.commercial.invoices.generatePdf.useMutation({
    onSuccess: (data) => {
      const byteChars = atob(data.pdfBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => alert("Erreur PDF : " + e.message),
  });

  const deleteMutation = trpc.commercial.invoices.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (invoiceId: number) => {
    if (!confirm("Supprimer cette facture ?")) return;
    await deleteMutation.mutateAsync({ invoiceId });
    utils.commercial.invoices.list.invalidate();
  };

  const handleCreate = async () => {
    if (!formData.clientId) {
      alert("Veuillez sélectionner un client");
      return;
    }
    try {
      await createMutation.mutateAsync({
        clientId: parseInt(formData.clientId),
        quoteId: formData.quoteId ? parseInt(formData.quoteId) : undefined,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      setShowForm(false);
      setFormData({ clientId: "", quoteId: "", notes: "" });
      utils.commercial.invoices.list.invalidate();
    } catch (error: any) {
      alert("Erreur : " + (error?.message ?? "inconnue"));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des factures...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Factures ({invoices?.length || 0})
        </h2>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Nouvelle facture
        </Button>
      </div>

      {showForm && (
        <InvoiceFormDirect onSuccess={() => { setShowForm(false); utils.commercial.invoices.list.invalidate(); }} onCancel={() => setShowForm(false)} />
      )}
      {!invoices || invoices.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 border border-slate-200">
          <p className="text-slate-600">
            Aucune facture. Créez votre première facture pour commencer.
          </p>
        </Card>
      ) : (
        <>
          {/* Modal paiement */}
          {payModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">
                    {payModal.type === "payée" ? "Marquer comme payée" : "Enregistrer un acompte"}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setPayModal(null)}><X size={14} /></Button>
                </div>
                <div className="space-y-2">
                  <Label>Mode de règlement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m} type="button"
                        onClick={() => setSelectedMethod(m)}
                        className={`border rounded-lg px-3 py-2 text-sm font-medium transition ${selectedMethod === m ? "bg-black text-white border-black" : "bg-white text-slate-700 border-slate-200 hover:border-black"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                {payModal.type === "acompte" && (
                  <div className="space-y-1">
                    <Label>Montant de l'acompte TTC (€)</Label>
                    <Input type="number" step="0.01" min="0" max={payModal.totalTTC}
                      value={acompteAmount} onChange={e => setAcompteAmount(e.target.value)}
                      placeholder={`Max: ${payModal.totalTTC.toFixed(2)} €`} />
                    {acompteAmount && !isNaN(parseFloat(acompteAmount)) && (
                      <p className="text-xs text-slate-500">
                        Reste à payer : <strong>{Math.max(0, payModal.totalTTC - parseFloat(acompteAmount)).toFixed(2)} €</strong>
                      </p>
                    )}
                  </div>
                )}
                <Button className="w-full" onClick={() => {
                  const data: any = { status: payModal.type, paymentMethod: selectedMethod };
                  if (payModal.type === "acompte") {
                    const amt = parseFloat(acompteAmount) || 0;
                    data.acompteAmount = Math.round(amt * 100); // centimes
                    data.acompteDate = new Date();
                    data.resteAPayer = Math.round(Math.max(0, payModal.totalTTC - amt) * 100);
                  }
                  updateMutation.mutate({ invoiceId: payModal.invoiceId, data });
                }} disabled={updateMutation.isPending}>
                  Confirmer
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {invoices.map(invoice => (
              <Card key={invoice.id} className="p-4 bg-white border border-slate-200 hover:shadow-md transition">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{invoice.number}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[invoice.status]?.color ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[invoice.status]?.label ?? invoice.status}
                      </span>
                      {(invoice as any).paymentMethod && (
                        <span className="text-xs text-slate-400">{(invoice as any).paymentMethod}</span>
                      )}
                      <span className="text-sm text-slate-600">{invoice.totalTTC ? invoice.totalTTC.toFixed(2) : "0.00"} € TTC</span>
                      {invoice.status === "acompte" && (invoice as any).resteAPayer > 0 && (
                        <span className="text-xs font-medium text-amber-700">Reste : {((invoice as any).resteAPayer / 100).toFixed(2)} €</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end items-center">
                    {(invoice.status === "brouillon" || invoice.status === "acompte") && (
                      <>
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setSelectedMethod("Virement"); setAcompteAmount(""); const reste = (invoice as any).resteAPayer; setPayModal({ invoiceId: invoice.id, type: "payée", totalTTC: reste > 0 ? reste / 100 : (invoice.totalTTC ?? 0) }); }}>
                          <CheckCircle size={14} /> Payée
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                          onClick={() => { setSelectedMethod("Virement"); setAcompteAmount(""); const reste = (invoice as any).resteAPayer; setPayModal({ invoiceId: invoice.id, type: "acompte", totalTTC: reste > 0 ? reste / 100 : (invoice.totalTTC ?? 0) }); }}>
                          <CreditCard size={14} /> Acompte
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm"
                      onClick={() => setPreviewId(invoice.id)} title="Prévisualiser">
                      <Eye size={14} />
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => generatePdfMutation.mutate({ invoiceId: invoice.id })}
                      disabled={generatePdfMutation.isPending} title="Télécharger PDF">
                      <Download size={14} />
                    </Button>
                    <Button variant="destructive" size="sm"
                      onClick={() => handleDelete(invoice.id)} title="Supprimer">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {previewId && (
        <InvoicePreview
          invoiceId={previewId}
          onClose={() => setPreviewId(null)}
          onDownload={() => { generatePdfMutation.mutate({ invoiceId: previewId }); setPreviewId(null); }}
        />
      )}
    </div>
  );
}
