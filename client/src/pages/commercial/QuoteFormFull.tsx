import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X, UserPlus, Search } from "lucide-react";

type LineDraft = {
  id: string;
  productId: number | null;
  productName: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
};

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
  /** Si fourni, mode édition d'un devis existant */
  editQuoteId?: number;
};

export default function QuoteFormFull({ onSuccess, onCancel, editQuoteId }: Props) {
  const { data: clients } = trpc.commercial.clients.list.useQuery();
  const { data: products } = trpc.commercial.products.list.useQuery();
  const { data: existingQuote } = trpc.commercial.quotes.get.useQuery(
    { quoteId: editQuoteId! },
    { enabled: !!editQuoteId }
  );

  const isEdit = !!editQuoteId;

  // Mode client : existant ou nouveau
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState<string>("");
  const [newClient, setNewClient] = useState({
    name: "", email: "", phone: "", address: "",
    siret: "", vatNumber: "",
  });

  // Devis
  const [validityDays, setValidityDays] = useState(30);
  const [paymentTerms, setPaymentTerms] = useState("30 jours fin de mois");

  // Lignes
  const [lines, setLines] = useState<LineDraft[]>([
    { id: crypto.randomUUID(), productId: null, productName: "", description: "", quantity: 1, unitPriceHT: 0, vatRate: 20 },
  ]);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (existingQuote && products) {
      setClientId(String(existingQuote.clientId));
      setClientMode("existing");
      if (existingQuote.paymentTerms) setPaymentTerms(existingQuote.paymentTerms);
      if (existingQuote.lines && existingQuote.lines.length > 0) {
        setLines(existingQuote.lines.map((l: any) => {
          const prod = products.find(p => p.id === l.productId);
          return {
            id: crypto.randomUUID(),
            productId: l.productId,
            productName: prod?.name ?? "",
            description: prod?.description ?? "",
            quantity: l.quantity ?? 1,
            unitPriceHT: (l.unitPriceHT ?? 0) / 100, // centimes → euros
            vatRate: l.vatRate ?? 20,
          };
        }));
      }
    }
  }, [existingQuote, products]);

  // Calculs
  const totals = useMemo(() => {
    const ht = lines.reduce((s, l) => s + l.quantity * l.unitPriceHT, 0);
    const tva = lines.reduce((s, l) => s + l.quantity * l.unitPriceHT * (l.vatRate / 100), 0);
    return { ht, tva, ttc: ht + tva };
  }, [lines]);

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), productId: null, productName: "", description: "", quantity: 1, unitPriceHT: 0, vatRate: 20 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines(lines.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const selectProduct = (lineId: string, productId: string) => {
    const product = products?.find(p => p.id === parseInt(productId));
    if (!product) return;
    updateLine(lineId, {
      productId: product.id,
      productName: product.name,
      description: product.description ?? "",
      unitPriceHT: (product.priceHT ?? 0) / 100, // centimes → euros pour l'affichage
      vatRate: product.vatRate ?? 20,
    });
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.commercial.quotes.createWithLines.useMutation({
    onSuccess: (data) => {
      alert(`Devis ${data.number} créé !`);
      utils.commercial.quotes.list.invalidate();
      utils.commercial.clients.list.invalidate();
      utils.commercial.products.list.invalidate();
      onSuccess();
    },
    onError: (e) => alert("Erreur : " + e.message),
  });

  const updateMutation = trpc.commercial.quotes.updateWithLines.useMutation({
    onSuccess: () => {
      alert("Devis mis à jour !");
      utils.commercial.quotes.list.invalidate();
      utils.commercial.products.list.invalidate();
      onSuccess();
    },
    onError: (e) => alert("Erreur : " + e.message),
  });

  const handleSubmit = () => {
    // Validation
    if (clientMode === "existing" && !clientId) {
      alert("Sélectionne un client ou crée-en un nouveau"); return;
    }
    if (clientMode === "new" && !newClient.name.trim()) {
      alert("Le nom du nouveau client est requis"); return;
    }
    const validLines = lines.filter(l => l.productName.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      alert("Ajoute au moins une ligne avec un nom et une quantité"); return;
    }

    const payload = {
      lines: validLines.map(l => ({
        productId: l.productId ?? undefined,
        newProduct: !l.productId ? {
          name: l.productName,
          description: l.description || undefined,
          priceHT: l.unitPriceHT,
          vatRate: l.vatRate,
          unit: "forfait" as const,
        } : undefined,
        quantity: l.quantity,
        unitPriceHT: l.unitPriceHT,
        vatRate: l.vatRate,
      })),
      validityDays,
      paymentTerms,
    };

    if (isEdit) {
      updateMutation.mutate({
        ...payload,
        quoteId: editQuoteId!,
        clientId: parseInt(clientId),
      });
    } else {
      createMutation.mutate({
        ...payload,
        clientId: clientMode === "existing" ? parseInt(clientId) : undefined,
        newClient: clientMode === "new" ? newClient : undefined,
      });
    }
  };

  return (
    <Card className="p-6 bg-white border border-slate-200 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{isEdit ? `Modifier le devis` : "Nouveau devis"}</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}><X size={16} /></Button>
      </div>

      {/* SECTION CLIENT */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Client</Label>
        <div className="flex gap-2">
          <Button
            type="button" size="sm"
            variant={clientMode === "existing" ? "default" : "outline"}
            onClick={() => setClientMode("existing")}>
            <Search size={14} className="mr-1" /> Client existant
          </Button>
          <Button
            type="button" size="sm"
            variant={clientMode === "new" ? "default" : "outline"}
            onClick={() => setClientMode("new")}>
            <UserPlus size={14} className="mr-1" /> Nouveau client
          </Button>
        </div>

        {clientMode === "existing" ? (
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md">
            <option value="">— Sélectionne un client —</option>
            {clients?.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-md">
            <div className="col-span-2">
              <Label htmlFor="nc-nom">Nom / Raison sociale *</Label>
              <Input id="nc-nom" value={newClient.name}
                onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="Ex: Studio Alpha" />
            </div>
            <div>
              <Label htmlFor="nc-email">Email</Label>
              <Input id="nc-email" type="email" value={newClient.email}
                onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nc-tel">Téléphone</Label>
              <Input id="nc-tel" value={newClient.phone}
                onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="nc-adr">Adresse</Label>
              <Input id="nc-adr" value={newClient.address}
                onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nc-siret">SIRET</Label>
              <Input id="nc-siret" value={newClient.siret}
                onChange={e => setNewClient({ ...newClient, siret: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="nc-tva">N° TVA Intracom</Label>
              <Input id="nc-tva" value={newClient.vatNumber}
                onChange={e => setNewClient({ ...newClient, vatNumber: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      {/* SECTION LIGNES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Prestations</Label>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus size={14} className="mr-1" /> Ajouter une ligne
          </Button>
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={line.id} className="border border-slate-200 rounded-md p-3 space-y-2 bg-white">
              <div className="flex items-start gap-2">
                <div className="text-sm font-mono text-slate-400 mt-2 w-8">#{i + 1}</div>

                <div className="flex-1 space-y-2">
                  {/* Sélection produit existant ou saisie libre */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Description / Prestation *</Label>
                      <Input
                        value={line.productName}
                        onChange={e => updateLine(line.id, { productName: e.target.value, productId: null })}
                        placeholder="Ex: Étalonnage long-métrage"
                        list={`products-${line.id}`}
                      />
                      <datalist id={`products-${line.id}`}>
                        {products?.map(p => <option key={p.id} value={p.name} />)}
                      </datalist>
                      {products && products.length > 0 && (
                        <select
                          className="w-full text-xs mt-1 px-2 py-1 border border-slate-200 rounded"
                          value={line.productId ?? ""}
                          onChange={e => e.target.value && selectProduct(line.id, e.target.value)}>
                          <option value="">— Ou choisir un produit existant —</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({((p.priceHT ?? 0) / 100).toFixed(2)} €)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Quantité, prix, TVA */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Quantité</Label>
                      <Input type="number" step="0.01" min="0" value={line.quantity}
                        onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">PU HT (€)</Label>
                      <Input type="number" step="0.01" min="0" value={line.unitPriceHT}
                        onChange={e => updateLine(line.id, { unitPriceHT: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">TVA (%)</Label>
                      <Input type="number" step="0.01" min="0" max="100" value={line.vatRate}
                        onChange={e => updateLine(line.id, { vatRate: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Total HT</Label>
                      <div className="px-3 py-2 bg-slate-50 rounded-md text-sm font-mono font-semibold">
                        {(line.quantity * line.unitPriceHT).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="button" size="sm" variant="ghost"
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length === 1}>
                  <Trash2 size={14} className="text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* TOTAUX */}
        <div className="bg-slate-50 rounded-md p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Sous-total HT</span>
            <span className="font-mono">{totals.ht.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>TVA</span>
            <span className="font-mono">{totals.tva.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
            <span>Total TTC</span>
            <span className="font-mono">{totals.ttc.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* CONDITIONS */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="validity">Validité du devis (jours)</Label>
          <Input id="validity" type="number" value={validityDays}
            onChange={e => setValidityDays(parseInt(e.target.value) || 30)} />
        </div>
        <div>
          <Label htmlFor="terms">Conditions de paiement</Label>
          <Input id="terms" value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)} />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
          {(createMutation.isPending || updateMutation.isPending) ? "Enregistrement…" : (isEdit ? "Mettre à jour" : "Créer le devis")}
        </Button>
      </div>
    </Card>
  );
}
