import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

interface QuoteFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function QuoteForm({ onSubmit, onCancel, isLoading }: QuoteFormProps) {
  const [clientId, setClientId] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [paymentTerms, setPaymentTerms] = useState("30");

  const { data: clients } = trpc.commercial.clients.list.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + parseInt(validityDays));

    await onSubmit({
      clientId: parseInt(clientId),
      validityDate,
      paymentTerms: `${paymentTerms} jours net`,
    });
    setClientId("");
    setValidityDays("30");
    setPaymentTerms("30");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="clientId">Client *</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="validityDays">Validité du devis (jours)</Label>
          <Input
            id="validityDays"
            type="number"
            value={validityDays}
            onChange={(e) => setValidityDays(e.target.value)}
            min="1"
          />
        </div>

        <div>
          <Label htmlFor="paymentTerms">Conditions de paiement (jours)</Label>
          <Input
            id="paymentTerms"
            type="number"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            min="1"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || !clientId}>
          {isLoading ? "Création..." : "Créer devis"}
        </Button>
      </div>
    </form>
  );
}
