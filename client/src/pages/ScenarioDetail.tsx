import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  Loader2,
  Film,
  MapPin,
  Users,
  Clapperboard,
  Sun,
  Moon,
  Sunrise,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useState, useEffect } from "react";

function ScenarioDetailContent() {
  const params = useParams<{ id: string }>();
  const scenarioId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();

  const {
    data: scenario,
    isLoading: scenarioLoading,
    refetch: refetchScenario,
  } = trpc.scenario.get.useQuery(
    { id: scenarioId },
    { enabled: scenarioId > 0, refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "processing" ? 3000 : false;
    }}
  );

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    refetch: refetchBreakdown,
  } = trpc.scenario.breakdown.useQuery(
    { scenarioId },
    { enabled: scenarioId > 0 && scenario?.status === "completed" }
  );

  const exportCsv = trpc.scenario.exportCsv.useQuery(
    { scenarioId },
    { enabled: false }
  );

  const handleExportCsv = async () => {
    try {
      const result = await exportCsv.refetch();
      if (result.data) {
        const blob = new Blob(["\ufeff" + result.data.csv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export CSV téléchargé.");
      }
    } catch {
      toast.error("Erreur lors de l'export CSV.");
    }
  };

  if (scenarioLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Scénario introuvable.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 mt-0.5"
            onClick={() => setLocation("/history")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
              {scenario.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {scenario.fileName} &middot;{" "}
              {new Date(scenario.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        {scenario.status === "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-2 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter CSV
          </Button>
        )}
      </div>

      {/* Processing state */}
      {scenario.status === "processing" && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">
                Analyse en cours...
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Le scénario est en cours de dépouillement automatique. Cette
                page se met à jour automatiquement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {scenario.status === "error" && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Erreur lors de l'analyse
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {scenario.errorMessage ?? "Une erreur inconnue est survenue."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed breakdown */}
      {scenario.status === "completed" && breakdown && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat
              icon={<Clapperboard className="h-4 w-4" />}
              label="Scènes"
              value={breakdown.scenes.length}
            />
            <MiniStat
              icon={<Users className="h-4 w-4" />}
              label="Personnages"
              value={breakdown.characters.length}
            />
            <MiniStat
              icon={<MapPin className="h-4 w-4" />}
              label="Lieux"
              value={breakdown.uniqueLocations.length}
            />
            <MiniStat
              icon={<MessageSquare className="h-4 w-4" />}
              label="Dialogues"
              value={breakdown.scenes.reduce(
                (sum, s) => sum + s.dialogues.length,
                0
              )}
            />
          </div>

          {/* Characters list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Personnages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {breakdown.characters.map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="text-xs font-normal py-1 px-2.5"
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Locations list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Lieux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {breakdown.uniqueLocations.map((loc, index) => (
                  <li
                    key={loc}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-sm text-foreground">{loc}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Scenes breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-muted-foreground" />
                Dépouillement des scènes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="multiple" className="w-full">
                {breakdown.scenes.map((scene) => (
                  <AccordionItem
                    key={scene.id}
                    value={String(scene.id)}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                          {String(scene.sceneNumber).padStart(3, "0")}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {scene.intExt && (
                            <span className="text-xs font-medium text-primary">
                              {scene.intExt}
                            </span>
                          )}
                          {scene.location && (
                            <span className="text-sm font-medium">
                              {scene.location}
                            </span>
                          )}
                          {scene.dayNight && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DayNightIcon value={scene.dayNight} />
                              {scene.dayNight}
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4 pl-11">
                        {scene.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {scene.description}
                          </p>
                        )}

                        {scene.characters.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Personnages présents
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {scene.characters.map((name) => (
                                <Badge
                                  key={name}
                                  variant="secondary"
                                  className="text-xs font-normal py-0.5 px-2"
                                >
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {scene.dialogues.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Dialogues
                            </p>
                            <div className="space-y-2">
                              {scene.dialogues.map((d, i) => (
                                <div
                                  key={i}
                                  className="bg-muted/50 rounded-lg px-3 py-2"
                                >
                                  <p className="text-xs font-semibold text-primary mb-0.5">
                                    {d.character}
                                  </p>
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {d.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="text-muted-foreground/60">{icon}</div>
        <div>
          <p className="text-lg font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DayNightIcon({ value }: { value: string }) {
  const lower = value.toLowerCase();
  if (lower.includes("nuit")) return <Moon className="h-3 w-3" />;
  if (lower.includes("aube") || lower.includes("crépuscule"))
    return <Sunrise className="h-3 w-3" />;
  return <Sun className="h-3 w-3" />;
}

export default function ScenarioDetail() {
  return (
    <DashboardLayout>
      <ScenarioDetailContent />
    </DashboardLayout>
  );
}
