import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, RefreshCw } from "lucide-react";

const STORAGE_KEY = (id: number) => `traitement_${id}`;

export function TraitementTab({ scenarioId }: { scenarioId: number }) {
  const [traitement, setTraitement] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY(scenarioId)); } catch { return null; }
  });

  const mutation = trpc.breakdown.generateTraitement.useMutation({
    onSuccess: (data) => {
      setTraitement(data.traitement);
      try { localStorage.setItem(STORAGE_KEY(scenarioId), data.traitement); } catch {}
    },
  });

  const handleGenerate = () => mutation.mutate({ scenarioId });

  const handleReset = () => {
    setTraitement(null);
    try { localStorage.removeItem(STORAGE_KEY(scenarioId)); } catch {}
  };

  if (!traitement) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-center space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-800">Traitement littéraire</h3>
          <p className="text-slate-500 max-w-md">
            Génère un traitement complet et minutieux de ton scénario : prose narrative, psychologie des personnages, tensions dramatiques, atmosphère — scène par scène.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={mutation.isPending} size="lg" className="gap-2">
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…</> : <><FileText className="w-4 h-4" /> Générer le traitement</>}
        </Button>
        {mutation.isError && (
          <p className="text-sm text-red-500">{mutation.error?.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Traitement littéraire</h3>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RefreshCw className="w-3 h-3" /> Régénérer
        </Button>
      </div>
      <Card className="p-6 bg-white border border-slate-200">
        <div className="prose prose-slate max-w-none">
          {traitement.split("\n\n").map((paragraph, i) => {
            if (paragraph.startsWith("SCÈNE") || paragraph.startsWith("Scène") || /^#{1,3} /.test(paragraph)) {
              return (
                <h3 key={i} className="font-bold text-slate-800 mt-6 mb-3 text-base border-b border-slate-200 pb-2">
                  {paragraph.replace(/^#{1,3} /, "")}
                </h3>
              );
            }
            return (
              <p key={i} className="text-slate-700 leading-relaxed mb-4 text-sm">
                {paragraph}
              </p>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
