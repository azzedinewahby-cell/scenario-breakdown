import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, RefreshCw, Euro, Calendar, Building2 } from "lucide-react";

type Appel = {
  organisme: string;
  nom: string;
  type: string;
  montant: string;
  echeance: string;
  description: string;
  url?: string;
  ouvert: boolean;
};

const STORAGE_KEY = "financement_appels_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

export default function FinancementSearch() {
  const [loading, setLoading] = useState(false);
  const [appels, setAppels] = useState<Appel[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_DURATION) return data;
      }
    } catch {}
    return [];
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return new Date(JSON.parse(cached).ts);
    } catch {}
    return null;
  });

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Recherche les appels à projets et aides au financement cinéma et audiovisuel ouverts en France en ${new Date().getFullYear()}.
            
Inclus : CNC (COSIP, avance sur recettes, aide au développement), PROCIREP, ANGOA, fonds régionaux (Île-de-France, PACA, Occitanie, etc.), SOFICA, aides européennes (Creative Europe Media), Arte, France Télévisions.

Pour chaque aide trouvée, génère UNIQUEMENT ce JSON valide :
{
  "appels": [
    {
      "organisme": "CNC",
      "nom": "Avance sur recettes - Avant réalisation",
      "type": "Avance remboursable",
      "montant": "jusqu'à 800 000 €",
      "echeance": "4 fois par an",
      "description": "Description courte",
      "url": "https://...",
      "ouvert": true
    }
  ]
}

Réponse JSON uniquement, sans texte avant ou après.`
          }],
        }),
      });

      const data = await res.json();
      const text = (data.content || [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");

      const first = text.indexOf("{");
      const last = text.lastIndexOf("}");
      if (first === -1) throw new Error("Aucun résultat trouvé");
      const parsed = JSON.parse(text.slice(first, last + 1));
      const results = parsed.appels ?? [];
      setAppels(results);
      const now = Date.now();
      setLastUpdate(new Date(now));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: results, ts: now }));
    } catch (e: any) {
      setError(e.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const typeColors: Record<string, string> = {
    "Subvention": "bg-green-100 text-green-700",
    "Avance remboursable": "bg-blue-100 text-blue-700",
    "Crédit d'impôt": "bg-purple-100 text-purple-700",
    "Investissement": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Appels en cours</h2>
          <p className="text-sm text-slate-500">
            {lastUpdate ? `Mis à jour le ${lastUpdate.toLocaleDateString("fr-FR")} à ${lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Données non chargées"}
          </p>
        </div>
        <Button onClick={search} disabled={loading} className="gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recherche…</> : <><Search className="w-4 h-4" /> {appels.length ? <><RefreshCw className="w-3 h-3" /> Actualiser</> : "Rechercher les aides"}</>}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {appels.length === 0 && !loading && !error && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Clique sur "Rechercher les aides" pour voir les appels à projets ouverts</p>
        </div>
      )}

      <div className="grid gap-4">
        {appels.map((appel, i) => (
          <Card key={i} className={`p-4 border ${appel.ouvert ? "border-green-200 bg-green-50/30" : "border-slate-200 opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{appel.nom}</span>
                  {appel.ouvert ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">● Ouvert</span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Fermé</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap mb-2">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{appel.organisme}</span>
                  {appel.montant && <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{appel.montant}</span>}
                  {appel.echeance && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{appel.echeance}</span>}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{appel.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {appel.type && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[appel.type] || "bg-slate-100 text-slate-600"}`}>
                    {appel.type}
                  </span>
                )}
                {appel.url && (
                  <a href={appel.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    Voir <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
