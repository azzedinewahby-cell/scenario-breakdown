import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Film,
  Upload,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Users2,
  Banknote,
} from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

function DashboardContent() {
  const [, setLocation] = useLocation();
  const { data: scenarios } = trpc.scenario.list.useQuery();

  const recentScenarios = scenarios?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Tableau de bord
          </h1>
        </div>
        <Button
          onClick={() => setLocation("/upload")}
          className="gap-2 shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Importer un scénario
        </Button>
      </div>

      {/* Main modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModuleCard
          title="Dépouillement"
          description="Analysez et structurez vos scénarios"
          icon={<Film className="h-6 w-6" />}
          color="bg-blue-900"
          textColor="text-blue-900"
          onClick={() => setLocation("/depouillement")}
        />
        <ModuleCard
          title="Budget"
          description="Gérez les budgets de production"
          icon={<DollarSign className="h-6 w-6" />}
          color="bg-green-900"
          textColor="text-green-900"
          onClick={() => setLocation("/budget")}
        />
        <ModuleCard
          title="Distribution"
          description="Gérez les rôles et les acteurs"
          icon={<Users2 className="h-6 w-6" />}
          color="bg-amber-700"
          textColor="text-amber-700"
          onClick={() => setLocation("/distribution")}
        />
        <ModuleCard
          title="Financement"
          description="Gérez les sources de financement"
          icon={<Banknote className="h-6 w-6" />}
          color="bg-red-900"
          textColor="text-red-900"
          onClick={() => setLocation("/financement")}
        />
      </div>



      {/* Recent scenarios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium tracking-tight">
            Scénarios récents
          </h2>
          {recentScenarios.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1"
              onClick={() => setLocation("/history")}
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {recentScenarios.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Film className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Aucun scénario importé
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Importez votre premier scénario au format PDF, FDX ou DOCX pour
                commencer le dépouillement automatique.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/upload")}
                className="gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                Importer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentScenarios.map((s) => (
              <Card
                key={s.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => setLocation(`/scenario/${s.id}`)}
              >
                <CardContent className="flex items-center justify-between py-3.5 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <Film className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.fileName} &middot;{" "}
                        {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  icon,
  color,
  textColor,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="bg-white cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 border border-gray-200"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`${textColor} opacity-90`}>{icon}</div>
          <ArrowRight className={`h-5 w-5 ${textColor} opacity-60`} />
        </div>
        <h3 className={`text-lg font-semibold ${textColor} mb-2`}>{title}</h3>
        <p className="text-sm text-muted-foreground opacity-80">{description}</p>
      </CardContent>
    </Card>
  );
}


function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: {
      label: "Terminé",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    processing: {
      label: "En cours",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    error: {
      label: "Erreur",
      className: "bg-red-50 text-red-700 border-red-200",
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
      {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
      {c.label}
    </span>
  );
}

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
