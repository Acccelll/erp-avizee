import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Orcamento {
  id: string; numero: string; cliente_id: string; data_orcamento: string;
  validade: string; valor_total: number; observacoes: string; status: string;
  quantidade_total: number; peso_total: number;
  ativo: boolean; clientes?: { nome_razao_social: string };
}

const Orcamentos = () => {
  const navigate = useNavigate();
  const { data, loading, remove, fetchData } = useSupabaseCrud<Orcamento>({ table: "orcamentos", select: "*, clientes(nome_razao_social)" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Orcamento | null>(null);

  const handleDuplicate = async (orc: Orcamento) => {
    try {
      // Load original items
      const { data: items } = await (supabase as any).from("orcamentos_itens").select("*").eq("orcamento_id", orc.id);
      
      // Generate new number
      const { count } = await (supabase as any).from("orcamentos").select("*", { count: "exact", head: true });
      const newNumero = `ORC${String((count || 0) + 1).padStart(6, "0")}`;

      // Create copy
      const { data: newOrc, error } = await (supabase as any).from("orcamentos").insert({
        numero: newNumero,
        data_orcamento: new Date().toISOString().split("T")[0],
        status: "rascunho",
        cliente_id: orc.cliente_id,
        validade: null,
        observacoes: orc.observacoes,
        desconto: (orc as any).desconto || 0,
        imposto_st: (orc as any).imposto_st || 0,
        imposto_ipi: (orc as any).imposto_ipi || 0,
        frete_valor: (orc as any).frete_valor || 0,
        outras_despesas: (orc as any).outras_despesas || 0,
        valor_total: orc.valor_total,
        quantidade_total: orc.quantidade_total,
        peso_total: orc.peso_total,
        pagamento: (orc as any).pagamento,
        prazo_pagamento: (orc as any).prazo_pagamento,
        prazo_entrega: (orc as any).prazo_entrega,
        frete_tipo: (orc as any).frete_tipo,
        modalidade: (orc as any).modalidade,
        cliente_snapshot: (orc as any).cliente_snapshot,
      }).select().single();

      if (error) throw error;

      // Copy items
      if (items && items.length > 0 && newOrc) {
        const newItems = items.map((i: any) => ({
          orcamento_id: newOrc.id,
          produto_id: i.produto_id,
          codigo_snapshot: i.codigo_snapshot,
          descricao_snapshot: i.descricao_snapshot,
          variacao: i.variacao,
          quantidade: i.quantidade,
          unidade: i.unidade,
          valor_unitario: i.valor_unitario,
          valor_total: i.valor_total,
          peso_unitario: i.peso_unitario,
          peso_total: i.peso_total,
        }));
        await (supabase as any).from("orcamentos_itens").insert(newItems);
      }

      toast.success(`Orçamento duplicado: ${newNumero}`);
      fetchData();
      navigate(`/orcamentos/${newOrc.id}`);
    } catch (err: any) {
      toast.error(`Erro ao duplicar: ${err.message}`);
    }
  };

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
          onDuplicate={handleDuplicate}
        />
      </ModulePage>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Orçamento">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium font-mono">{selected.numero}</p></div>
            <div><span className="text-xs text-muted-foreground">Cliente</span><p>{(selected as any).clientes?.nome_razao_social || "—"}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Data</span><p>{new Date(selected.data_orcamento).toLocaleDateString("pt-BR")}</p></div>
              <div><span className="text-xs text-muted-foreground">Validade</span><p>{selected.validade ? new Date(selected.validade).toLocaleDateString("pt-BR") : "—"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold font-mono text-lg">R$ {Number(selected.valor_total || 0).toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
            <div className="pt-2 space-y-2">
              <Button onClick={() => { setDrawerOpen(false); navigate(`/orcamentos/${selected.id}`); }} className="w-full gap-2">
                Abrir Orçamento
              </Button>
              <Button variant="outline" onClick={() => { setDrawerOpen(false); handleDuplicate(selected); }} className="w-full gap-2">
                <Copy className="w-4 h-4" /> Duplicar
              </Button>
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Orcamentos;
