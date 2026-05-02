import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, MapPin, Package, Film, Search, Plus, BookOpen,
  ChevronDown, ChevronUp, Loader2, Layers, Sun, Moon,
  AlertTriangle, CheckCircle2, Calendar, Zap, Download
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CharacterIcon } from "@/components/CharacterIcon";

interface BreakdownTabsProps {
  scenarioId: number;
  onSceneSelect?: (sceneNumber: number) => void;
}

// ─── Download CSV Helper ─────────────────────────────────────────────────────
async function downloadPDF(data: any[], filename: string, columns: string[], title: string = 'Liste') {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    
    const headers = columns.map(col => col.charAt(0).toUpperCase() + col.slice(1));
    const tableHTML = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; }
            h1 { text-align: center; margin-bottom: 10px; }
            .date { text-align: center; color: #666; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #333; color: white; padding: 10px; text-align: right; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; text-align: right; }
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
              ${data.map(item => `
                <tr>
                  ${columns.map(col => `<td>${item[col] || ''}</td>`).join('')}
                </tr>
              `).join('')}
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
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape' as const, unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Erreur lors de la génération du PDF');
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

  return (
    <Card className="p-4 hover:bg-gray-50 transition-colors">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="font-semibold text-sm">#{index + 1} — {seq.name}</div>
          {seq.summary && (
            <div className="text-sm text-gray-600 mt-1 leading-relaxed">{seq.summary}</div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            Séquence
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Personnages */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Personnages
            </div>
            {loadingChars ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Chargement...
              </div>
            ) : seqCharacters.length === 0 ? (
              <div className="text-xs text-gray-400 italic">Aucun personnage associé</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {seqCharacters.map((char: any) => (
                  <div
                    key={char.characterId}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full"
                  >
                    <CharacterIcon gender={char.gender} age={char.age} />
                    <span>{char.characterName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accessoires */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" />
              Accessoires nécessaires
            </div>
            {loadingProps ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Chargement...
              </div>
            ) : seqProps.length === 0 ? (
              <div className="text-xs text-gray-400 italic">Aucun accessoire associé</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {seqProps.map((prop: any) => (
                  <span
                    key={prop.propId}
                    className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-full border border-amber-200"
                  >
                    {prop.propName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Storyboard Tab ───────────────────────────────────────────────────────────
function StoryboardTab({ scenarioId }: { scenarioId: number }) {
  const { data, isLoading, refetch } = trpc.breakdown.getSynopsis.useQuery({ scenarioId });

  if (isLoading) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <div className="text-gray-500 text-sm">Chargement du synopsis...</div>
      </Card>
    );
  }

  if (data?.generating) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <div className="text-gray-700 font-medium">Génération du synopsis en cours...</div>
        <div className="text-gray-500 text-sm text-center max-w-sm">
          L'IA analyse le scénario et rédige un synopsis complet. Cela peut prendre quelques secondes.
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Actualiser
        </Button>
      </Card>
    );
  }

  if (!data?.synopsis) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <BookOpen className="w-10 h-10 text-gray-300" />
        <div className="text-gray-500 text-sm text-center max-w-sm">
          Aucun synopsis disponible. Le synopsis sera généré automatiquement lors du prochain chargement.
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Générer le synopsis
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Synopsis complet
        </h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs text-gray-500">
          Régénérer
        </Button>
      </div>
      <Card className="p-6">
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
          {data.synopsis}
        </div>
      </Card>
    </div>
  );
}

// ─── Technical Breakdown Tab ──────────────────────────────────────────────────
function TechnicalBreakdownTab({ scenarioId }: { scenarioId: number }) {
  const [breakdown, setBreakdown] = useState<any>(null);

  const generateMutation = trpc.breakdown.generateTechnicalBreakdown.useMutation({
    onSuccess: (data) => {
      setBreakdown(data.data);
    },
  });

  if (!breakdown) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <Layers className="w-12 h-12 text-gray-300" />
          <div>
            <h3 className="font-semibold text-gray-700 mb-1">Proposition de découpage technique</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Générez une analyse professionnelle scène par scène avec estimation des jours de tournage,
              complexité, plans et notes de production.
            </p>
          </div>
          <Button
            onClick={() => generateMutation.mutate({ scenarioId })}
            disabled={generateMutation.isPending}
            className="mt-2 gap-2"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours (30-60s)...</>
            ) : (
              <><Layers className="w-4 h-4" /> Générer le découpage technique</>
            )}
          </Button>
          {generateMutation.isError && (
            <p className="text-sm text-red-500">{generateMutation.error?.message}</p>
          )}
        </div>
      </Card>
    );
  }

  const summary = breakdown.summary || {};
  const scenes: any[] = breakdown.scenes || [];
  const shootingDays: any[] = breakdown.shootingDays || [];
  const notes = breakdown.productionNotes || {};

  return (
    <div className="space-y-6">
      {/* Bouton régénérer */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setBreakdown(null)} className="gap-2">
          <Layers className="w-4 h-4" /> Régénérer
        </Button>
      </div>

      {/* Résumé chiffres clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{summary.totalShootingDays ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Jours de tournage</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{summary.averagePagesPerDay ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Pages / jour</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">{summary.heavyDays ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Journées lourdes</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-gray-500">{summary.lightDays ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Journées légères</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xl font-bold">{summary.intScenes ?? "—"} INT / {summary.extScenes ?? "—"} EXT</div>
          <div className="text-xs text-gray-500 mt-1">Intérieur / Extérieur</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xl font-bold">{summary.dayScenes ?? "—"} JOUR / {summary.nightScenes ?? "—"} NUIT</div>
          <div className="text-xs text-gray-500 mt-1">Jour / Nuit</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{summary.complexScenes ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Scènes complexes</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{summary.simpleScenes ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Scènes simples</div>
        </Card>
      </div>

      {/* Plan de tournage par jour */}
      {shootingDays.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Plan de tournage
          </h3>
          <div className="space-y-3">
            {shootingDays.map((day: any) => (
              <div
                key={day.dayNumber}
                className={`rounded-lg p-4 border-l-4 ${
                  day.type === "lourde"
                    ? "border-red-400 bg-red-50"
                    : day.type === "standard"
                    ? "border-blue-400 bg-blue-50"
                    : "border-green-400 bg-green-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">
                    Jour {day.dayNumber} — {day.location}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        day.type === "lourde"
                          ? "destructive"
                          : day.type === "standard"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {day.type}
                    </Badge>
                    <span className="text-xs text-gray-500">{day.estimatedPages} pages</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Scènes : {Array.isArray(day.scenes) ? day.scenes.join(", ") : day.scenes}
                </div>
                {day.notes && (
                  <div className="text-xs text-gray-500 mt-1 italic">{day.notes}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Analyse scène par scène */}
      {scenes.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-500" /> Analyse scène par scène
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Lieu</th>
                  <th className="pb-2 pr-3">INT/EXT</th>
                  <th className="pb-2 pr-3">J/N</th>
                  <th className="pb-2 pr-3">Complexité</th>
                  <th className="pb-2 pr-3">Plans</th>
                  <th className="pb-2 pr-3">Heures</th>
                  <th className="pb-2">Tags</th>
                </tr>
              </thead>
              <tbody>
                {scenes.map((scene: any) => (
                  <tr key={scene.sceneNumber} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-3 font-mono font-bold text-xs">{scene.sceneNumber}</td>
                    <td className="py-2 pr-3 max-w-[140px] truncate text-xs">{scene.location}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className="text-xs">{scene.intExt}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {scene.dayNight === "NUIT" ? (
                        <Moon className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <Sun className="w-4 h-4 text-yellow-500" />
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge
                        className={`text-xs ${
                          scene.complexity === "lourde"
                            ? "bg-red-100 text-red-700 hover:bg-red-100"
                            : scene.complexity === "moyenne"
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
                            : "bg-green-100 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {scene.complexity}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-center text-xs">{scene.estimatedPlans}</td>
                    <td className="py-2 pr-3 text-center text-xs">{scene.estimatedHours}h</td>
                    <td className="py-2">
                      <div className="flex gap-1 flex-wrap">
                        {scene.hasDialogue && (
                          <Badge variant="outline" className="text-xs">Dial.</Badge>
                        )}
                        {scene.hasAction && (
                          <Badge variant="outline" className="text-xs">Action</Badge>
                        )}
                        {scene.hasFX && (
                          <Badge variant="outline" className="text-xs text-purple-600">FX</Badge>
                        )}
                        {scene.hasCascade && (
                          <Badge variant="outline" className="text-xs text-red-600">Cascade</Badge>
                        )}
                        {scene.hasFiguration && (
                          <Badge variant="outline" className="text-xs text-blue-600">Figur.</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scenes.some((s: any) => s.notes) && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Notes de scènes</h4>
              {scenes.filter((s: any) => s.notes).map((scene: any) => (
                <div key={scene.sceneNumber} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                  <span className="font-mono font-bold">Scène {scene.sceneNumber}</span> — {scene.notes}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Notes de production */}
      {(notes.feasibility || notes.mainRisks?.length || notes.optimizations?.length) && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" /> Analyse de production
          </h3>
          <div className="space-y-4">
            {notes.feasibility && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1 text-sm">Faisabilité</h4>
                <p className="text-sm text-gray-600">{notes.feasibility}</p>
              </div>
            )}
            {notes.mainRisks?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Risques principaux</h4>
                <ul className="space-y-1">
                  {notes.mainRisks.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {notes.optimizations?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Optimisations possibles</h4>
                <ul className="space-y-1">
                  {notes.optimizations.map((o: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {notes.specialRequirements?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Besoins spéciaux</h4>
                <ul className="space-y-1">
                  {notes.specialRequirements.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
    await createSequenceMutation.mutateAsync({ scenarioId, name: newSequenceName });
    setNewSequenceName("");
    utils.breakdown.getSequences.invalidate({ scenarioId });
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="storyboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="storyboard" className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Storyboard</span>
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-1.5">
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Séquences</span>
            {sequences.length > 0 && <Badge variant="secondary" className="text-xs ml-1 bg-blue-100 text-blue-700 border-blue-200">{sequences.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="characters" className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Personnages</span>
            {characters.length > 0 && <Badge variant="secondary" className="text-xs ml-1 bg-blue-100 text-blue-700 border-blue-200">{characters.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Lieux</span>
            {locations.length > 0 && <Badge variant="secondary" className="text-xs ml-1 bg-blue-100 text-blue-700 border-blue-200">{locations.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="props" className="flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Accessoires</span>
            {props.length > 0 && <Badge variant="secondary" className="text-xs ml-1 bg-blue-100 text-blue-700 border-blue-200">{props.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Découpage</span>
          </TabsTrigger>
        </TabsList>

        {/* STORYBOARD */}
        <TabsContent value="storyboard">
          <StoryboardTab scenarioId={scenarioId} />
        </TabsContent>

        {/* Search bar (shared for Séquences, Personnages, Lieux, Accessoires) */}
        <TabsContent value="sequences">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Total : <span className="text-blue-600">{sequences.length}</span> séquence{sequences.length !== 1 ? 's' : ''}</h3>
          </div>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher une séquence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nom de la nouvelle séquence..."
              value={newSequenceName}
              onChange={(e) => setNewSequenceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSequence()}
            />
            <Button onClick={handleCreateSequence} size="sm" className="gap-1 shrink-0">
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>
          {filteredSequences.length === 0 ? (
            <Card className="p-8 text-center text-gray-400 text-sm">
              Aucune séquence trouvée
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSequences.map((seq, index) => (
                <SequenceDetailCard key={seq.id} seq={seq} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* PERSONNAGES */}
        <TabsContent value="characters">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Total : <span className="text-blue-600">{characters.length}</span> personnage{characters.length !== 1 ? 's' : ''}</h3>
            <Button
              onClick={() => downloadPDF(characters, 'personnages', ['name', 'gender', 'age', 'sceneCount'])}
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
                    <div className="flex items-center gap-3">
                      <CharacterIcon gender={char.gender} age={char.age} />
                      <div>
                        <div className="font-semibold text-sm">{char.name}</div>
                        {char.description && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {char.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {char.sceneCount !== undefined && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {char.sceneCount} scène{char.sceneCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedCharacterId === char.id && characterSequences.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Séquences :</div>
                      <div className="flex flex-wrap gap-1">
                        {characterSequences.map((seq: any) => (
                          <span
                            key={seq.sequenceId}
                            className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded"
                          >
                            {seq.sequenceName}
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
            <h3 className="text-sm font-semibold text-gray-700">Total : <span className="text-blue-600">{locations.length}</span> lieu{locations.length !== 1 ? 'x' : ''}</h3>
            <Button
              onClick={() => downloadPDF(locations, 'lieux', ['name', 'type', 'sceneCount'])}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredLocations.map((loc: any) => (
                <Card key={loc.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-sm">{loc.name}</div>
                      {loc.type && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded mt-1 inline-block">
                          {loc.type}
                        </span>
                      )}
                      {loc.sceneCount !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          {loc.sceneCount} scène{loc.sceneCount !== 1 ? "s" : ""}
                        </div>
                      )}
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
              onClick={() => downloadPDF(props, 'accessoires', ['name', 'description', 'sceneCount'])}
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
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">{prop.name}</div>
                        {prop.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{prop.description}</div>
                        )}
                      </div>
                    </div>
                    {prop.sceneCount !== undefined && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded shrink-0">
                        {prop.sceneCount} scène{prop.sceneCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {selectedPropId === prop.id && (
                    <div className="mt-3 pt-3 border-t">
                      {loadingPropSequences ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" /> Chargement...
                        </div>
                      ) : propSequences.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">Aucune séquence associée</div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2">Séquences :</div>
                          <div className="flex flex-wrap gap-1">
                            {propSequences.map((seq: any) => (
                              <span
                                key={seq.sequenceId}
                                className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded"
                              >
                                {seq.sequenceName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DÉCOUPAGE TECHNIQUE */}
        <TabsContent value="breakdown" className="space-y-4">
          <TechnicalBreakdownTab scenarioId={scenarioId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
