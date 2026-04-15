import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Download, Trash2 } from "lucide-react";

export default function InvoicesTab() {
  const { data: invoices, isLoading } = trpc.commercial.invoices.list.useQuery();

  if (isLoading) {
    return <div className="text-center py-8">Chargement des factures...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Factures ({invoices?.length || 0})</h2>
        <Button className="gap-2">
          <Plus size={16} />
          Nouvelle facture
        </Button>
      </div>

      {!invoices || invoices.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 border border-slate-200">
          <p className="text-slate-600">Aucune facture. Créez votre première facture pour commencer.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4 bg-white border border-slate-200 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{invoice.number}</h3>
                  <p className="text-sm text-slate-600">Statut: {invoice.status}</p>
                  <p className="text-sm text-slate-600">Total: {(invoice.totalTTC / 100).toFixed(2)}€ TTC</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Eye size={14} />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download size={14} />
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1">
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
