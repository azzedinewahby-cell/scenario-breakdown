import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsTab() {
  const [formData, setFormData] = useState({
    companyName: "",
    siret: "",
    vatNumber: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    legalMentions: "",
    paymentTerms: "30 jours net",
    paymentConditions: "",
    bankDetails: "",
    defaultVatRate: 20,
    invoicePrefix: "FA",
    quotePrefix: "DV",
    creditPrefix: "AV",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les paramètres existants
  const settingsQuery = trpc.commercial.settings.get.useQuery();

  useEffect(() => {
    if (settingsQuery.data) {
      setFormData((prev) => ({
        ...prev,
        ...settingsQuery.data,
      }));
    }
  }, [settingsQuery.data]);

  const updateMutation = trpc.commercial.settings.update.useMutation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "defaultVatRate" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateMutation.mutateAsync(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Paramètres</h2>
        <p className="text-slate-600 mt-1">
          Personnalisez vos informations d'entreprise et vos factures
        </p>
      </div>

      {success && (
        <Alert className="bg-green-50 border border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Paramètres sauvegardés avec succès !
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos Entreprise */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Informations Entreprise
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise *</Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Votre entreprise"
                required
              />
            </div>

            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                name="siret"
                value={formData.siret}
                onChange={handleChange}
                placeholder="14 chiffres"
              />
            </div>

            <div>
              <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
              <Input
                id="vatNumber"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                placeholder="FR12345678901"
              />
            </div>

            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 1 23 45 67 89"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@entreprise.fr"
              />
            </div>

            <div>
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://www.entreprise.fr"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Adresse complète"
              rows={3}
            />
          </div>
        </Card>

        {/* Mentions Légales et Conditions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Mentions Légales et Conditions
          </h3>

          <div>
            <Label htmlFor="legalMentions">Mentions légales</Label>
            <Textarea
              id="legalMentions"
              name="legalMentions"
              value={formData.legalMentions}
              onChange={handleChange}
              placeholder="Mentions légales à afficher sur les factures"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="paymentTerms">Délai de paiement</Label>
              <Input
                id="paymentTerms"
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleChange}
                placeholder="30 jours net"
              />
            </div>

            <div>
              <Label htmlFor="defaultVatRate">TVA par défaut (%)</Label>
              <Input
                id="defaultVatRate"
                name="defaultVatRate"
                type="number"
                value={formData.defaultVatRate}
                onChange={handleChange}
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="paymentConditions">Conditions de paiement</Label>
            <Textarea
              id="paymentConditions"
              name="paymentConditions"
              value={formData.paymentConditions}
              onChange={handleChange}
              placeholder="Conditions de paiement détaillées"
              rows={3}
            />
          </div>

          <div className="mt-4">
            <Label htmlFor="bankDetails">Coordonnées bancaires</Label>
            <Textarea
              id="bankDetails"
              name="bankDetails"
              value={formData.bankDetails}
              onChange={handleChange}
              placeholder="IBAN, BIC, etc."
              rows={3}
            />
          </div>
        </Card>

        {/* Numérotation */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Numérotation des Documents
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoicePrefix">Préfixe Factures</Label>
              <Input
                id="invoicePrefix"
                name="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={handleChange}
                placeholder="FA"
                maxLength="10"
              />
              <p className="text-xs text-slate-500 mt-1">Ex: FA-2026-001</p>
            </div>

            <div>
              <Label htmlFor="quotePrefix">Préfixe Devis</Label>
              <Input
                id="quotePrefix"
                name="quotePrefix"
                value={formData.quotePrefix}
                onChange={handleChange}
                placeholder="DV"
                maxLength="10"
              />
              <p className="text-xs text-slate-500 mt-1">Ex: DV-2026-001</p>
            </div>

            <div>
              <Label htmlFor="creditPrefix">Préfixe Avoirs</Label>
              <Input
                id="creditPrefix"
                name="creditPrefix"
                value={formData.creditPrefix}
                onChange={handleChange}
                placeholder="AV"
                maxLength="10"
              />
              <p className="text-xs text-slate-500 mt-1">Ex: AV-2026-001</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? "Sauvegarde..." : "Sauvegarder les paramètres"}
          </Button>
        </div>
      </form>
    </div>
  );
}
