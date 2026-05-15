import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ExternalLink, RefreshCw, Euro, Calendar, Building2 } from "lucide-react";

type Appel = {
  organisme: string;
  nom: string;
  type: string;
  montant: string;
  echeance: string;
  prochaineDeadline?: string;
  joursRestants?: number;
  description: string;
  url?: string;
  ouvert: boolean;
};

const CACHE_KEY = "financement_appels";
const CACHE_TTL = 24 * 60 * 60 * 1000;

const loadCache = (): { data: Appel[]; ts: number } | null => {
  try {
    const s = localStorage.getItem(CACHE_KEY);
    if (!s) return null;
    const c = JSON.parse(s);
    if (Date.now() - c.ts < CACHE_TTL) return c;
  } catch {}
  return null;
};

const TYPE_COLORS: Record<string, string> = {
  "Subvention": "bg-green-100 text-green-700",
  "Avance remboursable": "bg-blue-100 text-blue-700",
  "Crédit d'impôt": "bg-purple-100 text-purple-700",
  "Investissement": "bg-orange-100 text-orange-700",
};

export default function FinancementSearch() {
  const cached = loadCache();
  const [appels, setAppels] = useState<Appel[]>(cached?.data ?? []);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(cached ? new Date(cached.ts) : null);

  const mutation = trpc.financement.searchAppels.useMutation({
    onSuccess: (data) => {
      const results = (data as any).appels ?? [];
      const now = Date.now();
      setAppels(results);
      setLastUpdate(new Date(now));
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: results, ts: now })); } catch {}
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Appels en cours</h2>
          <p className="text-sm text-slate-500">
            {lastUpdate
              ? `Mis à jour le ${lastUpdate.toLocaleDateString("fr-FR")} à ${lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Cliquez pour charger les aides disponibles"}
          </p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Recherche…</>
            : appels.length
              ? <><RefreshCw className="w-3 h-3" /> Actualiser</>
              : <><Search className="w-4 h-4" /> Rechercher les aides</>}
        </Button>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{mutation.error?.message}</p>
      )}

      {appels.length === 0 && !mutation.isPending && (
        <div className="text-center py-10 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Cliquez sur "Rechercher les aides" pour voir les appels à projets ouverts</p>
        </div>
      )}

      <div className="grid gap-3">
        {appels.map((appel, i) => (
          <Card key={i} className={`p-4 border ${appel.ouvert ? "border-green-200 bg-green-50/30" : "border-slate-200 opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{appel.nom}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${appel.ouvert ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {appel.ouvert ? "● Ouvert" : "Fermé"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap mb-1.5">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{appel.organisme}</span>
                  {appel.montant && <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{appel.montant}</span>}
                  {appel.echeance && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{appel.echeance}</span>}
                </div>
                {appel.prochaineDeadline && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {appel.prochaineDeadline}
                    </span>
                    {appel.joursRestants !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        appel.joursRestants <= 7 ? "bg-red-100 text-red-700" :
                        appel.joursRestants <= 30 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {appel.joursRestants <= 0 ? "Fermé" : `J-${appel.joursRestants}`}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-600 leading-relaxed">{appel.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {appel.type && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[appel.type] || "bg-slate-100 text-slate-600"}`}>
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
