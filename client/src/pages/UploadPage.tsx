import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCallback, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_EXTENSIONS = [".pdf", ".fdx", ".docx"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function UploadContent() {
  const [, setLocation] = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.scenario.upload.useMutation();

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Le fichier dépasse la taille maximale de 20 Mo.";
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const contentTypeMap: Record<string, string> = {
        pdf: "application/pdf",
        fdx: "application/xml",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
      const contentType = contentTypeMap[ext] ?? "application/octet-stream";

      const result = await uploadMutation.mutateAsync({
        fileName: selectedFile.name,
        fileBase64: base64,
        contentType,
      });

      toast.success("Scénario importé avec succès. Analyse en cours...");
      setLocation(`/scenario/${result.scenarioId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'import du scénario.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
          Importer un scénario
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Déposez votre fichier pour lancer le dépouillement automatique
        </p>
      </div>

      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-all duration-200 ${
          dragActive
            ? "border-primary bg-primary/5"
            : selectedFile
              ? "border-primary/30 bg-primary/3"
              : "border-border hover:border-muted-foreground/30"
        }`}
      >
        <CardContent className="p-0">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !selectedFile && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center py-16 px-8 text-center ${
              !selectedFile ? "cursor-pointer" : ""
            }`}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(selectedFile.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="gap-1.5"
                    disabled={uploading}
                  >
                    <X className="h-3.5 w-3.5" />
                    Retirer
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload();
                    }}
                    disabled={uploading}
                    className="gap-1.5 shadow-sm"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Lancer le dépouillement
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Glissez-déposez votre scénario ici
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  ou cliquez pour parcourir vos fichiers
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-muted font-mono">
                    PDF
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted font-mono">
                    FDX
                  </span>
                  <span className="px-2 py-0.5 rounded bg-muted font-mono">
                    DOCX
                  </span>
                  <span className="text-muted-foreground/50 ml-1">
                    &middot; 20 Mo max
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.fdx,.docx"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

export default function UploadPage() {
  return (
    <DashboardLayout>
      <UploadContent />
    </DashboardLayout>
  );
}
