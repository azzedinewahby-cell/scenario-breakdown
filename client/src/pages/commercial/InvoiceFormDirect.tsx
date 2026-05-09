import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, Search } from "lucide-react";
import SiretSearchForm from "./SiretSearchForm";

type LineDraft = {
  id: string;
  productId: number | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPriceHT: number;
  vatRate: number;
};

type Props = { onSuccess: () => void; onCancel: () => void };

const UNITS = ["forfait","heure","jour","semaine","mois","pièce","u","km","m²"];

export default function InvoiceFormDirect({ onSuccess, onCancel }: Props) {
  const [clientMode, setClientMode] = useState<"existing"|"new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<number|null>(null);
  const [newClient, setNewClient] = useState({ name:"", email:"", phone:"", address:"", siret:"", vatNumber:"" });
  const [lines, setLines] = useState<LineDraft[]>([
    { id: crypto.randomUUID(), productId: null, productName: "", quantity: 1, unit: "forfait", unitPriceHT: 0, vatRate: 20 }
  ]);
  const [error, setError] = useState<string|null>(null);

  const { data: clients = [] } = trpc.commercial.clients.list.useQuery();
  const { data: products = [] } = trpc.commercial.products.list.useQuery();

  const createMutation = trpc.commercial.invoices.createWithLines.useMutation({
    onSuccess: () => { onSuccess(); },
    onError: (e) => setError(e.message),
  });

  const addLine = () => setLines(l => [...l, { id: crypto.randomUUID(), productId: null, productName: "", quantity: 1, unit: "forfait", unitPriceHT: 0, vatRate: 20 }]);
  const removeLine = (id: string) => setLines(l => l.filter(x => x.id !== id));
  const updateLine = (id: string, patch: Partial<LineDraft>) => setLines(l => l.map(x => x.id === id ? { ...x, ...patch } : x));

  const totalHT = lines.reduce((s, l) => s + l.quantity * l.unitPriceHT, 0);
  const totalVAT = lines.reduce((s, l) => s + l.quantity * l.unitPriceHT * (l.vatRate / 100), 0);
  const totalTTC = totalHT + totalVAT;

  const handleSubmit = () => {
    if (clientMode === "existing" && !selectedClientId) return setError("Sélectionnez un client");
    if (clientMode === "new" && !newClient.name) return setError("Saisissez le nom du client");
    if (lines.some(l => !l.productName)) return setError("Remplissez tous les libellés");
    setError(null);
    createMutation.mutate({
      clientId: selectedClientId ?? 0,
      newClient: clientMode === "new" ? newClient : undefined,
      lines: lines.map(l => ({
        productId: l.productId,
        productName: l.productName,
        newProduct: l.productId ? undefined : { name: l.productName, priceHT: l.unitPriceHT, vatRate: l.vatRate, unit: l.unit },
        quantity: l.quantity,
        unit: l.unit,
        unitPriceHT: l.unitPriceHT,
        vatRate: l.vatRate,
      })),
    });
  };

  return (
    <Card className="p-5 space-y-5 border-2 border-black">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Nouvelle facture</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}><X size={16} /></Button>
      </div>

      {/* Client */}
      <div className="space-y-3">
        <Label className="font-semibold">Client</Label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setClientMode("existing")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border transition ${clientMode==="existing"?"bg-black text-white border-black":"border-slate-200 hover:border-black"}`}>
            <Search size={14} /> Client existant
          </button>
          <button type="button" onClick={() => setClientMode("new")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border transition ${clientMode==="new"?"bg-black text-white border-black":"border-slate-200 hover:border-black"}`}>
            Nouveau client
          </button>
        </div>

        {clientMode === "existing" ? (
          <select className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
            value={selectedClientId ?? ""} onChange={e => setSelectedClientId(parseInt(e.target.value) || null)}>
            <option value="">— Choisir un client —</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-md">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Recherche INSEE</Label>
              <SiretSearchForm onSelect={d => setNewClient({ ...newClient, name: d.name||"", address: d.address||"", siret: d.siret||"", vatNumber: d.vatNumber||"" })} />
            </div>
            <div className="col-span-2"><Label className="text-xs">Nom *</Label><Input value={newClient.name} onChange={e => setNewClient({...newClient,name:e.target.value})} /></div>
            <div><Label className="text-xs">Email</Label><Input value={newClient.email} onChange={e => setNewClient({...newClient,email:e.target.value})} /></div>
            <div><Label className="text-xs">Téléphone</Label><Input value={newClient.phone} onChange={e => setNewClient({...newClient,phone:e.target.value})} /></div>
            <div className="col-span-2"><Label className="text-xs">Adresse</Label><Input value={newClient.address} onChange={e => setNewClient({...newClient,address:e.target.value})} /></div>
            <div><Label className="text-xs">SIRET</Label><Input value={newClient.siret} onChange={e => setNewClient({...newClient,siret:e.target.value})} /></div>
          </div>
        )}
      </div>

      {/* Lignes */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="font-semibold">Prestations</Label>
          <Button variant="outline" size="sm" onClick={addLine}><Plus size={14} className="mr-1" /> Ajouter une ligne</Button>
        </div>
        {lines.map((line, i) => (
          <div key={line.id} className="border rounded-lg p-3 space-y-2 bg-white">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-mono">#{i+1}</span>
              {lines.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeLine(line.id)} className="text-red-500 h-6 w-6 p-0"><Trash2 size={13} /></Button>}
            </div>
            <div><Label className="text-xs">Libellé *</Label>
              <Input value={line.productName} onChange={e => updateLine(line.id, { productName: e.target.value, productId: null })} placeholder="Description de la prestation" />
              <select className="w-full mt-1 h-9 border border-input rounded-md px-2 text-sm bg-background" onChange={e => { const p = products.find((x:any) => x.id === parseInt(e.target.value)); if(p) updateLine(line.id, { productId:(p as any).id, productName:(p as any).name, unitPriceHT:(p as any).priceHT??0 }); }}>
                <option value="">— Ou choisir un produit existant —</option>
                {products.map((p:any) => <option key={p.id} value={p.id}>{p.name} ({Number(p.priceHT??0).toFixed(2)} €)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div><Label className="text-xs">Quantité</Label><Input type="number" step="0.01" min="0" value={line.quantity} onChange={e => updateLine(line.id,{quantity:parseFloat(e.target.value)||0})} /></div>
              <div><Label className="text-xs">Unité</Label>
                <select className="w-full h-10 border border-input rounded-md px-2 text-sm bg-background" value={line.unit} onChange={e => updateLine(line.id,{unit:e.target.value})}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">PU HT (€)</Label><Input type="number" step="0.01" min="0" value={line.unitPriceHT===0?"":line.unitPriceHT} placeholder="0.00" onChange={e => updateLine(line.id,{unitPriceHT:parseFloat(e.target.value)||0})} /></div>
              <div><Label className="text-xs">TVA (%)</Label><Input type="number" step="0.01" min="0" max="100" value={line.vatRate} onChange={e => updateLine(line.id,{vatRate:parseFloat(e.target.value)||0})} /></div>
              <div><Label className="text-xs">Total HT</Label><div className="px-3 py-2 bg-slate-50 rounded-md text-sm font-mono font-semibold">{(line.quantity*line.unitPriceHT).toFixed(2)} €</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Totaux */}
      <div className="text-right space-y-1 text-sm">
        <div className="text-slate-600">Sous-total HT : <strong>{totalHT.toFixed(2)} €</strong></div>
        <div className="text-slate-600">TVA : <strong>{totalVAT.toFixed(2)} €</strong></div>
        <div className="text-lg font-bold">Total TTC : {totalTTC.toFixed(2)} €</div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Création…" : "Créer la facture"}
        </Button>
      </div>
    </Card>
  );
}
