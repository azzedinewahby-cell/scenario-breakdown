import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function BudgetPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Budget
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les budgets de production
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-green-900/10 flex items-center justify-center mb-4">
              <DollarSign className="h-6 w-6 text-green-900" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Module Budget - En développement
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Cette fonctionnalité sera bientôt disponible pour gérer les budgets
              de vos productions.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
