/**
 * Utilitaires pour la gestion commerciale
 * Calculs TVA, statuts, validations France
 */

// Taux TVA français standards
export const VAT_RATES = {
  STANDARD: 20,
  REDUCED: 10,
  SUPER_REDUCED: 5.5,
  MINIMAL: 2.1,
  ZERO: 0,
} as const;

/**
 * Calcule le montant TTC à partir du montant HT et du taux TVA
 */
export function calculateTTC(priceHT: number, vatRate: number): number {
  return Math.round(priceHT * (1 + vatRate / 100));
}

/**
 * Calcule le montant de TVA
 */
export function calculateVAT(priceHT: number, vatRate: number): number {
  return Math.round(priceHT * (vatRate / 100));
}

/**
 * Calcule les totaux pour une liste de lignes
 */
export function calculateTotals(
  lines: Array<{
    quantity: number;
    unitPriceHT: number;
    vatRate: number;
  }>
) {
  let totalHT = 0;
  let totalVAT = 0;

  for (const line of lines) {
    const lineTotal = line.quantity * line.unitPriceHT;
    const lineVAT = calculateVAT(lineTotal, line.vatRate);
    totalHT += lineTotal;
    totalVAT += lineVAT;
  }

  const totalTTC = totalHT + totalVAT;

  return {
    totalHT,
    totalVAT,
    totalTTC,
  };
}

/**
 * Valide un SIRET français (14 chiffres)
 */
export function isValidSIRET(siret: string): boolean {
  if (!siret || !/^\d{14}$/.test(siret)) {
    return false;
  }

  // Luhn algorithm for SIRET validation
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(siret[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Valide un numéro de TVA intracommunautaire français
 * Format: FR + 2 chiffres de clé + 9 chiffres SIRET
 */
export function isValidVATNumber(vatNumber: string): boolean {
  if (!vatNumber || !/^FR\d{11}$/.test(vatNumber)) {
    return false;
  }
  return true;
}

/**
 * Statuts possibles pour les devis
 */
export const QUOTE_STATUSES = {
  DRAFT: "brouillon",
  SENT: "envoyé",
  ACCEPTED: "accepté",
  REFUSED: "refusé",
} as const;

/**
 * Statuts possibles pour les factures
 */
export const INVOICE_STATUSES = {
  DRAFT: "brouillon",
  SENT: "envoyée",
  PAID: "payée",
  OVERDUE: "en retard",
} as const;

/**
 * Calcule les pénalités de retard légales (France)
 * Taux légal: 8% par an + 40€ forfaitaires
 */
export function calculateLatePaymentPenalties(
  invoiceTotal: number,
  daysOverdue: number
): {
  legalRate: number;
  flatFee: number;
  total: number;
} {
  const DAILY_RATE = 0.08 / 365; // 8% annuel
  const FLAT_FEE = 4000; // 40€ en centimes

  const legalRate = Math.round(invoiceTotal * DAILY_RATE * daysOverdue);
  const total = legalRate + FLAT_FEE;

  return {
    legalRate,
    flatFee: FLAT_FEE,
    total,
  };
}

/**
 * Génère les mentions légales obligatoires pour une facture (France)
 */
export function generateLegalMentions(companyInfo: {
  name: string;
  siret?: string;
  vatNumber?: string;
  address?: string;
}): string {
  const mentions: string[] = [];

  mentions.push(`Entreprise: ${companyInfo.name}`);

  if (companyInfo.siret) {
    mentions.push(`SIRET: ${companyInfo.siret}`);
  }

  if (companyInfo.vatNumber) {
    mentions.push(`N° TVA intracommunautaire: ${companyInfo.vatNumber}`);
  }

  if (companyInfo.address) {
    mentions.push(`Adresse: ${companyInfo.address}`);
  }

  mentions.push("Conditions de paiement: 30 jours net");
  mentions.push("Pénalités de retard: 8% par an + 40€ forfaitaires");
  mentions.push("Escompte pour paiement comptant: non applicable");

  return mentions.join("\n");
}

/**
 * Formate un montant en euros (centimes)
 */
export function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)}€`;
}

/**
 * Formate une date au format français
 */
export function formatDateFR(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
