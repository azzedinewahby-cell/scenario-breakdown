import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SiretSearchFormProps {
  onSelect: (data: any) => void;
}

export default function SiretSearchForm({ onSelect }: SiretSearchFormProps) {
  const [siret, setSiret] = useState("");
  const [searchType, setSearchType] = useState<"siret" | "siren">("siret");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const siretQuery = trpc.commercial.clients.searchBySiret.useQuery(
    { siret },
    { enabled: false }
  );

  const sirenQuery = trpc.commercial.clients.searchBySiren.useQuery(
    { siren: siret },
    { enabled: false }
  );

  const handleSearch = async () => {
    setError(null);
    setResult(null);
    setIsSearching(true);

    try {
      let data;
      if (searchType === "siret") {
        data = await siretQuery.refetch();
      } else {
        data = await sirenQuery.refetch();
      }

      if (data.data) {
        setResult(data.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la recherche"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = () => {
    if (result) {
      onSelect({
        type: "entreprise",
        name: result.name,
        address: result.address,
        siret: result.siret,
        vatNumber: result.vatNumber,
      });
      setSiret("");
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="siret">SIRET/SIREN *</Label>
          <Input
            id="siret"
            value={siret}
            onChange={e => setSiret(e.target.value.replace(/\s/g, ""))}
            placeholder="14 ou 9 chiffres"
            maxLength="14"
          />
        </div>

        <div>
          <Label htmlFor="searchType">Type de recherche</Label>
          <select
            id="searchType"
            value={searchType}
            onChange={e => setSearchType(e.target.value as "siret" | "siren")}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          >
            <option value="siret">SIRET (14 chiffres)</option>
            <option value="siren">SIREN (9 chiffres)</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={
              isSearching ||
              (searchType === "siret" && siret.length !== 14) ||
              (searchType === "siren" && siret.length !== 9)
            }
            className="w-full gap-2"
          >
            <Search size={16} />
            {isSearching ? "Recherche..." : "Rechercher"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="p-4 bg-green-50 border border-green-200">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{result.name}</h3>
              <p className="text-sm text-slate-600 mt-1">{result.address}</p>
              <p className="text-sm text-slate-600">
                {result.siret
                  ? `SIRET: ${result.siret}`
                  : `SIREN: ${result.siren}`}
              </p>
              {result.vatNumber && (
                <p className="text-sm text-slate-600">
                  TVA: {result.vatNumber}
                </p>
              )}
              <p className="text-sm text-slate-600">
                Statut: <span className="font-semibold">{result.status}</span>
              </p>
              <Button
                onClick={handleSelect}
                className="mt-3 w-full"
                variant="default"
              >
                Utiliser ces données
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
