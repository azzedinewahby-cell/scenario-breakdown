import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Download,
  Search,
  ChevronDown,
  Lightbulb,
} from "lucide-react";

interface BreakdownTabsProps {
  scenarioId: number;
  onSceneSelect?: (sceneNumber: number) => void;
}

// ─── Download PDF Helper ─────────────────────────────────────────────────────
async function downloadPDF(data: any[], filename: string, columns: string[], title: string = 'Liste'): Promise<void> {
  try {
    // Validate data
    if (!data || data.length === 0) {
      throw new Error('Aucune donnée à télécharger');
    }

    // Dynamic import
    const module = await import('html2pdf.js');
    const html2pdf = module.default;
    
    const headers = columns.map(col => {
      const labelMap: Record<string, string> = {
        'name': 'Nom',
        'gender': 'Genre',
        'age': 'Âge',
        'type': 'Type',
        'description': 'Description',
        'sceneCount': 'Nombre de scènes'
      };
      return labelMap[col] || col.charAt(0).toUpperCase() + col.slice(1);
    });
    
    // Build table rows safely
    const tableRows = data.map(item => {
      const cells = columns.map(col => {
        const value = item[col];
        const cellValue = value !== null && value !== undefined ? String(value) : '';
        return `<td>${cellValue}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    
    const tableHTML = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; margin: 0; padding: 10px; }
            h1 { text-align: center; margin-bottom: 10px; font-size: 18px; }
            .date { text-align: center; color: #666; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #333; color: white; padding: 10px; text-align: right; border: 1px solid #ddd; font-size: 12px; }
            td { padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 11px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="date">التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const element = document.createElement('div');
    element.innerHTML = tableHTML;
    
    const opt = {
      margin: 10,
      filename: `${filename}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'png' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'landscape' as const, unit: 'mm', format: 'a4' }
    };
    
    // Use await for proper async handling
    await html2pdf()
      .set(opt)
      .from(element)
      .save();
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

// ─── Sequence Detail Card ─────────────────────────────────────────────────────
function SequenceDetailCard({ seq, index }: { seq: any; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const { data: seqCharacters = [], isLoading: loadingChars } =
    trpc.breakdown.getCharactersForSequence.useQuery(
      { sequenceId: seq.id },
      { enabled: expanded }
    );

  const { data: seqProps = [], isLoading: loadingProps } =
    trpc.breakdown.getPropsForSequence.useQuery(
      { sequenceId: seq.id },
      { enabled: expanded }
    );

  // Note: getLocationsForSequence n'existe pas, on peut l'ajouter plus tard si nécessaire

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        expanded ? "ring-2 ring-blue-400" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{seq.name}</p>
            {seq.summary && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {seq.summary}
              </p>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform ml-2 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {/* Personnages */}
            {loadingChars ? (
              <p className="text-xs text-gray-400">Chargement...</p>
            ) : seqCharacters.length === 0 ? (
              <p className="text-xs text-gray-400">Aucun personnage</p>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Personnages ({seqCharacters.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {seqCharacters.map((char: any) => (
                    <span
                      key={char.id}
                      className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {char.name}
                    </span>
                  ))}
                </div>
              </div>
            )}



            {/* Accessoires */}
            {loadingProps ? (
              <p className="text-xs text-gray-400">Chargement...</p>
            ) : seqProps.length === 0 ? (
              <p className="text-xs text-gray-400">Aucun accessoire</p>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Accessoires nécessaires ({seqProps.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {seqProps.map((prop: any) => (
                    <span
                      key={prop.id}
                      className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded"
                    >
                      {prop.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Structure Analysis Tab ─────────────────────────────────────────────────────
function StructureAnalysisTab({ scenarioId }: { scenarioId: number }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const { mutate: analyzeStructure } = trpc.breakdown.analyzeStructure.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      setIsAnalyzing(false);
    },
    onError: () => {
      setIsAnalyzing(false);
      alert('Erreur lors de l\'analyse de la structure');
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    analyzeStructure({ scenarioId });
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Lightbulb className="h-12 w-12 text-amber-400 mb-4" />
        <p className="text-sm text-gray-600 mb-4">Analysez la structure de votre scénario en 3 actes</p>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyse en cours...' : 'Analyser la structure'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="outline" className="w-full">
        {isAnalyzing ? 'Analyse en cours...' : 'Réanalyser'}
      </Button>

      {/* Acte I */}
      {analysis.acte_i && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-700 mb-2">Acte I – Exposition</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.acte_i}</p>
          </CardContent>
        </Card>
      )}

      {/* Acte II */}
      {analysis.acte_ii && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <h3 className="font-semibold text-amber-700 mb-2">Acte II – Confrontation</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.acte_ii}</p>
          </CardContent>
        </Card>
      )}

      {/* Acte III */}
      {analysis.acte_iii && (
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-700 mb-2">Acte III – Résolution</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.acte_iii}</p>
          </CardContent>
        </Card>
      )}

      {/* Obstacles */}
      {analysis.obstacles && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <h3 className="font-semibold text-red-700 mb-2">Obstacles majeurs</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.obstacles}</p>
          </CardContent>
        </Card>
      )}

      {/* Climax */}
      {analysis.climax && (
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <h3 className="font-semibold text-purple-700 mb-2">Climax</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.climax}</p>
          </CardContent>
        </Card>
      )}

      {/* Dénouement */}
      {analysis.denouement && (
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <h3 className="font-semibold text-indigo-700 mb-2">Dénouement</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.denouement}</p>
          </CardContent>
        </Card>
      )}

      {/* Recommandations */}
      {analysis.recommandations && (
        <Card className="border-l-4 border-l-cyan-500 bg-cyan-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-cyan-700 mb-2">Recommandations structurelles</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.recommandations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function BreakdownTabs({ scenarioId, onSceneSelect }: BreakdownTabsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [newSequenceName, setNewSequenceName] = useState("");
  const [selectedPropId, setSelectedPropId] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);

  // Fetch data
  const { data: characters = [] } = trpc.breakdown.getCharacters.useQuery({ scenarioId });
  const { data: locations = [] } = trpc.breakdown.getLocations.useQuery({ scenarioId });
  const { data: props = [] } = trpc.breakdown.getProps.useQuery({ scenarioId });
  const { data: sequences = [] } = trpc.breakdown.getSequences.useQuery({ scenarioId });
  const { data: propSequences = [], isLoading: loadingPropSequences } = trpc.breakdown.getSequencesForProp.useQuery(
    { propId: selectedPropId! },
    { enabled: selectedPropId !== null }
  );
  const { data: characterSequences = [] } = trpc.breakdown.getSequencesForCharacter.useQuery(
    { characterId: selectedCharacterId! },
    { enabled: selectedCharacterId !== null }
  );
  const createSequenceMutation = trpc.breakdown.createSequence.useMutation();
  const utils = trpc.useUtils();

  // Filter data based on search
  const filteredCharacters = characters.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredProps = props.filter((p: any) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredSequences = sequences.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSequence = async () => {
    if (!newSequenceName.trim()) return;
    await createSequenceMutation.mutateAsync({
      scenarioId,
      name: newSequenceName,
    });
    setNewSequenceName("");
    utils.breakdown.getSequences.invalidate({ scenarioId });
  };

  return (
    <Tabs defaultValue="sequences" className="w-full">
      <TabsList className="grid w-full grid-cols-7 mb-6">
        <TabsTrigger value="sequences" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Séquences</span>
          <span className="sm:hidden">Séq.</span>
        </TabsTrigger>
        <TabsTrigger value="characters" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Personnages</span>
          <span className="sm:hidden">Pers.</span>
        </TabsTrigger>
        <TabsTrigger value="locations" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Lieux</span>
          <span className="sm:hidden">Lx.</span>
        </TabsTrigger>
        <TabsTrigger value="props" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Accessoires</span>
          <span className="sm:hidden">Acc.</span>
        </TabsTrigger>
        <TabsTrigger value="char-sequences" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Pers. Séq.</span>
          <span className="sm:hidden">PS</span>
        </TabsTrigger>
        <TabsTrigger value="prop-sequences" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Acc. Séq.</span>
          <span className="sm:hidden">AS</span>
        </TabsTrigger>
        <TabsTrigger value="structure" className="text-xs sm:text-sm">
          <span className="hidden sm:inline">Structure</span>
          <span className="sm:hidden">Str.</span>
        </TabsTrigger>
      </TabsList>

      {/* Search bar (shared for Séquences, Personnages, Lieux, Accessoires) */}
      {["sequences", "characters", "locations", "props"].includes(
        document.querySelector('[role="tablist"]')?.getAttribute("data-active") || "sequences"
      ) && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* SÉQUENCES */}
      <TabsContent value="sequences">
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Nouvelle séquence..."
            value={newSequenceName}
            onChange={(e) => setNewSequenceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSequence();
            }}
            className="flex-1"
          />
          <Button onClick={handleCreateSequence} size="sm">
            Ajouter
          </Button>
        </div>
        <div className="space-y-3">
          {filteredSequences.map((seq, idx) => (
            <SequenceDetailCard key={seq.id} seq={seq} index={idx} />
          ))}
        </div>
      </TabsContent>

      {/* PERSONNAGES */}
      <TabsContent value="characters">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Total : <span className="text-blue-600">{characters.length}</span> personnage{characters.length !== 1 ? 's' : ''}</h3>
          <Button
            onClick={async () => { 
              try { 
                if (characters.length === 0) {
                  alert('Aucun personnage à télécharger');
                  return;
                }
                await downloadPDF(characters, 'personnages', ['name', 'gender', 'age', 'sceneCount'], 'Personnages'); 
              } catch (err) { 
                console.error('Download error:', err);
                alert('Erreur lors du téléchargement du PDF: ' + (err instanceof Error ? err.message : String(err)));
              } 
            }}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Download size={16} />
            Télécharger
          </Button>
        </div>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un personnage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {filteredCharacters.length === 0 ? (
          <Card className="p-8 text-center text-gray-400 text-sm">
            Aucun personnage trouvé
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCharacters.map((char: any) => (
              <Card
                key={char.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedCharacterId === char.id ? "ring-2 ring-blue-400" : ""
                }`}
                onClick={() =>
                  setSelectedCharacterId(selectedCharacterId === char.id ? null : char.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{char.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {char.gender && `Genre: ${char.gender}`}
                      {char.age && ` • Âge: ${char.age}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {char.sceneCount} scène{(char.sceneCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {selectedCharacterId === char.id && characterSequences.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Séquences ({characterSequences.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {characterSequences.map((seq: any) => (
                        <span
                          key={seq.id}
                          className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded cursor-pointer hover:bg-blue-200"
                          onClick={() => onSceneSelect?.(seq.id)}
                        >
                          {seq.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* LIEUX */}
      <TabsContent value="locations">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Total : <span className="text-green-600">{locations.length}</span> lieu{locations.length !== 1 ? 'x' : ''}</h3>
          <Button
            onClick={async () => { 
              try { 
                if (locations.length === 0) {
                  alert('Aucun lieu à télécharger');
                  return;
                }
                await downloadPDF(locations, 'lieux', ['name', 'type', 'sceneCount'], 'Lieux'); 
              } catch (err) { 
                console.error('Download error:', err);
                alert('Erreur lors du téléchargement du PDF: ' + (err instanceof Error ? err.message : String(err)));
              } 
            }}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Download size={16} />
            Télécharger
          </Button>
        </div>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un lieu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {filteredLocations.length === 0 ? (
          <Card className="p-8 text-center text-gray-400 text-sm">
            Aucun lieu trouvé
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLocations.map((loc: any) => (
              <Card
                key={loc.id}
                className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{loc.name}</p>
                    {loc.type && (
                      <p className="text-xs text-gray-500 mt-1">Type: {loc.type}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {loc.sceneCount} scène{(loc.sceneCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ACCESSOIRES */}
      <TabsContent value="props">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Total : <span className="text-blue-600">{props.length}</span> accessoire{props.length !== 1 ? 's' : ''}</h3>
          <Button
            onClick={async () => { 
              try { 
                if (props.length === 0) {
                  alert('Aucun accessoire à télécharger');
                  return;
                }
                await downloadPDF(props, 'accessoires', ['name', 'description', 'sceneCount'], 'Accessoires'); 
              } catch (err) { 
                console.error('Download error:', err);
                alert('Erreur lors du téléchargement du PDF: ' + (err instanceof Error ? err.message : String(err)));
              } 
            }}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Download size={16} />
            Télécharger
          </Button>
        </div>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un accessoire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {filteredProps.length === 0 ? (
          <Card className="p-8 text-center text-gray-400 text-sm">
            Aucun accessoire trouvé
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProps.map((prop: any) => (
              <Card
                key={prop.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedPropId === prop.id ? "ring-2 ring-amber-400" : ""
                }`}
                onClick={() =>
                  setSelectedPropId(selectedPropId === prop.id ? null : prop.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{prop.name}</p>
                    {prop.description && (
                      <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {prop.sceneCount} scène{(prop.sceneCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {selectedPropId === prop.id && propSequences.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Séquences ({propSequences.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {propSequences.map((seq: any) => (
                        <span
                          key={seq.id}
                          className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded cursor-pointer hover:bg-amber-200"
                          onClick={() => onSceneSelect?.(seq.id)}
                        >
                          {seq.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* PERSONNAGES PAR SÉQUENCE */}
      <TabsContent value="char-sequences">
        <div className="space-y-3">
          {sequences.map((seq) => {
            // Get characters that appear in this sequence
            const seqChars = characterSequences.filter(
              (cs: any) => cs.sequenceId === seq.id
            );
            const filteredSeqChars = seqChars.filter((c: any) =>
              c.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
              <Card key={seq.id} className="p-4">
                <p className="font-semibold text-sm mb-2">{seq.name}</p>
                {filteredSeqChars.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun personnage</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {filteredSeqChars.map((char: any) => (
                      <span
                        key={char.id}
                        className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {char.name}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* ACCESSOIRES PAR SÉQUENCE */}
      <TabsContent value="prop-sequences">
        <div className="space-y-3">
          {sequences.map((seq) => {
            // Get props that appear in this sequence
            const seqProps = propSequences.filter(
              (ps: any) => ps.sequenceId === seq.id
            );
            const filteredSeqProps = seqProps.filter((p: any) =>
              p.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
              <Card key={seq.id} className="p-4">
                <p className="font-semibold text-sm mb-2">{seq.name}</p>
                {filteredSeqProps.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun accessoire</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {filteredSeqProps.map((prop: any) => (
                      <span
                        key={prop.id}
                        className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded"
                      >
                        {prop.name}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* STRUCTURE */}
      <TabsContent value="structure">
        <StructureAnalysisTab scenarioId={scenarioId} />
      </TabsContent>
    </Tabs>
  );
}
