import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit2, Trash2 } from "lucide-react";
import ProductForm from "./ProductForm";

export default function ProductsTab() {
  const [showForm, setShowForm] = useState(false);

  const { data: products, isLoading, refetch } = trpc.commercial.products.list.useQuery();
  const createMutation = trpc.commercial.products.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
    },
  });
  const deleteMutation = trpc.commercial.products.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Produits/Prestations ({products?.length || 0})</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} />
          Nouveau produit
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-white border border-slate-200">
          <ProductForm
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Card>
      )}

      {!products || products.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 border border-slate-200">
          <p className="text-slate-600">Aucun produit. Créez votre premier produit pour commencer.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id} className="p-4 bg-white border border-slate-200 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{product.name}</h3>
                  {product.description && <p className="text-sm text-slate-600 mt-1">{product.description}</p>}
                  <div className="flex gap-4 mt-2 text-sm text-slate-600">
                    <span>Prix HT: {product.priceHT / 100}€</span>
                    <span>TVA: {product.vatRate}%</span>
                    <span>Unité: {product.unit}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ productId: product.id })}
                    className="gap-1"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
