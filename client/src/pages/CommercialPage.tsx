import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ClientsTab from "./commercial/ClientsTab";
import ProductsTab from "./commercial/ProductsTab";
import QuotesTab from "./commercial/QuotesTab";
import InvoicesTab from "./commercial/InvoicesTab";
import CreditsTab from "./commercial/CreditsTab";
import SettingsTab from "./commercial/SettingsTab";

export default function CommercialPage() {
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Gestion Commerciale
          </h1>
          <p className="text-slate-600">
            Gérez vos clients, produits, devis, factures et avoirs
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-white border border-slate-200 rounded-lg p-1">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <span className="hidden sm:inline">Clients</span>
              <span className="sm:hidden">👥</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <span className="hidden sm:inline">Produits</span>
              <span className="sm:hidden">📦</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <span className="hidden sm:inline">Devis</span>
              <span className="sm:hidden">📋</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <span className="hidden sm:inline">Factures</span>
              <span className="sm:hidden">💰</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <span className="hidden sm:inline">Avoirs</span>
              <span className="sm:hidden">↩️</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <span className="hidden sm:inline">Paramètres</span>
              <span className="sm:hidden">⚙️</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="clients" className="space-y-4">
            <ClientsTab />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            <QuotesTab />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <InvoicesTab />
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            <CreditsTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
