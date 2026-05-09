import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Building2, CheckCircle } from "lucide-react";

interface SiretSearchFormProps {
  onSelect: (data: any) => void;
}

export default function SiretSearchForm({ onSelect }: SiretSearchFormProps) {
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const debounceRef = useRef<any>(null);

  const { data: results = [], isFetching, error } = trpc.commercial.clients.searchByQuery.useQuery(
    { query },
    { enabled: enabled && query.trim().length >= 2, staleTime: 30000 }
  );

  const handleChange = (val: string) => {
    setQuery(val);
    setSelectedIdx(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => setEnabled(true), 500);
    } else {
      setEnabled(false);
    }
  };

  const handleSelect = (r: any) => {
    onSelect({
      type: "entreprise",
      name: r.name,
      address: r.address,
      siret: r.siret,
      vatNumber: r.vatNumber,
    });
    setQuery("");
    setEnabled(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Raison sociale ou SIRET (min. 2 caractères)…"
          className="pl-9 pr-10"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 px-1">Erreur : {error.message}</p>
      )}

      {results.length > 0 && (
        <div className="border rounded-md divide-y overflow-hidden shadow-sm">
          {results.map((r: any, i: number) => (
            <button
              key={r.siret || i}
              type="button"
              onClick={() => handleSelect(r)}
              className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start gap-2 ${selectedIdx === i ? "bg-accent" : ""}`}
            >
              <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                <p className="text-xs text-muted-foreground">
                  {r.siret ? `SIRET : ${r.siret}` : `SIREN : ${r.siren}`}
                  {r.status === "inactif" && <span className="ml-2 text-red-500">● Inactif</span>}
                </p>
              </div>
              <CheckCircle className="w-4 h-4 shrink-0 text-primary opacity-0 group-hover:opacity-100 mt-0.5" />
            </button>
          ))}
        </div>
      )}

      {enabled && !isFetching && results.length === 0 && query.length >= 2 && (
        <p className="text-xs text-muted-foreground px-1">Aucun résultat trouvé.</p>
      )}
    </div>
  );
}
