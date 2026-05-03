import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Film,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Upload,
  History,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function HistoryContent() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: scenarios, isLoading } = trpc.scenario.list.useQuery();
  const deleteMutation = trpc.scenario.delete.useMutation({
    onSuccess: () => {
      utils.scenario.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Scénario supprimé.");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Scénario
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Retrouvez tous vos scénarios importés
          </p>
        </div>
        <Button
          onClick={() => setLocation("/upload")}
          className="gap-2 shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Importer
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !scenarios || scenarios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Aucun scénario dans l'historique
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Vos scénarios importés apparaîtront ici.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/upload")}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              Importer un scénario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s) => (
            <Card
              key={s.id}
              className="hover:bg-accent/50 transition-colors group"
            >
              <CardContent className="flex items-center justify-between py-3.5 px-4">
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => setLocation(`/scenario/${s.id}`)}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <Film className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{s.fileName}</span>
                      <span>&middot;</span>
                      <span>
                        {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {s.status === "completed" && s.sceneCount !== null && (
                        <>
                          <span>&middot;</span>
                          <span>
                            {s.sceneCount} séquence{(s.sceneCount ?? 0) > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Screenwriter info + Duration */}
                    {(s.screenwriterName || s.screenwriterEmail || s.screenwriterPhone || (s.durationSeconds && s.durationSeconds > 0)) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-border">
                        {s.screenwriterName && (
                          <span className="font-medium text-foreground">{s.screenwriterName}</span>
                        )}
                        {s.screenwriterEmail && (
                          <>
                            {s.screenwriterName && <span>&middot;</span>}
                            <a href={`mailto:${s.screenwriterEmail}`} className="hover:text-foreground transition-colors">
                              {s.screenwriterEmail}
                            </a>
                          </>
                        )}
                        {s.screenwriterPhone && (
                          <>
                            <span>&middot;</span>
                            <a href={`tel:${s.screenwriterPhone}`} className="hover:text-foreground transition-colors">
                              {s.screenwriterPhone}
                            </a>
                          </>
                        )}
                        {s.durationSeconds && s.durationSeconds > 0 ? (
                          <>
                            {(s.screenwriterName || s.screenwriterEmail || s.screenwriterPhone) && <span>&middot;</span>}
                            <span className="flex items-center gap-1">
                              <span>⏱</span>
                              {Math.floor(s.durationSeconds / 60)}min {s.durationSeconds % 60}s
                            </span>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={s.status} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Supprimer ce scénario ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le scénario «{" "}
                          {s.title} » et toutes ses données de dépouillement
                          seront définitivement supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate({ scenarioId: s.id })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setLocation(`/scenario/${s.id}`)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
    completed: {
      label: "Terminé",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    processing: {
      label: "En cours",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    error: {
      label: "Erreur",
      className: "bg-red-50 text-red-700 border-red-200",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    uploading: {
      label: "Upload",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };
  const c = config[status] ?? config.uploading;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${c.className}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

export default function HistoryPage() {
  return (
    <DashboardLayout>
      <HistoryContent />
    </DashboardLayout>
  );
}
