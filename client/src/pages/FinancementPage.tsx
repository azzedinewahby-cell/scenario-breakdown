import { Card, CardContent } from "@/components/ui/card";
import { Banknote } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function FinancementPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Financement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les sources de financement
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-red-900/10 flex items-center justify-center mb-4">
              <Banknote className="h-6 w-6 text-red-900" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Module Financement - En développement
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Cette fonctionnalité sera bientôt disponible pour gérer les sources
              de financement de vos productions.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
