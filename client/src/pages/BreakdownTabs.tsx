import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, MapPin, Package, Film, Search, Plus, BookOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CharacterIcon } from "@/components/CharacterIcon";

interface BreakdownTabsProps {
  scenarioId: number;
  onSceneSelect?: (sceneNumber: number) => void;
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
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="storyboard" className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Storyboard</span>
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-1.5">
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Séquences</span>
          </TabsTrigger>
          <TabsTrigger value="characters" className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Personnages</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Lieux</span>
          </TabsTrigger>
          <TabsTrigger value="props" className="flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Accessoires</span>
          </TabsTrigger>
        </TabsList>

        {/* STORYBOARD */}
        <TabsContent value="storyboard">
          <StoryboardTab scenarioId={scenarioId} />
        </TabsContent>

        {/* Search bar (shared for Séquences, Personnages, Lieux, Accessoires) */}
        <TabsContent value="sequences">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher une séquence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Nouvelle séquence..."
              value={newSequenceName}
              onChange={(e) => setNewSequenceName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button
              onClick={handleCreateSequence}
              disabled={!newSequenceName.trim() || createSequenceMutation.isPending}
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {filteredSequences.length} séquence{filteredSequences.length !== 1 ? "s" : ""}
          </div>
          {filteredSequences.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">Aucune séquence trouvée</Card>
          ) : (
            <div className="grid gap-3">
              {filteredSequences.map((seq, index) => (
                <SequenceDetailCard key={seq.id} seq={seq} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* PERSONNAGES */}
        <TabsContent value="characters" className="space-y-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un personnage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {filteredCharacters.length} personnage{filteredCharacters.length !== 1 ? "s" : ""}
          </div>
          {filteredCharacters.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">Aucun personnage trouvé</Card>
          ) : (
            <div className="grid gap-3">
              {filteredCharacters.map((char) => (
                <Card
                  key={char.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCharacterId(selectedCharacterId === char.id ? null : char.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CharacterIcon gender={char.gender} age={char.age} />
                      <div>
                        <div className="font-medium">{char.name}</div>
                        <div className="text-xs text-gray-500">
                          {char.sceneCount} séquence{char.sceneCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    {selectedCharacterId === char.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  {selectedCharacterId === char.id && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-600 font-semibold mb-2">Apparaît dans:</div>
                      {characterSequences.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">Aucune séquence associée</div>
                      ) : (
                        <div className="space-y-1">
                          {characterSequences.map((seq: any) => (
                            <div key={seq.sequenceId} className="text-xs bg-gray-100 p-2 rounded">
                              <div className="font-medium">#{seq.orderIndex + 1} — {seq.sequenceName}</div>
                              {seq.sequenceSummary && (
                                <div className="text-gray-600 mt-1">{seq.sequenceSummary}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LIEUX */}
        <TabsContent value="locations" className="space-y-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un lieu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {filteredLocations.length} lieu{filteredLocations.length !== 1 ? "x" : ""}
          </div>
          {filteredLocations.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">Aucun lieu trouvé</Card>
          ) : (
            <div className="grid gap-3">
              {filteredLocations.map((location, idx) => (
                <Card key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{location.name}</div>
                      <div className="text-xs text-gray-500">
                        {location.sceneCount} scène{location.sceneCount !== 1 ? "s" : ""}
                        {location.dayNightOptions && location.dayNightOptions.length > 0 && (
                          <span className="ml-2">
                            {location.dayNightOptions.map((d: string) => (
                              <span key={d} className="bg-gray-100 px-1 rounded mr-1">{d}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Lieu
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACCESSOIRES */}
        <TabsContent value="props" className="space-y-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un accessoire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {filteredProps.length} accessoire{filteredProps.length !== 1 ? "s" : ""}
          </div>
          {filteredProps.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">Aucun accessoire trouvé</Card>
          ) : (
            <div className="grid gap-3">
              {filteredProps.map((prop: any) => (
                <Card
                  key={prop.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedPropId(selectedPropId === prop.id ? null : prop.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{prop.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Accessoire
                      </span>
                      {selectedPropId === prop.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {selectedPropId === prop.id && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-600 font-semibold mb-2">Utilisé dans:</div>
                      {loadingPropSequences ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Chargement des séquences...
                        </div>
                      ) : propSequences.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">Aucune séquence associée</div>
                      ) : (
                        <div className="space-y-1">
                          {propSequences.map((seq: any) => (
                            <div key={seq.sequenceId} className="text-xs bg-gray-100 p-2 rounded">
                              <div className="font-medium">#{seq.orderIndex + 1} — {seq.sequenceName}</div>
                              {seq.sequenceSummary && (
                                <div className="text-gray-600 mt-1">{seq.sequenceSummary}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
