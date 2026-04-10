import { Card, CardContent } from "@/components/ui/card";
import { Users2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function DistributionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Distribution
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les rôles et les acteurs
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-700/10 flex items-center justify-center mb-4">
              <Users2 className="h-6 w-6 text-amber-700" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Module Distribution - En développement
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Cette fonctionnalité sera bientôt disponible pour gérer la distribution
              des rôles et des acteurs.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
