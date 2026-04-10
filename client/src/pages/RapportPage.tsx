import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

interface Document {
  name: string;
  url: string;
  category: string;
  format: string;
}

const documents: Document[] = [
  // Contacts
  { name: "Liste artistique", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Liste-artistique-ARA.docx", category: "Contacts", format: "DOC" },
  { name: "Liste technique", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Liste-technique-ARA.docx", category: "Contacts", format: "DOC" },
  
  // Préparation
  { name: "DPS (Modèle DOCX)", url: "https://www.arassocies.com/wp-content/uploads/2019/09/Modèle-ARA-DPS.docx", category: "Préparation", format: "DOCX" },
  { name: "DPS (Modèle DOC)", url: "https://www.arassocies.com/wp-content/uploads/2019/09/Modèle-ARA-DPS-Word-97_2004-.doc", category: "Préparation", format: "DOC" },
  { name: "Découpage technique", url: "https://www.arassocies.com/wp-content/uploads/2017/03/Découpage-technique-ARA.docx", category: "Préparation", format: "DOC" },
  
  // Dépouillement
  { name: "Feuille de dépouillement simple", url: "https://www.arassocies.com/wp-content/uploads/2015/08/Dépouillement-classique-ARA.xlsx", category: "Dépouillement", format: "XLS" },
  { name: "Feuille de dépouillement synthétique", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Dépouillement-synthétique-ARA.xlsx", category: "Dépouillement", format: "XLS" },
  { name: "Liste des séquences par décor", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Liste-des-séquences-par-décor-ARA.xlsx", category: "Dépouillement", format: "XLS" },
  { name: "Tableau de continuité du scénario", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Continuité-simple-ARA.xlsx", category: "Dépouillement", format: "XLS" },
  
  // Devis
  { name: "Devis CNC Cinema Version 3 chiffres", url: "https://www.arassocies.com/wp-content/uploads/2021/10/Devis_CNC_Cinema_version_2018_01_24_V_3_chiffres.pdf", category: "Devis", format: "PDF" },
  { name: "Devis CNC Cinema Version 4 chiffres", url: "https://www.arassocies.com/wp-content/uploads/2021/10/Devis_CNC_Cinema_version_2018_01_24_V_4_chiffres.pdf", category: "Devis", format: "PDF" },
  { name: "Devis CNC Cinema Version 5 chiffres", url: "https://www.arassocies.com/wp-content/uploads/2021/10/Devis_CNC_Cinema_version_2018_01_24_V_5_chiffres.pdf", category: "Devis", format: "PDF" },
  { name: "Devis CNC Cinema classique", url: "https://www.arassocies.com/wp-content/uploads/2016/11/Exemple-de-devis-type-CNC.xlsx", category: "Devis", format: "XLSX" },
  
  // Feuilles de service
  { name: "Feuille de service pour film publicitaire (DOC)", url: "https://www.arassocies.com/wp-content/uploads/2019/05/FDS-Pub-type-ARA.doc", category: "Feuilles de service", format: "DOC" },
  { name: "Feuille de service pour film publicitaire (PDF)", url: "https://www.arassocies.com/wp-content/uploads/2019/05/FDS-Pub-type-ARA.pdf", category: "Feuilles de service", format: "PDF" },
  
  // Movie Magic Scheduling
  { name: "Template par défaut en anglais", url: "https://www.arassocies.com/wp-content/uploads/2018/01/Default-Template.mst_.zip", category: "Movie Magic Scheduling", format: "ZIP" },
  { name: "Template par défaut en français", url: "https://www.arassocies.com/wp-content/uploads/2018/01/French-Template.mst_.zip", category: "Movie Magic Scheduling", format: "ZIP" },
  
  // Planning
  { name: "Plan de travail pour film publicitaire", url: "https://www.arassocies.com/wp-content/uploads/2019/05/Plan-de-travail-PUB-type-ARA.pdf", category: "Planning", format: "PDF" },
  { name: "Exemple PPM pour film publicitaire", url: "https://www.arassocies.com/wp-content/uploads/2019/05/PPM-Client-exemple-ARA.pdf", category: "Planning", format: "PDF" },
  
  // Logistique
  { name: "Feuille de transport", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Feuille-de-transport-ARA.doc", category: "Logistique", format: "DOC" },
  { name: "Feuille de repérage", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Feuille-de-repérage-ARA.pdf", category: "Logistique", format: "PDF" },
  { name: "Pré-minutage", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Pré-minutage.xls", category: "Logistique", format: "XLS" },
  
  // Rapports
  { name: "Rapport Image", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Rapport-Image-ARA.pdf", category: "Rapports", format: "PDF" },
  { name: "Rapport Montage", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Rapport-Montage-ARA.pdf", category: "Rapports", format: "PDF" },
  { name: "Rapport Montage simple", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Rapport-Montage-ARA-2.pdf", category: "Rapports", format: "PDF" },
  { name: "Rapport Production (XLS)", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Rapport-Production.xls", category: "Rapports", format: "XLS" },
  { name: "Rapport Production (PDF)", url: "https://www.arassocies.com/wp-content/uploads/2015/05/Rapport-Production-2.pdf", category: "Rapports", format: "PDF" },
  
  // Autres
  { name: "Calcul des heures par semaine", url: "https://www.arassocies.com/wp-content/uploads/2019/09/Calcul-des-heures.xlsx", category: "Autres", format: "XLSX" },
];

const categories = Array.from(new Set(documents.map(d => d.category)));

const getFormatColor = (format: string) => {
  switch (format) {
    case "PDF":
      return "bg-red-100 text-red-700";
    case "DOC":
    case "DOCX":
      return "bg-blue-100 text-blue-700";
    case "XLS":
    case "XLSX":
      return "bg-green-100 text-green-700";
    case "ZIP":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const handleDownload = (url: string, name: string) => {
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Téléchargement de ${name} lancé`);
  } catch (error) {
    console.error("Erreur de téléchargement:", error);
    toast.error("Erreur lors du téléchargement");
  }
};

export default function RapportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Rapports & Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Téléchargez les modèles de documents de production
          </p>
        </div>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {documents
                  .filter((doc) => doc.category === category)
                  .map((doc) => (
                    <Card key={doc.name} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${getFormatColor(
                                  doc.format
                                )}`}
                              >
                                {doc.format}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc.url, doc.name)}
                            className="shrink-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
