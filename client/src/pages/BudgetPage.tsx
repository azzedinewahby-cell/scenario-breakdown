import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Clapperboard,
  Users,
  Euro,
  AlertTriangle,
  Lightbulb,
  Calendar,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  FileText,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────────────────
interface TeamMember {
  department: string;
  role: string;
  daysEco: number;
  rateEco: number;
  daysConfort: number;
  rateConfort: number;
}

interface BudgetData {
  shootingDays: number;
  pagesPerDay: number;
  heavyDays: number;
  lightDays: number;
  analysis: string;
  risks: string[];
  optimizations: string[];
  team: TeamMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────
function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const DEPT_COLORS: Record<string, string> = {
  "Réalisation": "bg-blue-50 border-blue-200",
  "Image": "bg-purple-50 border-purple-200",
  "Électricité": "bg-yellow-50 border-yellow-200",
  "Machinerie": "bg-orange-50 border-orange-200",
  "Son": "bg-green-50 border-green-200",
  "Artistique": "bg-pink-50 border-pink-200",
  "Production": "bg-red-50 border-red-200",
};

const DEPT_ICONS: Record<string, string> = {
  "Réalisation": "🎬",
  "Image": "🎥",
  "Électricité": "💡",
  "Machinerie": "🎪",
  "Son": "🎤",
  "Artistique": "🎭",
  "Production": "🚚",
};

// ─── Composant ScenarioSelector ───────────────────────────────────────────────────────────────
function ScenarioSelector({ onSelect }: { onSelect: (id: number, title: string) => void }) {
  const { data: scenarios, isLoading } = trpc.scenario.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completed = scenarios?.filter((s) => s.status === "completed") ?? [];

  if (completed.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Aucun scénario disponible</p>
          <p className="text-xs text-muted-foreground">Importez un scénario pour générer son budget.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Sélectionnez un scénario
      </h2>
      {completed.map((s) => (
        <Card
          key={s.id}
          className="cursor-pointer hover:shadow-md transition-all hover:border-red-900/30"
          onClick={() => onSelect(s.id, s.title)}
        >
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                <Clapperboard className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.sceneCount} séquences · {s.characterCount} personnages · {s.locationCount} décors
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Composant BudgetView ────────────────────────────────────────────────────────────────────────────────
function BudgetView({ scenarioId, scenarioTitle, onBack }: { scenarioId: number; scenarioTitle: string; onBack: () => void }) {
  const [version, setVersion] = useState<"eco" | "confort">("eco");

  const { data: existing, isLoading: loadingExisting, refetch } = trpc.budget.get.useQuery({ scenarioId });
  const generateMutation = trpc.budget.generate.useMutation({
    onSuccess: () => refetch(),
  });
  const exportMutation = trpc.budget.exportExcel.useMutation();

  const budgetData: BudgetData | null = (() => {
    if (existing?.content) {
      try { return JSON.parse(existing.content); } catch { return null; }
    }
    return null;
  })();

  const teamByDept = budgetData?.team.reduce((acc, m) => {
    if (!acc[m.department]) acc[m.department] = [];
    acc[m.department].push(m);
    return acc;
  }, {} as Record<string, TeamMember[]>) ?? {};

  const totalEco = budgetData?.team.reduce((s, m) => s + m.daysEco * m.rateEco, 0) ?? 0;
  const totalConfort = budgetData?.team.reduce((s, m) => s + m.daysConfort * m.rateConfort, 0) ?? 0;
  const total = version === "eco" ? totalEco : totalConfort;

  const handleExportExcel = async (exportVersion: "eco" | "confort") => {
    try {
      const result = await exportMutation.mutateAsync({ scenarioId, version: exportVersion });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", result.filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            ← Retour
          </button>
          <h2 className="text-lg font-semibold text-foreground">{scenarioTitle}</h2>
          <p className="text-sm text-muted-foreground">Plan de production &amp; budget équipe</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate({ scenarioId })}
          disabled={generateMutation.isPending}
          className="bg-red-900 hover:bg-red-800 text-white"
          size="sm"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération en cours...</>
          ) : budgetData ? (
            <><RefreshCw className="h-4 w-4 mr-2" />Régénérer</>
          ) : (
            <><Euro className="h-4 w-4 mr-2" />Générer le budget</>
          )}
        </Button>
      </div>

      {generateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Erreur lors de la génération. Veuillez réessayer.
        </div>
      )}

      {!budgetData && !generateMutation.isPending && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Euro className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Aucun budget généré</p>
            <p className="text-xs text-muted-foreground mb-4">
              Cliquez sur "Générer le budget" pour obtenir une estimation complète basée sur les tarifs syndicaux français.
            </p>
          </CardContent>
        </Card>
      )}

      {generateMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-red-900 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Analyse en cours...</p>
            <p className="text-xs text-muted-foreground">
              L'IA analyse votre scénario et calcule le budget selon les conventions syndicales françaises.
            </p>
          </CardContent>
        </Card>
      )}

      {budgetData && (
        <>
          {/* Sélecteur de version */}
          <div className="flex gap-3">
            <button
              onClick={() => setVersion("eco")}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                version === "eco"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <div className="text-lg font-bold">{formatEuro(totalEco)}</div>
              <div className="text-xs mt-0.5">Version Éco (minimas syndicaux)</div>
            </button>
            <button
              onClick={() => setVersion("confort")}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                version === "confort"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <div className="text-lg font-bold">{formatEuro(totalConfort)}</div>
              <div className="text-xs mt-0.5">Version Confort (tarifs marché)</div>
            </button>
          </div>

          {/* Boutons d'export */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleExportExcel("eco")}
              disabled={exportMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              📥 Exporter Éco
            </Button>
            <Button
              onClick={() => handleExportExcel("confort")}
              disabled={exportMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              📥 Exporter Confort
            </Button>
          </div>

          {/* Plan de tournage */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-red-900" />
                  <span className="text-xs text-muted-foreground">Jours de tournage</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{budgetData.shootingDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Pages / jour</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{budgetData.pagesPerDay}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Journées lourdes</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">{budgetData.heavyDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Journées légères</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{budgetData.lightDays}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="budget">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="budget">
                <Euro className="h-4 w-4 mr-1.5" />
                Budget équipe
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="h-4 w-4 mr-1.5" />
                Équipe
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Lightbulb className="h-4 w-4 mr-1.5" />
                Analyse
              </TabsTrigger>
            </TabsList>

            {/* Onglet Budget */}
            <TabsContent value="budget" className="space-y-4 mt-4">
              {Object.entries(teamByDept).map(([dept, members]) => {
                const deptTotal = members.reduce((s, m) =>
                  s + (version === "eco" ? m.daysEco * m.rateEco : m.daysConfort * m.rateConfort), 0);
                return (
                  <Card key={dept} className={`border ${DEPT_COLORS[dept] || "bg-gray-50 border-gray-200"}`}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{DEPT_ICONS[dept] || "👤"}</span>
                          <CardTitle className="text-sm font-semibold">{dept}</CardTitle>
                        </div>
                        <span className="text-sm font-bold">{formatEuro(deptTotal)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left pb-1 font-medium">Poste</th>
                            <th className="text-right pb-1 font-medium">Jours</th>
                            <th className="text-right pb-1 font-medium">Tarif/j</th>
                            <th className="text-right pb-1 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m, i) => {
                            const days = version === "eco" ? m.daysEco : m.daysConfort;
                            const rate = version === "eco" ? m.rateEco : m.rateConfort;
                            const lineTotal = days * rate;
                            return (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1.5 text-foreground">{m.role}</td>
                                <td className="py-1.5 text-right text-muted-foreground">{days}j</td>
                                <td className="py-1.5 text-right text-muted-foreground">{formatEuro(rate)}</td>
                                <td className="py-1.5 text-right font-medium text-foreground">{formatEuro(lineTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Total général */}
              <Card className="bg-foreground text-background">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-80">Total équipe technique</p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {version === "eco" ? "Minimas syndicaux" : "Tarifs marché"} · {budgetData.shootingDays} jours
                    </p>
                  </div>
                  <div className="text-2xl font-bold">{formatEuro(total)}</div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Équipe */}
            <TabsContent value="team" className="mt-4">
              <div className="space-y-3">
                {Object.entries(teamByDept).map(([dept, members]) => (
                  <Card key={dept}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{DEPT_ICONS[dept] || "👤"}</span>
                        <CardTitle className="text-sm font-semibold">{dept}</CardTitle>
                        <Badge variant="outline" className="ml-auto text-xs">{members.length} poste{members.length > 1 ? "s" : ""}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="flex flex-wrap gap-2">
                        {members.map((m, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                            {m.role}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Onglet Analyse */}
            <TabsContent value="analysis" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Analyse de faisabilité
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{budgetData.analysis}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Risques identifiés
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ul className="space-y-2">
                      {budgetData.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-amber-500 mt-0.5">⚠</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-green-600" />
                      Optimisations possibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ul className="space-y-2">
                      {budgetData.optimizations.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const [selectedScenario, setSelectedScenario] = useState<{ id: number; title: string } | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Budget
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estimez le budget de production selon les tarifs syndicaux français
          </p>
        </div>

        {selectedScenario ? (
          <BudgetView
            scenarioId={selectedScenario.id}
            scenarioTitle={selectedScenario.title}
            onBack={() => setSelectedScenario(null)}
          />
        ) : (
          <ScenarioSelector onSelect={(id, title) => setSelectedScenario({ id, title })} />
        )}
      </div>
    </DashboardLayout>
  );
}
