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
import { Copy, ArrowRightCircle, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleDuplicate = async (orc: Orcamento) => {
    try {
      const { data: items } = await (supabase as any).from("orcamentos_itens").select("*").eq("orcamento_id", orc.id);
      const { count } = await (supabase as any).from("orcamentos").select("*", { count: "exact", head: true });
      const newNumero = `COT${String((count || 0) + 1).padStart(6, "0")}`;

      const { data: newOrc, error } = await (supabase as any).from("orcamentos").insert({
        numero: newNumero, data_orcamento: new Date().toISOString().split("T")[0],
        status: "rascunho", cliente_id: orc.cliente_id, validade: null,
        observacoes: orc.observacoes, desconto: (orc as any).desconto || 0,
        imposto_st: (orc as any).imposto_st || 0, imposto_ipi: (orc as any).imposto_ipi || 0,
        frete_valor: (orc as any).frete_valor || 0, outras_despesas: (orc as any).outras_despesas || 0,
        valor_total: orc.valor_total, quantidade_total: orc.quantidade_total,
        peso_total: orc.peso_total, pagamento: (orc as any).pagamento,
        prazo_pagamento: (orc as any).prazo_pagamento, prazo_entrega: (orc as any).prazo_entrega,
        frete_tipo: (orc as any).frete_tipo, modalidade: (orc as any).modalidade,
        cliente_snapshot: (orc as any).cliente_snapshot,
      }).select().single();

      if (error) throw error;

      if (items && items.length > 0 && newOrc) {
        const newItems = items.map((i: any) => ({
          orcamento_id: newOrc.id, produto_id: i.produto_id,
          codigo_snapshot: i.codigo_snapshot, descricao_snapshot: i.descricao_snapshot,
          variacao: i.variacao, quantidade: i.quantidade, unidade: i.unidade,
          valor_unitario: i.valor_unitario, valor_total: i.valor_total,
          peso_unitario: i.peso_unitario, peso_total: i.peso_total,
        }));
        await (supabase as any).from("orcamentos_itens").insert(newItems);
      }

      toast.success(`Cotação duplicada: ${newNumero}`);
      fetchData();
      navigate(`/cotacoes/${newOrc.id}`);
    } catch (err: any) {
      toast.error(`Erro ao duplicar: ${err.message}`);
    }
  };

  const handleApprove = async (orc: Orcamento) => {
    try {
      await (supabase as any).from("orcamentos").update({ status: "aprovado" }).eq("id", orc.id);
      toast.success(`Cotação ${orc.numero} aprovada!`);
      fetchData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleConvertToOV = async (orc: Orcamento) => {
    try {
      // Load cotação items
      const { data: items } = await (supabase as any).from("orcamentos_itens").select("*").eq("orcamento_id", orc.id);

      // Generate OV number
      const { count } = await (supabase as any).from("ordens_venda").select("*", { count: "exact", head: true });
      const ovNumero = `OV${String((count || 0) + 1).padStart(6, "0")}`;

      // Create Ordem de Venda
      const { data: newOV, error } = await (supabase as any).from("ordens_venda").insert({
        numero: ovNumero,
        data_emissao: new Date().toISOString().split("T")[0],
        cliente_id: orc.cliente_id,
        cotacao_id: orc.id,
        status: "pendente",
        status_faturamento: "aguardando",
        valor_total: orc.valor_total,
        observacoes: orc.observacoes,
      }).select().single();

      if (error) throw error;

      // Copy items to OV
      if (items && items.length > 0 && newOV) {
        const ovItems = items.map((i: any) => ({
          ordem_venda_id: newOV.id, produto_id: i.produto_id,
          codigo_snapshot: i.codigo_snapshot, descricao_snapshot: i.descricao_snapshot,
          variacao: i.variacao, quantidade: i.quantidade, unidade: i.unidade,
          valor_unitario: i.valor_unitario, valor_total: i.valor_total,
          peso_unitario: i.peso_unitario, peso_total: i.peso_total,
          quantidade_faturada: 0,
        }));
        await (supabase as any).from("ordens_venda_itens").insert(ovItems);
      }

      // Update cotação status to convertido
      await (supabase as any).from("orcamentos").update({ status: "convertido" }).eq("id", orc.id);

      toast.success(`Ordem de Venda ${ovNumero} criada a partir da cotação ${orc.numero}!`);
      fetchData();
      navigate(`/ordens-venda`);
    } catch (err: any) {
      toast.error(`Erro ao converter: ${err.message}`);
    } finally {
      setConvertingId(null);
    }
  };

  const statusLabels: Record<string, string> = {
    rascunho: "Rascunho", confirmado: "Confirmada", aprovado: "Aprovada",
    convertido: "Convertida", cancelado: "Cancelada", faturado: "Faturada",
  };

  const columns = [
    { key: "numero", label: "Nº", render: (o: Orcamento) => <span className="mono text-xs font-medium text-primary">{o.numero}</span> },
    { key: "cliente", label: "Cliente", render: (o: Orcamento) => (o as any).clientes?.nome_razao_social || "—" },
    { key: "data_orcamento", label: "Data", render: (o: Orcamento) => formatDate(o.data_orcamento) },
    { key: "validade", label: "Validade", render: (o: Orcamento) => o.validade ? formatDate(o.validade) : "—" },
    { key: "valor_total", label: "Total", render: (o: Orcamento) => <span className="font-semibold mono">{formatCurrency(Number(o.valor_total || 0))}</span> },
    { key: "status", label: "Status", render: (o: Orcamento) => <StatusBadge status={o.status} label={statusLabels[o.status]} /> },
    {
      key: "acoes_comercial", label: "Ações", render: (o: Orcamento) => (
        <div className="flex gap-1">
          {(o.status === "rascunho" || o.status === "confirmado") && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleApprove(o); }}>
              <CheckCircle className="w-3 h-3" /> Aprovar
            </Button>
          )}
          {o.status === "aprovado" && (
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setConvertingId(o.id); }}>
              <ArrowRightCircle className="w-3 h-3" /> Gerar OV
            </Button>
          )}
        </div>
      ),
    },
  ];

  const convertingOrc = data.find(o => o.id === convertingId);

  return (
    <AppLayout>
      <ModulePage
        title="Cotações"
        subtitle="Criação e emissão de propostas comerciais"
        addLabel="Nova Cotação"
        onAdd={() => navigate("/cotacoes/novo")}
        count={data.length}
      >
        <DataTable columns={columns} data={data} loading={loading}
          onView={(o) => { setSelected(o); setDrawerOpen(true); }}
          onEdit={(o) => navigate(`/cotacoes/${o.id}`)}
          onDelete={(o) => remove(o.id)}
          onDuplicate={handleDuplicate}
        />
      </ModulePage>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Cotação">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium mono">{selected.numero}</p></div>
            <div><span className="text-xs text-muted-foreground">Cliente</span><p>{(selected as any).clientes?.nome_razao_social || "—"}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Data</span><p>{formatDate(selected.data_orcamento)}</p></div>
              <div><span className="text-xs text-muted-foreground">Validade</span><p>{selected.validade ? formatDate(selected.validade) : "—"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold mono text-lg">{formatCurrency(Number(selected.valor_total || 0))}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} label={statusLabels[selected.status]} /></div>
            <div className="pt-2 space-y-2">
              <Button onClick={() => { setDrawerOpen(false); navigate(`/cotacoes/${selected.id}`); }} className="w-full gap-2">
                Abrir Cotação
              </Button>
              {(selected.status === "rascunho" || selected.status === "confirmado") && (
                <Button variant="secondary" onClick={() => { setDrawerOpen(false); handleApprove(selected); }} className="w-full gap-2">
                  <CheckCircle className="w-4 h-4" /> Aprovar Cotação
                </Button>
              )}
              {selected.status === "aprovado" && (
                <Button variant="default" onClick={() => { setDrawerOpen(false); setConvertingId(selected.id); }} className="w-full gap-2">
                  <ArrowRightCircle className="w-4 h-4" /> Gerar Ordem de Venda
                </Button>
              )}
              <Button variant="outline" onClick={() => { setDrawerOpen(false); handleDuplicate(selected); }} className="w-full gap-2">
                <Copy className="w-4 h-4" /> Duplicar
              </Button>
            </div>
          </div>
        )}
      </ViewDrawer>

      <ConfirmDialog
        open={!!convertingId}
        onCancel={() => setConvertingId(null)}
        onConfirm={() => convertingOrc && handleConvertToOV(convertingOrc)}
        title="Converter em Ordem de Venda"
        description={`Deseja converter a cotação ${convertingOrc?.numero} em uma Ordem de Venda? A cotação será marcada como "Convertida".`}
      />
    </AppLayout>
  );
};

export default Orcamentos;
