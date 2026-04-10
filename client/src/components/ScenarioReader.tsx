import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ScenarioReaderProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

export function ScenarioReader({ fileUrl, fileName, onClose }: ScenarioReaderProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadFile();
  }, [fileUrl, fileName]);

  const loadFile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Impossible de charger le fichier");

      const fileExtension = fileName.toLowerCase().split(".").pop();

      if (fileExtension === "pdf") {
        await loadPDF(response);
      } else if (fileExtension === "docx") {
        await loadDOCX(response);
      } else if (fileExtension === "fdx") {
        await loadFDX(response);
      } else {
        setError("Format de fichier non supporté");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPDF = async (response: Response) => {
    const arrayBuffer = await response.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setTotalPages(pdf.numPages);

    // Load first page
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join(" ");
    setContent(text);
  };

  const loadDOCX = async (response: Response) => {
    const arrayBuffer = await response.arrayBuffer();
    const { Document } = await import("docx");

    // Parse DOCX using docx library
    const text = await extractDOCXText(arrayBuffer);
    setContent(text);
    setTotalPages(1);
  };

  const loadFDX = async (response: Response) => {
    const text = await response.text();
    const { parseStringPromise } = await import("xml2js");
    const result = await parseStringPromise(text);

    // Extract text from FDX XML structure
    const fdxContent = extractFDXText(result);
    setContent(fdxContent);
    setTotalPages(1);
  };

  const extractDOCXText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await zip.loadAsync(arrayBuffer);

      const documentXml = await zip.file("word/document.xml")?.async("string");
      if (!documentXml) throw new Error("Invalid DOCX file");

      const { parseStringPromise } = await import("xml2js");
      const parsed = await parseStringPromise(documentXml);

      const paragraphs = parsed["w:document"]["w:body"][0]["w:p"] || [];
      const text = paragraphs
        .map((p: any) => {
          const runs = p["w:r"] || [];
          return runs
            .map((r: any) => {
              const textElements = r["w:t"] || [];
              return textElements.map((t: any) => t._).join("");
            })
            .join("");
        })
        .join("\n");

      return text;
    } catch (err) {
      throw new Error("Impossible de lire le fichier DOCX");
    }
  };

  const extractFDXText = (xmlObj: any): string => {
    try {
      const screenplay = xmlObj.FinalDraftXML?.Screenplay?.[0];
      if (!screenplay) return "Impossible de lire le fichier FDX";

      const paragraphs = screenplay.Paragraph || [];
      const text = paragraphs
        .map((p: any) => {
          const text = p.Text?.[0] || "";
          return text;
        })
        .join("\n");

      return text;
    } catch (err) {
      return "Impossible de lire le fichier FDX";
    }
  };

  const handleNextPage = async () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Load next page content
      await loadPageContent(currentPage + 1);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Load previous page content
      await loadPageContent(currentPage - 1);
    }
  };

  const loadPageContent = async (pageNum: number) => {
    // This would load specific page content for PDFs
    // For now, we'll keep it simple
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground truncate">{fileName}</h2>
            {totalPages > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Page {currentPage} sur {totalPages}
              </p>
            )}
          </div>
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
        <div className="flex-1 overflow-auto p-6 bg-muted/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-mono bg-background p-4 rounded-md border border-border overflow-auto max-h-full">
                {content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="gap-2"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
