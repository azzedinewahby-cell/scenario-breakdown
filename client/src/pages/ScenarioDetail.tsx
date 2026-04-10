import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { ScenarioReader } from "@/components/ScenarioReader";
import { BreakdownTabs } from "./BreakdownTabs";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

function ScenarioDetailContent() {
  const params = useParams<{ id: string }>();
  const scenarioId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const [showReader, setShowReader] = useState(false);

  const {
    data: scenario,
    isLoading: scenarioLoading,
  } = trpc.scenario.get.useQuery(
    { id: scenarioId },
    { enabled: scenarioId > 0, refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "processing" ? 3000 : false;
    }}
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReader(true)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Lire
          </Button>
          {scenario.status === "completed" && (
            <>
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
            </>
          )}
        </div>
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

      {/* Completed breakdown with tabs */}
      {scenario.status === "completed" && (
        <BreakdownTabs scenarioId={scenarioId} />
      )}

      {/* Reader modal */}
      {showReader && scenario.fileUrl && (
        <ScenarioReader
          fileUrl={scenario.fileUrl}
          fileName={scenario.fileName}
          onClose={() => setShowReader(false)}
        />
      )}
    </div>
  );
}

export default function ScenarioDetail() {
  return (
    <DashboardLayout>
      <ScenarioDetailContent />
    </DashboardLayout>
  );
}
