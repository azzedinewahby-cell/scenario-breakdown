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
  FileText,
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
  } = trpc.scenario.breakdown.useQuery(
    { scenarioId },
    { enabled: scenarioId > 0 }
  );

  const {
    data: csvData,
    refetch: refetchCsv,
    isFetching: csvFetching,
  } = trpc.scenario.exportCsv.useQuery(
    { scenarioId },
    { enabled: false }
  );

  const {
    data: pdfData,
    refetch: refetchPdf,
    isFetching: pdfFetching,
  } = trpc.scenario.exportPdfHtml.useQuery(
    { scenarioId },
    { enabled: false }
  );

  const handleExportCsv = async () => {
    try {
      const { data } = await refetchCsv();
      if (data) {
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", data.fileName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Dépouillement exporté en CSV.");
      }
    } catch (err) {
      toast.error("Erreur lors de l'export CSV.");
    }
  };

  const handleExportPdf = async () => {
    try {
      const { data } = await refetchPdf();
      if (data) {
        const printWindow = window.open("", "", "width=1200,height=800");
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      }
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF.");
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">Scénario non trouvé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/history")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
              {scenario.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {scenario.fileName} • {new Date(scenario.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        {scenario.status === "completed" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={csvFetching}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={pdfFetching}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
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
              label="Séquences"
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
              <ul className="space-y-1.5">
                {breakdown.characters.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <GenderEmoji gender={(c as any).gender} />
                    <span className="text-sm text-foreground">{c.name}</span>
                  </li>
                ))}
              </ul>
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
                Dépouillement des séquences
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

function GenderEmoji({ gender }: { gender?: string }) {
  if (gender === "female") {
    return <span style={{ fontSize: "1.25rem", color: "#E91E8C" }}>👩</span>;
  }
  if (gender === "male") {
    return <span style={{ fontSize: "1.25rem", color: "#2196F3" }}>👨</span>;
  }
  return <Users className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />;
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
