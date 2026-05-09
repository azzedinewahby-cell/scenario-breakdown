/**
 * Service de recherche entreprises via l'API recherche-entreprises.api.gouv.fr
 * API publique, pas d'authentification requise
 */

export interface SiretSearchResult {
  siret: string;
  siren: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  vatNumber?: string;
  status: "actif" | "inactif";
  creationDate?: string;
  sector?: string;
  employees?: string;
}

const BASE_URL = "https://recherche-entreprises.api.gouv.fr";

function mapResult(r: any): SiretSearchResult {
  const siege = r.siege ?? {};
  const adresse = [
    siege.numero_voie, siege.type_voie, siege.libelle_voie
  ].filter(Boolean).join(" ").trim() || siege.adresse || "";
  const full = [adresse, siege.code_postal, siege.libelle_commune].filter(Boolean).join(", ");
  return {
    siret:        siege.siret || r.siret || "",
    siren:        r.siren || "",
    name:         r.nom_complet || r.nom_raison_sociale || r.denomination || "",
    address:      full,
    postalCode:   siege.code_postal || "",
    city:         siege.libelle_commune || "",
    vatNumber:    r.numero_tva_intra || "",
    status:       (r.etat_administratif === "A" || siege.etat_administratif === "A") ? "actif" : "inactif",
    creationDate: r.date_creation || "",
    sector:       r.activite_principale || siege.activite_principale || "",
    employees:    r.tranche_effectif_salarie || "",
  };
}

export async function searchByQuery(query: string): Promise<SiretSearchResult[]> {
  const q = query.replace(/\s/g, "").match(/^\d{9,14}$/) ? query.replace(/\s/g, "") : query;
  const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}&page=1&per_page=5&mtm_campaign=maprod`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map(mapResult);
}

export async function searchBySiret(siret: string): Promise<SiretSearchResult | null> {
  const results = await searchByQuery(siret);
  return results.find(r => r.siret === siret.replace(/\s/g, "")) ?? results[0] ?? null;
}

export async function searchBySiren(siren: string): Promise<SiretSearchResult | null> {
  const results = await searchByQuery(siren);
  return results.find(r => r.siren === siren.replace(/\s/g, "")) ?? results[0] ?? null;
}

export function formatAddress(result: SiretSearchResult): string {
  return result.address;
}

export function isValidSiretFormat(siret: string): boolean {
  return /^\d{14}$/.test(siret.replace(/\s/g, ""));
}

export function isValidSirenFormat(siren: string): boolean {
  return /^\d{9}$/.test(siren.replace(/\s/g, ""));
}
