import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function QuotesTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Devis</h2>
        <Button className="gap-2">
          <Plus size={16} />
          Nouveau devis
        </Button>
      </div>
      <Card className="p-8 text-center bg-slate-50 border border-slate-200">
        <p className="text-slate-600">Onglet Devis - À implémenter</p>
      </Card>
    </div>
  );
}
