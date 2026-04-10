import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, MapPin, Package, Film, Search, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CharacterIcon } from "@/components/CharacterIcon";

interface BreakdownTabsProps {
  scenarioId: number;
  onSceneSelect?: (sceneNumber: number) => void;
}

export function BreakdownTabs({ scenarioId, onSceneSelect }: BreakdownTabsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [newSequenceName, setNewSequenceName] = useState("");

  // Fetch data
  const { data: characters = [] } = trpc.breakdown.getCharacters.useQuery({ scenarioId });
  const { data: locations = [] } = trpc.breakdown.getLocations.useQuery({ scenarioId });
  const { data: props = [] } = trpc.breakdown.getProps.useQuery({ scenarioId });
  const { data: sequences = [] } = trpc.breakdown.getSequences.useQuery({ scenarioId });
  const createSequenceMutation = trpc.breakdown.createSequence.useMutation();

  // Filter data based on search
  const filteredCharacters = characters.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredProps = props.filter((p) =>
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
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="props" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="props" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Accessoires</span>
          </TabsTrigger>
          <TabsTrigger value="characters" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Personnages</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Lieux</span>
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline">Séquences</span>
          </TabsTrigger>
        </TabsList>

        {/* Search bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* ACCESSOIRES */}
        <TabsContent value="props" className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {filteredProps.length} accessoire{filteredProps.length !== 1 ? "s" : ""}
          </div>
          {filteredProps.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              Aucun accessoire trouvé
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredProps.map((prop) => (
                <Card key={prop.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{prop.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Accessoire
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PERSONNAGES */}
        <TabsContent value="characters" className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {filteredCharacters.length} personnage{filteredCharacters.length !== 1 ? "s" : ""}
          </div>
          {filteredCharacters.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              Aucun personnage trouvé
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredCharacters.map((char) => (
                <Card
                  key={char.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSceneSelect?.(char.id)}
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
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LIEUX */}
        <TabsContent value="locations" className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {filteredLocations.length} lieu{filteredLocations.length !== 1 ? "x" : ""}
          </div>
          {filteredLocations.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              Aucun lieu trouvé
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredLocations.map((loc) => (
                <Card
                  key={loc.name}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSceneSelect?.(0)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{loc.name}</div>
                        <div className="text-xs text-gray-500">
                          {loc.sceneCount} séquence{loc.sceneCount !== 1 ? "s" : ""}
                          {loc.dayNightOptions.length > 0 && ` • ${loc.dayNightOptions.join(", ")}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SÉQUENCES */}
        <TabsContent value="sequences" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Nouvelle séquence..."
              value={newSequenceName}
              onChange={(e) => setNewSequenceName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleCreateSequence();
              }}
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
            <Card className="p-8 text-center text-gray-500">
              Aucune séquence créée
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredSequences.map((seq) => (
                <Card
                  key={seq.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Film className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-medium">{seq.name}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
