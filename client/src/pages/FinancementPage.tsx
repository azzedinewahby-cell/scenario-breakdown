import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import FinancementSearch from "./FinancementSearch";
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  ChevronRight,
  Euro,
  Building2,
  MapPin,
  Star,
  Plus,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "ecriture" | "developpement" | "production" | "post-production" | "distribution";
type AideType = "subvention" | "avance" | "credit-impot" | "investissement";
type AideStatut = "a-etudier" | "en-cours" | "selectionnee" | "obtenue" | "refusee";

interface Aide {
  id: string;
  nom: string;
  organisme: string;
  type: AideType;
  phase: Phase;
  montantMax: number;
  montantEstime?: number;
  echeance?: string;
  score: number;
  statut: AideStatut;
  description: string;
  conditions: string[];
  documents: { nom: string; fourni: boolean }[];
  region?: string;
  url?: string;
}

// ─── Données des aides cinéma françaises ─────────────────────────────────────

const AIDES_CINEMA: Aide[] = [
  {
    id: "cnc-aide-selective",
    nom: "Aide sélective à la production",
    organisme: "CNC",
    type: "avance",
    phase: "production",
    montantMax: 300000,
    montantEstime: 250000,
    echeance: "2026-06-30",
    score: 97,
    statut: "a-etudier",
    description: "Avance sur recettes accordée par le CNC pour la production de longs métrages de fiction, documentaires et films d'animation.",
    conditions: [
      "Producteur délégué établi en France",
      "Film destiné à une exploitation en salles",
      "Scénario original ou adaptation",
      "Budget minimum 1M€",
    ],
    documents: [
      { nom: "Scénario", fourni: false },
      { nom: "Note d'intention", fourni: false },
      { nom: "Devis de production", fourni: false },
      { nom: "Plan de financement", fourni: false },
      { nom: "Dossier artistique", fourni: false },
    ],
    url: "https://www.cnc.fr",
  },
  {
    id: "cnc-aide-automatique",
    nom: "Aide automatique à la production",
    organisme: "CNC",
    type: "avance",
    phase: "production",
    montantMax: 150000,
    montantEstime: 80000,
    echeance: "2026-09-15",
    score: 92,
    statut: "a-etudier",
    description: "Aide calculée automatiquement en fonction des recettes des films précédents du producteur.",
    conditions: [
      "Producteur ayant déjà produit un film en salles",
      "Compte de soutien actif au CNC",
      "Film de long métrage",
    ],
    documents: [
      { nom: "Relevé de compte de soutien", fourni: false },
      { nom: "Attestation d'exploitation", fourni: false },
    ],
    url: "https://www.cnc.fr",
  },
  {
    id: "idf-aide-production",
    nom: "Aide à la production de longs métrages",
    organisme: "Région Île-de-France",
    type: "subvention",
    phase: "production",
    montantMax: 200000,
    montantEstime: 150000,
    echeance: "2026-05-15",
    score: 89,
    statut: "a-etudier",
    description: "Soutien à la production de films tournés en Île-de-France ou portés par des sociétés franciliennes.",
    conditions: [
      "Tournage d'au moins 50% en Île-de-France",
      "Ou société de production basée en IDF",
      "Long métrage cinéma",
      "Budget minimum 500k€",
    ],
    documents: [
      { nom: "Scénario", fourni: false },
      { nom: "Devis détaillé", fourni: false },
      { nom: "Attestation de domiciliation", fourni: false },
    ],
    region: "Île-de-France",
    url: "https://www.iledefrance.fr",
  },
  {
    id: "credit-impot-cinema",
    nom: "Crédit d'impôt cinéma",
    organisme: "Direction Générale des Finances Publiques",
    type: "credit-impot",
    phase: "production",
    montantMax: 500000,
    montantEstime: 300000,
    echeance: undefined,
    score: 95,
    statut: "a-etudier",
    description: "Crédit d'impôt de 30% des dépenses éligibles engagées en France pour la production de films.",
    conditions: [
      "Film agréé par le CNC",
      "Dépenses françaises minimum 1M€",
      "Tournage en France",
      "Société soumise à l'IS",
    ],
    documents: [
      { nom: "Agrément CNC", fourni: false },
      { nom: "Attestation comptable", fourni: false },
    ],
    url: "https://www.impots.gouv.fr",
  },
  {
    id: "occitanie-audiovisuel",
    nom: "Aide à la création audiovisuelle",
    organisme: "Région Occitanie",
    type: "subvention",
    phase: "production",
    montantMax: 100000,
    montantEstime: 60000,
    echeance: "2026-04-30",
    score: 78,
    statut: "a-etudier",
    description: "Soutien aux projets audiovisuels et cinématographiques ancrés dans la région Occitanie.",
    conditions: [
      "Tournage en Occitanie",
      "Ou thématique régionale",
      "Société partenaire en Occitanie",
    ],
    documents: [
      { nom: "Scénario", fourni: false },
      { nom: "Note de production", fourni: false },
    ],
    region: "Occitanie",
    url: "https://www.laregion.fr",
  },
  {
    id: "normandie-images",
    nom: "Aide à la production",
    organisme: "Normandie Images",
    type: "subvention",
    phase: "production",
    montantMax: 80000,
    montantEstime: 50000,
    echeance: "2026-07-01",
    score: 72,
    statut: "a-etudier",
    description: "Fonds régional de soutien à la production cinématographique et audiovisuelle en Normandie.",
    conditions: [
      "Tournage en Normandie",
      "Ou société de production normande",
    ],
    documents: [
      { nom: "Dossier de production", fourni: false },
    ],
    region: "Normandie",
    url: "https://www.normandieimages.fr",
  },
  {
    id: "grand-est-cinema",
    nom: "Fonds de soutien audiovisuel",
    organisme: "Région Grand Est",
    type: "subvention",
    phase: "production",
    montantMax: 120000,
    montantEstime: 70000,
    echeance: "2026-06-15",
    score: 68,
    statut: "a-etudier",
    description: "Aide régionale pour les projets cinématographiques tournés ou produits en Grand Est.",
    conditions: [
      "Ancrage territorial Grand Est",
      "Dépenses locales minimum 30%",
    ],
    documents: [
      { nom: "Scénario", fourni: false },
      { nom: "Devis", fourni: false },
    ],
    region: "Grand Est",
    url: "https://www.grandest.fr",
  },
  {
    id: "cnc-ecriture",
    nom: "Aide à l'écriture et au développement",
    organisme: "CNC",
    type: "avance",
    phase: "ecriture",
    montantMax: 50000,
    montantEstime: 30000,
    echeance: "2026-03-31",
    score: 85,
    statut: "a-etudier",
    description: "Soutien à l'écriture de scénarios originaux et à l'adaptation d'œuvres littéraires.",
    conditions: [
      "Auteur ou société de production",
      "Projet de long métrage",
      "Scénario en développement",
    ],
    documents: [
      { nom: "Traitement ou synopsis", fourni: false },
      { nom: "Note d'intention", fourni: false },
    ],
    url: "https://www.cnc.fr",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMontant(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M€`;
  if (n >= 1000) return `${Math.round(n / 1000)}k€`;
  return `${n}€`;
}

function joursRestants(echeance?: string): number | null {
  if (!echeance) return null;
  const diff = new Date(echeance).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const PHASE_LABELS: Record<Phase, string> = {
  ecriture: "Écriture",
  developpement: "Développement",
  production: "Production",
  "post-production": "Post-production",
  distribution: "Distribution",
};

const TYPE_LABELS: Record<AideType, string> = {
  subvention: "Subvention",
  avance: "Avance sur recettes",
  "credit-impot": "Crédit d'impôt",
  investissement: "Investissement",
};

const STATUT_CONFIG: Record<AideStatut, { label: string; color: string }> = {
  "a-etudier": { label: "À étudier", color: "bg-gray-100 text-gray-700" },
  "en-cours": { label: "En cours", color: "bg-blue-100 text-blue-700" },
  selectionnee: { label: "Sélectionnée", color: "bg-green-100 text-green-700" },
  obtenue: { label: "Obtenue", color: "bg-emerald-100 text-emerald-700" },
  refusee: { label: "Refusée", color: "bg-red-100 text-red-700" },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function FinancementPage() {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<Phase | "toutes">("toutes");
  const [aides, setAides] = useState<Aide[]>(AIDES_CINEMA);
  const [selectedAide, setSelectedAide] = useState<Aide | null>(null);

  // Budget total fictif pour la démo (à connecter au module Budget plus tard)
  const budgetTotal = 1_200_000;
  const montantObtenu = 0;
  const montantEnCours = aides
    .filter((a) => a.statut === "en-cours" || a.statut === "selectionnee")
    .reduce((s, a) => s + (a.montantEstime || 0), 0);
  const resteAFinancer = budgetTotal - montantObtenu - montantEnCours;
  const progression = Math.round(((montantObtenu + montantEnCours) / budgetTotal) * 100);

  const aidesFiltrees = aides.filter((a) => {
    const matchSearch =
      !search ||
      a.nom.toLowerCase().includes(search.toLowerCase()) ||
      a.organisme.toLowerCase().includes(search.toLowerCase());
    const matchPhase = phaseFilter === "toutes" || a.phase === phaseFilter;
    return matchSearch && matchPhase;
  });

  function updateStatut(id: string, statut: AideStatut) {
    setAides((prev) => prev.map((a) => (a.id === id ? { ...a, statut } : a)));
    if (selectedAide?.id === id) {
      setSelectedAide((prev) => prev ? { ...prev, statut } : prev);
    }
  }

  const phases: (Phase | "toutes")[] = ["toutes", "ecriture", "developpement", "production", "post-production", "distribution"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Financement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trouvez et gérez les aides financières pour votre projet cinéma
          </p>
        </div>

        {/* Tableau de bord budget */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Euro className="h-4 w-4 text-red-900" />
                <span className="text-sm font-medium text-muted-foreground">Budget du projet</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {formatMontant(budgetTotal)}
              </div>
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Obtenu</span>
                  <span className="text-emerald-600 font-medium">{formatMontant(montantObtenu)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">En cours</span>
                  <span className="text-blue-600 font-medium">{formatMontant(montantEnCours)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reste à financer</span>
                  <span className="text-red-600 font-medium">{formatMontant(resteAFinancer)}</span>
                </div>
              </div>
              <Progress value={progression} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{progression}% financé</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Aides identifiées</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{aides.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {aides.filter((a) => a.statut === "selectionnee" || a.statut === "en-cours").length} sélectionnées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-muted-foreground">Prochaine échéance</span>
              </div>
              {(() => {
                const prochaine = aides
                  .filter((a) => a.echeance && joursRestants(a.echeance)! > 0)
                  .sort((a, b) => new Date(a.echeance!).getTime() - new Date(b.echeance!).getTime())[0];
                const jours = prochaine ? joursRestants(prochaine.echeance) : null;
                return prochaine ? (
                  <>
                    <div className="text-2xl font-bold text-amber-600">{jours}j</div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{prochaine.organisme}</p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucune</div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Appels en cours — recherche automatique */}
        <FinancementSearch />

        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une aide, un organisme..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {phases.map((p) => (
              <button
                key={p}
                onClick={() => setPhaseFilter(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  phaseFilter === p
                    ? "bg-red-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p === "toutes" ? "Toutes" : PHASE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des aides */}
        <div className="space-y-3">
          {aidesFiltrees.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm">Aucune aide trouvée pour ces critères.</p>
              </CardContent>
            </Card>
          ) : (
            aidesFiltrees.map((aide) => {
              const jours = joursRestants(aide.echeance);
              const statutCfg = STATUT_CONFIG[aide.statut];
              return (
                <Card
                  key={aide.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedAide?.id === aide.id ? "ring-2 ring-red-900" : ""
                  }`}
                  onClick={() => setSelectedAide(selectedAide?.id === aide.id ? null : aide)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {PHASE_LABELS[aide.phase]}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-normal">
                            {TYPE_LABELS[aide.type]}
                          </Badge>
                          {aide.region && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {aide.region}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">{aide.organisme}</span>
                        </div>
                        <h3 className="font-medium text-foreground text-sm leading-tight">
                          {aide.nom}
                        </h3>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Score de matching */}
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold text-amber-600">{aide.score}%</span>
                        </div>
                        {/* Montant */}
                        <span className="text-sm font-semibold text-foreground">
                          {aide.montantEstime ? formatMontant(aide.montantEstime) : formatMontant(aide.montantMax)}
                        </span>
                        {/* Échéance */}
                        {jours !== null && (
                          <span className={`text-xs font-medium ${jours <= 30 ? "text-red-600" : jours <= 90 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {jours > 0 ? `${jours}j` : "Expirée"}
                          </span>
                        )}
                        {/* Statut */}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutCfg.color}`}>
                          {statutCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Détails expandables */}
                    {selectedAide?.id === aide.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <p className="text-sm text-muted-foreground">{aide.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Conditions */}
                          <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                              Conditions d'éligibilité
                            </h4>
                            <ul className="space-y-1">
                              {aide.conditions.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Documents */}
                          <div>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
                              Documents requis
                            </h4>
                            <ul className="space-y-1">
                              {aide.documents.map((d, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs">
                                  {d.fourni ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 text-gray-300" />
                                  )}
                                  <span className={d.fourni ? "text-foreground" : "text-muted-foreground"}>
                                    {d.nom}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Montant max */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Montant maximum : <span className="font-semibold text-foreground">{formatMontant(aide.montantMax)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {aide.statut === "a-etudier" && (
                            <Button
                              size="sm"
                              className="bg-red-900 hover:bg-red-800 text-white text-xs h-8"
                              onClick={(e) => { e.stopPropagation(); updateStatut(aide.id, "selectionnee"); }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Sélectionner
                            </Button>
                          )}
                          {aide.statut === "selectionnee" && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                              onClick={(e) => { e.stopPropagation(); updateStatut(aide.id, "en-cours"); }}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Gérer le dossier
                            </Button>
                          )}
                          {aide.statut === "en-cours" && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                              onClick={(e) => { e.stopPropagation(); updateStatut(aide.id, "obtenue"); }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Marquer comme obtenue
                            </Button>
                          )}
                          {(aide.statut === "selectionnee" || aide.statut === "en-cours") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8"
                              onClick={(e) => { e.stopPropagation(); updateStatut(aide.id, "a-etudier"); }}
                            >
                              Retirer
                            </Button>
                          )}
                          {aide.url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 ml-auto"
                              onClick={(e) => { e.stopPropagation(); window.open(aide.url, "_blank"); }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Site officiel
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Plan de financement récapitulatif */}
        {aides.some((a) => a.statut !== "a-etudier") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-900" />
                Plan de financement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {aides
                  .filter((a) => a.statut !== "a-etudier" && a.statut !== "refusee")
                  .map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          a.statut === "obtenue" ? "bg-emerald-500" :
                          a.statut === "en-cours" ? "bg-blue-500" : "bg-gray-400"
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{a.nom}</p>
                          <p className="text-xs text-muted-foreground">{a.organisme}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {formatMontant(a.montantEstime || a.montantMax)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_CONFIG[a.statut].color}`}>
                          {STATUT_CONFIG[a.statut].label}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
