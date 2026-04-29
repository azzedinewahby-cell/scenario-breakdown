import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Download, Trash2 } from "lucide-react";
import QuoteForm from "./QuoteForm";

export default function QuotesTab() {
  const [showForm, setShowForm] = useState(false);

  const { data: quotes, isLoading, refetch } = trpc.commercial.quotes.list.useQuery();
  const createMutation = trpc.commercial.quotes.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
    },
  });
  const deleteMutation = trpc.commercial.quotes.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Chargement des devis...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Devis ({quotes?.length || 0})</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} />
          Nouveau devis
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-white border border-slate-200">
          <QuoteForm
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Card>
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
                  <p className="text-sm text-slate-600">Statut: {quote.status}</p>
                  <p className="text-sm text-slate-600">Total: {quote.totalTTC ? (quote.totalTTC / 100).toFixed(2) : "0.00"}€ TTC</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Eye size={14} />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download size={14} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ quoteId: quote.id })}
                    className="gap-1"
                  >
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
