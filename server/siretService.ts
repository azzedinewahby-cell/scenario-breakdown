/**
 * Service de recherche SIRET via l'API Sirene (INSEE)
 * API publique : https://api.insee.fr/catalogue/site/themes/sirene
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

/**
 * Valide le format d'un SIRET (14 chiffres)
 */
export function isValidSiretFormat(siret: string): boolean {
  return /^\d{14}$/.test(siret.replace(/\s/g, ""));
}

/**
 * Valide le format d'un SIREN (9 chiffres)
 */
export function isValidSirenFormat(siren: string): boolean {
  return /^\d{9}$/.test(siren.replace(/\s/g, ""));
}

/**
 * Recherche une entreprise par SIRET via l'API Sirene
 * Utilise l'API publique de l'INSEE (pas d'authentification requise)
 */
export async function searchBySiret(
  siret: string
): Promise<SiretSearchResult | null> {
  const cleanSiret = siret.replace(/\s/g, "");

  if (!isValidSiretFormat(cleanSiret)) {
    throw new Error("Format SIRET invalide (doit contenir 14 chiffres)");
  }

  try {
    // API Sirene publique
    const response = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3.11/siret/${cleanSiret}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.status === 404) {
      return null; // SIRET non trouvé
    }

    if (!response.ok) {
      throw new Error(`Erreur API INSEE: ${response.status}`);
    }

    const data = await response.json();

    // Transformation des données de l'API INSEE
    const etablissement = data.etablissement;
    const entreprise = data.entreprise;

    return {
      siret: cleanSiret,
      siren: etablissement?.siren || entreprise?.siren || "",
      name: etablissement?.enseigne || entreprise?.nom || "",
      address:
        `${etablissement?.numeroVoie || ""} ${etablissement?.typeVoie || ""} ${etablissement?.nomVoie || ""}`.trim(),
      postalCode: etablissement?.codePostal || "",
      city: etablissement?.libelleCommuneEtablissement || "",
      vatNumber: `FR${etablissement?.siren || ""}`.substring(0, 13), // Approximation
      status:
        etablissement?.etatAdministratifEtablissement === "A"
          ? "actif"
          : "inactif",
      creationDate: etablissement?.dateCreationEtablissement,
      sector: etablissement?.activitePrincipaleEtablissement,
      employees: etablissement?.trancheEffectifsEtablissement,
    };
  } catch (error) {
    console.error("Erreur lors de la recherche SIRET:", error);
    throw new Error(
      "Impossible de rechercher le SIRET. Veuillez vérifier votre connexion."
    );
  }
}

/**
 * Recherche une entreprise par SIREN via l'API Sirene
 */
export async function searchBySiren(
  siren: string
): Promise<SiretSearchResult | null> {
  const cleanSiren = siren.replace(/\s/g, "");

  if (!isValidSirenFormat(cleanSiren)) {
    throw new Error("Format SIREN invalide (doit contenir 9 chiffres)");
  }

  try {
    const response = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3.11/siren/${cleanSiren}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Erreur API INSEE: ${response.status}`);
    }

    const data = await response.json();
    const entreprise = data.entreprise;

    return {
      siret: "", // SIREN search doesn't return SIRET
      siren: cleanSiren,
      name: entreprise?.nom || "",
      address: "", // SIREN search doesn't return address
      postalCode: "",
      city: "",
      vatNumber: `FR${cleanSiren}`,
      status:
        entreprise?.etatAdministratifEntreprise === "A" ? "actif" : "inactif",
      creationDate: entreprise?.dateCreationEntreprise,
      sector: entreprise?.activitePrincipaleEntreprise,
      employees: entreprise?.trancheEffectifsEntreprise,
    };
  } catch (error) {
    console.error("Erreur lors de la recherche SIREN:", error);
    throw new Error(
      "Impossible de rechercher le SIREN. Veuillez vérifier votre connexion."
    );
  }
}

/**
 * Formate une adresse complète
 */
export function formatAddress(result: SiretSearchResult): string {
  const parts = [result.address, result.postalCode, result.city].filter(
    Boolean
  );
  return parts.join(", ");
}
