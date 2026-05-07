import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";

type Row = {
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  clientSiret?: string;
  prestation: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
  date?: string;
  _error?: string;
};

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  // Detect separator (comma or semicolon)
  const firstLine = lines[0];
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());

  const findIdx = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxClient = findIdx("client");
  const idxEmail = findIdx("email");
  const idxAddr = findIdx("adresse", "address");
  const idxSiret = findIdx("siret");
  const idxPrest = findIdx("prestation", "description", "service");
  const idxQte = findIdx("quantité", "quantite", "qty", "qte");
  const idxPU = findIdx("prix", "pu", "unitaire");
  const idxTVA = findIdx("tva", "vat");
  const idxDate = findIdx("date");

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
    const row: Row = {
      client: idxClient >= 0 ? cols[idxClient] : "",
      clientEmail: idxEmail >= 0 ? cols[idxEmail] : undefined,
      clientAddress: idxAddr >= 0 ? cols[idxAddr] : undefined,
      clientSiret: idxSiret >= 0 ? cols[idxSiret] : undefined,
      prestation: idxPrest >= 0 ? cols[idxPrest] : "",
      quantite: idxQte >= 0 ? parseFloat(cols[idxQte].replace(",", ".")) || 0 : 1,
      prixUnitaireHT: idxPU >= 0 ? parseFloat(cols[idxPU].replace(",", ".")) || 0 : 0,
      tauxTVA: idxTVA >= 0 ? parseFloat(cols[idxTVA].replace(",", ".")) || 20 : 20,
      date: idxDate >= 0 ? cols[idxDate] : undefined,
    };

    // Validation
    if (!row.client) row._error = "Client manquant";
    else if (!row.prestation) row._error = "Prestation manquante";
    else if (row.quantite <= 0) row._error = "Quantité invalide";
    else if (row.prixUnitaireHT < 0) row._error = "Prix négatif";

    rows.push(row);
  }
  return rows;
}

export default function BulkInvoiceTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const bulkCreate = trpc.commercial.invoices.bulkCreate.useMutation({
    onSuccess: (data) => {
      setResults(data);
      utils.commercial.invoices.list.invalidate();
    },
  });

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
      setResults(null);
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => !r._error);
  const errorRows = rows.filter(r => r._error);
  const totalHT = validRows.reduce((sum, r) => sum + r.quantite * r.prixUnitaireHT, 0);
  const totalTVA = validRows.reduce((sum, r) => sum + r.quantite * r.prixUnitaireHT * (r.tauxTVA / 100), 0);

  const handleDownloadTemplate = () => {
    const csv = "client;clientEmail;clientAddress;clientSiret;prestation;quantite;prixUnitaireHT;tauxTVA;date\n" +
      "Studio Alpha;contact@alpha.fr;1 rue Voltaire 75011 Paris;12345678901234;Étalonnage long-métrage;1;3500;20;2026-05-01\n" +
      "Production Beta;hello@beta.com;5 avenue Hugo 92100 Boulogne;98765432109876;Montage série;3;800;20;2026-05-02";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-prestations.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturation en lot depuis CSV
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Importe un fichier CSV avec tes prestations. Les factures seront générées automatiquement avec numérotation séquentielle, calculs TVA et regroupement par client.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger le modèle CSV
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Importer un CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {fileName && <span className="text-sm text-muted-foreground self-center">📎 {fileName}</span>}
          </div>

          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md">
            <strong>Colonnes attendues :</strong> <code>client</code>, <code>clientEmail</code>, <code>clientAddress</code>, <code>clientSiret</code>, <code>prestation</code>, <code>quantite</code>, <code>prixUnitaireHT</code>, <code>tauxTVA</code>, <code>date</code>
            <br />Séparateur : virgule ou point-virgule. Décimales : point ou virgule.
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Aperçu des données ({rows.length} lignes)</span>
              <div className="flex gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50">{validRows.length} valides</Badge>
                {errorRows.length > 0 && <Badge variant="destructive">{errorRows.length} erreurs</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Prestation</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">PU HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row._error ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{row.client || "—"}</TableCell>
                      <TableCell>{row.prestation || "—"}</TableCell>
                      <TableCell className="text-right">{row.quantite}</TableCell>
                      <TableCell className="text-right">{row.prixUnitaireHT.toFixed(2)} €</TableCell>
                      <TableCell className="text-right">{row.tauxTVA}%</TableCell>
                      <TableCell className="text-right font-mono">{(row.quantite * row.prixUnitaireHT).toFixed(2)} €</TableCell>
                      <TableCell>
                        {row._error ? (
                          <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{row._error}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 gap-1"><CheckCircle2 className="h-3 w-3" />OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm space-y-1">
                <div>Total HT : <strong>{totalHT.toFixed(2)} €</strong></div>
                <div>Total TVA : <strong>{totalTVA.toFixed(2)} €</strong></div>
                <div className="text-base">Total TTC : <strong>{(totalHT + totalTVA).toFixed(2)} €</strong></div>
              </div>
              <Button
                size="lg"
                disabled={validRows.length === 0 || bulkCreate.isPending}
                onClick={() => bulkCreate.mutate({ rows: validRows })}
              >
                {bulkCreate.isPending ? "Génération en cours…" : `Générer ${new Set(validRows.map(r => r.client)).size} facture(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {results.totalInvoices} facture{results.totalInvoices > 1 ? "s" : ""} générée{results.totalInvoices > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Lignes</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.results.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{r.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{r.client}</TableCell>
                    <TableCell className="text-right">{r.lines}</TableCell>
                    <TableCell className="text-right">{r.totalHT.toFixed(2)} €</TableCell>
                    <TableCell className="text-right">{r.totalVAT.toFixed(2)} €</TableCell>
                    <TableCell className="text-right font-bold">{r.totalTTC.toFixed(2)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {results.errors?.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-md text-sm">
                <strong>Erreurs :</strong>
                <ul className="list-disc pl-5 mt-1">
                  {results.errors.map((e: any, i: number) => <li key={i}>{e.client} : {e.error}</li>)}
                </ul>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Les factures sont créées en statut "brouillon". Va dans l'onglet <strong>Factures</strong> pour les éditer, valider et exporter en PDF.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
