import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit2, Trash2 } from "lucide-react";
import ClientForm from "./ClientForm";

export default function ClientsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: clients, isLoading, refetch } = trpc.commercial.clients.list.useQuery();
  const createMutation = trpc.commercial.clients.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowForm(false);
    },
  });
  const deleteMutation = trpc.commercial.clients.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="text-center py-8">Chargement des clients...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Clients ({clients?.length || 0})</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} />
          Nouveau client
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-white border border-slate-200">
          <ClientForm
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Card>
      )}

      {!clients || clients.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 border border-slate-200">
          <p className="text-slate-600">Aucun client. Créez votre premier client pour commencer.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="p-4 bg-white border border-slate-200 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{client.name}</h3>
                  <p className="text-sm text-slate-600">{client.type === "entreprise" ? "Entreprise" : "Particulier"}</p>
                  {client.email && <p className="text-sm text-slate-600">{client.email}</p>}
                  {client.siret && <p className="text-sm text-slate-600">SIRET: {client.siret}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(client.id)}
                    className="gap-1"
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ clientId: client.id })}
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
