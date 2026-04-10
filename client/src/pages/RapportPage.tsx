import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Document {
  name: string;
  url: string;
  format: "PDF" | "XLS";
  category: string;
}

const documents: Document[] = [
  // Contacts
  { name: "Liste artistique", url: "https://www.arassocies.com/ressources/modeles/liste-artistique/", format: "PDF", category: "Contacts" },
  { name: "Liste technique", url: "https://www.arassocies.com/ressources/modeles/liste-technique/", format: "PDF", category: "Contacts" },

  // Préparation
  { name: "DPS", url: "https://www.arassocies.com/ressources/modeles/dps/", format: "PDF", category: "Préparation" },
  { name: "Découpage technique", url: "https://www.arassocies.com/ressources/modeles/decoupage-technique/", format: "PDF", category: "Préparation" },

  // Dépouillement
  { name: "Feuilles de dépouillement", url: "https://www.arassocies.com/ressources/modeles/feuilles-depouillement/", format: "PDF", category: "Dépouillement" },
  { name: "Listes des séquences", url: "https://www.arassocies.com/ressources/modeles/listes-sequences/", format: "PDF", category: "Dépouillement" },

  // Rapports
  { name: "Rapport Image", url: "https://www.arassocies.com/ressources/modeles/rapport-image/", format: "PDF", category: "Rapports" },
  { name: "Rapport Montage", url: "https://www.arassocies.com/ressources/modeles/rapport-montage/", format: "PDF", category: "Rapports" },
  { name: "Rapport Production", url: "https://www.arassocies.com/ressources/modeles/rapport-production/", format: "PDF", category: "Rapports" },
];

function getFormatIcon(format: string) {
  return format === "PDF" ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />;
}

function getFormatColor(format: string) {
  return format === "PDF" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";
}

const categories = Array.from(new Set(documents.map(d => d.category)));

export default function RapportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-foreground">
            Rapports et Modèles
          </h1>
          <p className="text-muted-foreground mt-2">
            Téléchargez tous les modèles de documents professionnels
          </p>
        </div>

        {categories.map((category) => (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents
                .filter(doc => doc.category === category)
                .map((doc) => (
                  <Card key={doc.name} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{doc.name}</CardTitle>
                        <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${getFormatColor(doc.format)}`}>
                          {getFormatIcon(doc.format)}
                          {doc.format}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => window.open(doc.url, "_blank")}
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
