import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";

interface Orcamento {
  id: string; numero: string; cliente_id: string; data_orcamento: string;
  validade: string; valor_total: number; observacoes: string; status: string;
  ativo: boolean; clientes?: { nome_razao_social: string };
}

const Orcamentos = () => {
  const navigate = useNavigate();
  const { data, loading, remove } = useSupabaseCrud<Orcamento>({ table: "orcamentos", select: "*, clientes(nome_razao_social)" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Orcamento | null>(null);

  const columns = [
    { key: "numero", label: "Nº", render: (o: Orcamento) => <span className="font-mono text-xs font-medium text-primary">{o.numero}</span> },
    { key: "cliente", label: "Cliente", render: (o: Orcamento) => (o as any).clientes?.nome_razao_social || "—" },
    { key: "data_orcamento", label: "Data", render: (o: Orcamento) => new Date(o.data_orcamento).toLocaleDateString("pt-BR") },
    { key: "validade", label: "Validade", render: (o: Orcamento) => o.validade ? new Date(o.validade).toLocaleDateString("pt-BR") : "—" },
    { key: "valor_total", label: "Total", render: (o: Orcamento) => <span className="font-semibold font-mono">R$ {Number(o.valor_total || 0).toFixed(2)}</span> },
    { key: "status", label: "Status", render: (o: Orcamento) => <StatusBadge status={o.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage
        title="Orçamentos"
        subtitle="Criação e emissão de proposta comercial"
        addLabel="Novo Orçamento"
        onAdd={() => navigate("/orcamentos/novo")}
        count={data.length}
      >
        <DataTable columns={columns} data={data} loading={loading}
          onView={(o) => { setSelected(o); setDrawerOpen(true); }}
          onEdit={(o) => navigate(`/orcamentos/${o.id}`)}
          onDelete={(o) => remove(o.id)}
        />
      </ModulePage>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Orçamento">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium font-mono">{selected.numero}</p></div>
            <div><span className="text-xs text-muted-foreground">Cliente</span><p>{(selected as any).clientes?.nome_razao_social || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Data</span><p>{new Date(selected.data_orcamento).toLocaleDateString("pt-BR")}</p></div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold font-mono">R$ {Number(selected.valor_total || 0).toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
            <div className="pt-2">
              <Button onClick={() => { setDrawerOpen(false); navigate(`/orcamentos/${selected.id}`); }} className="w-full gap-2">
                Abrir Orçamento
              </Button>
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Orcamentos;
