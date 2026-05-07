import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Euro, FileText, Clock, CheckCircle2 } from "lucide-react";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatEuros(cents: number): string {
  const value = cents > 100000 ? cents / 100 : cents;
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function DashboardTab() {
  const { data, isLoading } = trpc.commercial.invoices.dashboard.useQuery();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  if (!data) return null;

  const maxRevenue = Math.max(...data.monthlyRevenue.map(m => m.total), 1);

  const cards = [
    { label: "CA du mois", value: formatEuros(data.totalCAMonth), icon: Euro, color: "bg-green-50 text-green-700" },
    { label: "CA de l'année", value: formatEuros(data.totalCAYear), icon: TrendingUp, color: "bg-blue-50 text-blue-700" },
    { label: "Impayé", value: formatEuros(data.totalUnpaid), icon: Clock, color: "bg-amber-50 text-amber-700" },
    { label: "En retard", value: formatEuros(data.totalOverdue), icon: AlertCircle, color: "bg-red-50 text-red-700", count: data.countOverdue },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div className={`p-2 rounded-lg ${c.color}`}>
                  <c.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
              {c.count !== undefined && c.count > 0 && (
                <div className="text-xs text-muted-foreground mt-1">{c.count} facture{c.count > 1 ? "s" : ""}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Chiffre d'affaires mensuel ({new Date().getFullYear()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-40">
            {data.monthlyRevenue.map((m, i) => {
              const heightPct = (m.total / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group cursor-pointer">
                  <div className="text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.total > 0 ? formatEuros(m.total) : ""}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md min-h-[2px] transition-all hover:from-blue-700 hover:to-blue-500"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total factures</div>
              <div className="text-2xl font-bold">{data.countTotal}</div>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Payées</div>
              <div className="text-2xl font-bold text-green-600">{data.countPaid}</div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">À encaisser</div>
              <div className="text-2xl font-bold text-amber-600">{data.countUnpaid}</div>
            </div>
            <Clock className="h-8 w-8 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Factures récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune facture pour le moment</p>
          ) : (
            <div className="space-y-2">
              {data.recentInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-md hover:bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm font-medium">{inv.number}</div>
                    <Badge variant={inv.status === "payée" ? "default" : inv.status === "en retard" ? "destructive" : "outline"}>
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatEuros(inv.totalTTC ?? 0)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(inv.issueDate).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
