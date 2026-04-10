import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScenarioReaderProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export function ScenarioReader({ fileUrl, fileName, onClose }: ScenarioReaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const fileExtension = fileName.toLowerCase().split(".").pop();

  // For PDF, use iframe with built-in viewer
  if (fileExtension === "pdf") {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground truncate">{fileName}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // For DOCX and FDX, show simple text content
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground truncate">{fileName}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-muted/30 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              {fileExtension === "docx"
                ? "Fichier DOCX - Utilisez un lecteur DOCX pour afficher le contenu formaté"
                : "Fichier FDX - Utilisez un lecteur Final Draft pour afficher le scénario"}
            </p>
            <p className="text-xs mt-2">
              Vous pouvez télécharger le fichier pour le consulter dans l'application appropriée
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
