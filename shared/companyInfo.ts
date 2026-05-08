// Informations entreprise figées (non modifiables)
// Émetteur des factures : LES CRE'ARTEURS (dénomination légale)
// Nom commercial visible : LA KABINE PRODUCTION

export const COMPANY_INFO = {
  // Identité
  companyName: "LES CRE'ARTEURS",
  tradeName: "LA KABINE PRODUCTION",

  // Coordonnées légales
  siret: "53534086300021",
  vatNumber: "",

  // Adresse
  address: "72 avenue Henri Ginoux\n92120 MONTROUGE\nFrance",
  phone: "",
  email: "",
  website: "lakabine.pro",

  // Bancaire (CIC Montrouge)
  bankDetails: "Titulaire : LES CRE'ARTEURS\nBanque : CIC MONTROUGE\nIBAN : FR76 3006 6107 3100 0201 1710 183\nBIC : CMCIFRPP",

  // Mentions légales
  legalMentions: "Association déclarée loi 1901 — SIREN 535 340 863 — Code NAF/APE 90.01Z (Arts du spectacle vivant) — Inscrite à l'INSEE le 09/03/2011 — Convention collective IDCC 3090 — Membre de l'Économie Sociale et Solidaire (ESS).",

  // Conditions de paiement
  paymentTerms: "30 jours fin de mois",
  paymentConditions: "En cas de retard de paiement, application d'un intérêt de retard au taux légal en vigueur (article L.441-10 du Code de commerce) ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (article D.441-5).",

  // Numérotation
  defaultVatRate: 20,
  invoicePrefix: "FA",
  quotePrefix: "DV",
  creditPrefix: "AV",

  // Logo (à compléter plus tard)
  logoUrl: "",
  signature: "",
};

export type CompanyInfo = typeof COMPANY_INFO;
