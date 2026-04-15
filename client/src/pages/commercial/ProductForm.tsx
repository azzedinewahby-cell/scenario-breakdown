import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProductFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ProductForm({ onSubmit, onCancel, isLoading }: ProductFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceHT, setPriceHT] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [unit, setUnit] = useState("forfait");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      description: description || undefined,
      priceHT: parseFloat(priceHT),
      vatRate: parseInt(vatRate),
      unit,
    });
    setName("");
    setDescription("");
    setPriceHT("");
    setVatRate("20");
    setUnit("forfait");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nom du produit/prestation *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Directeur de photographie"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description détaillée du produit/prestation"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="priceHT">Prix HT (€) *</Label>
          <Input
            id="priceHT"
            type="number"
            step="0.01"
            value={priceHT}
            onChange={(e) => setPriceHT(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <Label htmlFor="vatRate">Taux TVA (%)</Label>
          <Select value={vatRate} onValueChange={setVatRate}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20% (Standard)</SelectItem>
              <SelectItem value="10">10% (Réduit)</SelectItem>
              <SelectItem value="5.5">5.5% (Super-réduit)</SelectItem>
              <SelectItem value="2.1">2.1% (Minimal)</SelectItem>
              <SelectItem value="0">0% (Exonéré)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unit">Unité</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heure">Heure</SelectItem>
              <SelectItem value="jour">Jour</SelectItem>
              <SelectItem value="forfait">Forfait</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || !name || !priceHT}>
          {isLoading ? "Création..." : "Créer produit"}
        </Button>
      </div>
    </form>
  );
}
