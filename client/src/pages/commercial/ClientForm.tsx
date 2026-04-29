import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import SiretSearchForm from "./SiretSearchForm";

interface ClientFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ClientForm({
  onSubmit,
  onCancel,
  isLoading,
}: ClientFormProps) {
  const [type, setType] = useState("entreprise");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [showSiretSearch, setShowSiretSearch] = useState(false);

  const handleSiretSelect = (data: any) => {
    setType(data.type);
    setName(data.name);
    setAddress(data.address || "");
    setSiret(data.siret || "");
    setVatNumber(data.vatNumber || "");
    setShowSiretSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      type,
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      siret: siret || undefined,
      vatNumber: vatNumber || undefined,
    });
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setSiret("");
    setVatNumber("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type === "entreprise" && (
        <>
          {showSiretSearch && (
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-slate-900 mb-3">
                Rechercher une entreprise
              </h3>
              <SiretSearchForm onSelect={handleSiretSelect} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSiretSearch(false)}
                className="mt-3 w-full"
              >
                Annuler
              </Button>
            </Card>
          )}

          {!showSiretSearch && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSiretSearch(true)}
              className="w-full"
            >
              Rechercher une entreprise par SIRET/SIREN
            </Button>
          )}
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">Particulier</SelectItem>
              <SelectItem value="entreprise">Entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom du client"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+33 1 23 45 67 89"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Adresse complète"
          rows={3}
        />
      </div>

      {type === "entreprise" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              value={siret}
              onChange={e => setSiret(e.target.value)}
              placeholder="14 chiffres"
            />
          </div>
          <div>
            <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
            <Input
              id="vatNumber"
              value={vatNumber}
              onChange={e => setVatNumber(e.target.value)}
              placeholder="FR12345678901"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || !name}>
          {isLoading ? "Création..." : "Créer client"}
        </Button>
      </div>
    </form>
  );
}
