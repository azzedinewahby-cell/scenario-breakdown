import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, Trash2, FileCheck2, Pencil, CheckCircle } from "lucide-react";
import QuoteFormFull from "./QuoteFormFull";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  brouillon:  { label: "Brouillon",  color: "bg-slate-100 text-slate-600" },
  envoyé:     { label: "Confirmé",   color: "bg-green-100 text-green-700" },
  accepté:    { label: "Accepté",    color: "bg-emerald-100 text-emerald-700" },
  refusé:     { label: "Refusé",     color: "bg-red-100 text-red-600"     },
};

export default function QuotesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editQuoteId, setEditQuoteId] = useState<number | undefined>();

  const { data: quotes, isLoading, refetch } = trpc.commercial.quotes.list.useQuery();
  const deleteMutation = trpc.commercial.quotes.delete.useMutation({ onSuccess: () => refetch() });
  const updateMutation = trpc.commercial.quotes.update.useMutation({ onSuccess: () => refetch() });

  const utils = trpc.useUtils();
  const convertMutation = trpc.commercial.invoices.fromQuote.useMutation({
    onSuccess: (data) => {
      alert(`Facture ${data.invoiceNumber} créée avec succès !`);
      utils.commercial.invoices.list.invalidate();
    },
    onError: (e) => alert("Erreur : " + e.message),
  });

  const generatePdfMutation = trpc.commercial.quotes.generatePdf.useMutation({
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

  const handleEdit = (quoteId: number) => {
    setEditQuoteId(quoteId);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditQuoteId(undefined);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditQuoteId(undefined);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des devis...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Devis ({quotes?.length || 0})</h2>
        <Button onClick={handleNew} className="gap-2">
          <Plus size={16} />
          Nouveau devis
        </Button>
      </div>

      {showForm && (
        <QuoteFormFull
          editQuoteId={editQuoteId}
          onSuccess={() => { refetch(); handleClose(); }}
          onCancel={handleClose}
        />
      )}

      {!quotes || quotes.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 border border-slate-200">
          <p className="text-slate-600">Aucun devis. Créez votre premier devis pour commencer.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="p-4 bg-white border border-slate-200 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{quote.number}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[quote.status]?.color ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABELS[quote.status]?.label ?? quote.status}
                    </span>
                    <span className="text-sm text-slate-600">{quote.totalTTC ? quote.totalTTC.toFixed(2) : "0.00"} € TTC</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {quote.status === "brouillon" && (
                    <Button variant="outline" size="sm" className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => updateMutation.mutate({ quoteId: quote.id, data: { status: "envoyé" as any } })}
                      disabled={updateMutation.isPending}
                      title="Confirmer le devis">
                      <CheckCircle size={14} /> Confirmer
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1"
                    onClick={() => handleEdit(quote.id)}
                    title="Modifier">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1"
                    onClick={() => generatePdfMutation.mutate({ quoteId: quote.id })}
                    disabled={generatePdfMutation.isPending}
                    title="Télécharger le PDF">
                    <Download size={14} />
                  </Button>
                  <Button variant="default" size="sm" className="gap-1"
                    onClick={() => {
                      if (confirm(`Convertir le devis ${quote.number} en facture ?`)) {
                        convertMutation.mutate({ quoteId: quote.id });
                      }
                    }}
                    disabled={convertMutation.isPending}
                    title="Convertir en facture">
                    <FileCheck2 size={14} /> Facturer
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Supprimer le devis ${quote.number} ?`)) {
                        deleteMutation.mutate({ quoteId: quote.id });
                      }
                    }}
                    className="gap-1"
                    title="Supprimer">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
