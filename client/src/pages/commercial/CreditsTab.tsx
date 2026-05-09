import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X, FileText } from "lucide-react";

export default function CreditsTab() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoiceId: "", amount: "", reason: "" });
  const [error, setError] = useState<string | null>(null);

  const { data: credits = [], refetch } = trpc.commercial.credits.list.useQuery();
  const { data: invoices = [] } = trpc.commercial.invoices.list.useQuery();

  const createMutation = trpc.commercial.credits.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setForm({ invoiceId: "", amount: "", reason: "" }); setError(null); },
    onError: (e) => setError(e.message),
  });

  const deleteMutation = trpc.commercial.credits.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSubmit = () => {
    if (!form.invoiceId) return setError("Sélectionnez une facture");
    if (!form.amount || isNaN(parseFloat(form.amount))) return setError("Montant invalide");
    createMutation.mutate({
      invoiceId: parseInt(form.invoiceId),
      amount: parseFloat(form.amount),
      reason: form.reason || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Avoirs ({credits.length})</h2>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nouvel avoir
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card className="p-5 space-y-4 border-2 border-black">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Nouvel avoir</h3>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X size={16} /></Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Facture associée *</Label>
              <select
                className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
                value={form.invoiceId}
                onChange={e => setForm({ ...form, invoiceId: e.target.value })}
              >
                <option value="">— Choisir une facture —</option>
                {invoices.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} — {inv.clientName || `Client #${inv.clientId}`} — {(inv.totalTTC ?? 0).toFixed(2)} €
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Montant HT (€) *</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Motif</Label>
              <Input
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Ex: Remise commerciale, erreur de facturation…"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Création…" : "Créer l'avoir"}
            </Button>
          </div>
        </Card>
      )}

      {/* Liste */}
      {credits.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Aucun avoir pour l'instant.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {credits.map((credit: any) => {
            const invoice = invoices.find((inv: any) => inv.id === credit.invoiceId);
            return (
              <Card key={credit.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{credit.number}</p>
                  <p className="text-sm text-slate-500">
                    Facture : {invoice?.number ?? `#${credit.invoiceId}`}
                    {credit.reason && ` — ${credit.reason}`}
                  </p>
                  <p className="text-sm text-slate-400">
                    {new Date(credit.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg">{(credit.amount ?? 0).toFixed(2)} €</p>
                </div>
                <Button
                  variant="destructive" size="icon"
                  onClick={() => { if (confirm("Supprimer cet avoir ?")) deleteMutation.mutate({ creditId: credit.id }); }}
                >
                  <Trash2 size={14} />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
