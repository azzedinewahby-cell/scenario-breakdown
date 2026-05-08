import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Building2 } from "lucide-react";

export default function SettingsTab() {
  const { data, isLoading } = trpc.commercial.settings.get.useQuery();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations entreprise
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 px-3 py-1 rounded-md">
              <Lock className="h-4 w-4" />
              Lecture seule
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Ces informations sont figées et apparaissent automatiquement sur tous les devis, factures et avoirs.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Identité</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dénomination légale</Label>
                <Input value={data.companyName} readOnly className="bg-slate-50" />
                <p className="text-xs text-muted-foreground mt-1">Nom officiel sur les statuts INSEE</p>
              </div>
              <div>
                <Label>Nom commercial</Label>
                <Input value={data.tradeName} readOnly className="bg-slate-50 font-semibold" />
                <p className="text-xs text-muted-foreground mt-1">Affiché en grand sur les factures</p>
              </div>
              <div>
                <Label>SIRET</Label>
                <Input value={data.siret} readOnly className="bg-slate-50 font-mono" />
              </div>
              <div>
                <Label>N° TVA Intracommunautaire</Label>
                <Input value={data.vatNumber || "Non assujetti"} readOnly className="bg-slate-50" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Adresse & contact</h3>
            <div className="space-y-4">
              <div>
                <Label>Adresse postale</Label>
                <Textarea value={data.address} readOnly className="bg-slate-50" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Téléphone</Label>
                  <Input value={data.phone || "—"} readOnly className="bg-slate-50" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={data.email || "—"} readOnly className="bg-slate-50" />
                </div>
                <div>
                  <Label>Site web</Label>
                  <Input value={data.website || "—"} readOnly className="bg-slate-50" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Coordonnées bancaires</h3>
            <Textarea value={data.bankDetails} readOnly className="bg-slate-50 font-mono text-sm" rows={4} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Mentions légales</h3>
            <Textarea value={data.legalMentions} readOnly className="bg-slate-50 text-sm" rows={3} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Paiement</h3>
            <div className="space-y-4">
              <div>
                <Label>Délai de paiement par défaut</Label>
                <Input value={data.paymentTerms} readOnly className="bg-slate-50" />
              </div>
              <div>
                <Label>Conditions en cas de retard</Label>
                <Textarea value={data.paymentConditions} readOnly className="bg-slate-50 text-sm" rows={3} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Numérotation des documents</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Préfixe Facture</Label>
                <Input value={data.invoicePrefix} readOnly className="bg-slate-50 font-mono text-center" />
              </div>
              <div>
                <Label>Préfixe Devis</Label>
                <Input value={data.quotePrefix} readOnly className="bg-slate-50 font-mono text-center" />
              </div>
              <div>
                <Label>Préfixe Avoir</Label>
                <Input value={data.creditPrefix} readOnly className="bg-slate-50 font-mono text-center" />
              </div>
              <div>
                <Label>TVA par défaut</Label>
                <Input value={`${data.defaultVatRate}%`} readOnly className="bg-slate-50 text-center" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
