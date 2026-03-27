import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { SummaryCard } from "@/components/SummaryCard";
import { ViewDrawer, ViewField, ViewSection } from "@/components/ViewDrawer";
import { AdvancedFilterBar, type FilterChip } from "@/components/AdvancedFilterBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2 } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ArrowRightCircle, CheckCircle, FileText, DollarSign, Clock, BarChart3, Link2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Send } from "lucide-react";

interface Orcamento {
  id: string; numero: string; cliente_id: string; data_orcamento: string;
  validade: string; valor_total: number; observacoes: string; status: string;
  quantidade_total: number; peso_total: number;
  ativo: boolean; clientes?: { nome_razao_social: string };
}

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", confirmado: "Confirmada", aprovado: "Aprovada",
  convertido: "Convertida", cancelado: "Cancelada", faturado: "Faturada",
};

const Orcamentos = () => {
  const navigate = useNavigate();
  const { data, loading, remove, fetchData } = useSupabaseCrud<Orcamento>({ table: "orcamentos", select: "*, clientes(nome_razao_social)" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Orcamento | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { isAdmin } = useIsAdmin();

  const handleSendForApproval = useCallback(async (orc: Orcamento) => {
    if (orc.status !== "rascunho") return;
    try {
      await supabase.from("orcamentos").update({ status: "confirmado" }).eq("id", orc.id);
      toast.success(`Cotação ${orc.numero} enviada para aprovação!`);
      fetchData();
    } catch {
      toast.error("Erro ao enviar cotação para aprovação.");
    }
  }, [fetchData]);

  const kpis = useMemo(() => {
    const total = data.length;
    const totalValue = data.reduce((s, o) => s + Number(o.valor_total || 0), 0);
    const approved = data.filter(o => o.status === "aprovado").length;
    const converted = data.filter(o => o.status === "convertido").length;
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";
    return { total, totalValue, approved, conversionRate };
  }, [data]);

  const handleDuplicate = async (orc: Orcamento) => {
    try {
      const { data: items } = await supabase.from("orcamentos_itens").select("*").eq("orcamento_id", orc.id);
      const { count } = await supabase.from("orcamentos").select("*", { count: "exact", head: true });
      const newNumero = `COT${String((count || 0) + 1).padStart(6, "0")}`;
      const { data: newOrc, error } = await supabase.from("orcamentos").insert({
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
        await supabase.from("orcamentos_itens").insert(newItems);
      }
      toast.success(`Cotação duplicada: ${newNumero}`);
      fetchData();
      navigate(`/cotacoes/${newOrc.id}`);
    } catch (err: any) {
      console.error('[orcamentos] duplicar:', err);
      toast.error("Erro ao duplicar cotação.");
    }
  };

  const handleApprove = async (orc: Orcamento) => {
    if (!isAdmin) {
      toast.error("Somente administradores podem aprovar cotações.");
      return;
    }
    try {
      await supabase.from("orcamentos").update({ status: "aprovado" }).eq("id", orc.id);
      toast.success(`Cotação ${orc.numero} aprovada!`);
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao aprovar cotação.");
    }
  };

  const handleConvertToOV = async (orc: Orcamento) => {
    try {
      const { data: items } = await supabase.from("orcamentos_itens").select("*").eq("orcamento_id", orc.id);
      const { count } = await supabase.from("ordens_venda").select("*", { count: "exact", head: true });
      const ovNumero = `OV${String((count || 0) + 1).padStart(6, "0")}`;
      const { data: newOV, error } = await supabase.from("ordens_venda").insert({
        numero: ovNumero, data_emissao: new Date().toISOString().split("T")[0],
        cliente_id: orc.cliente_id, cotacao_id: orc.id,
        status: "pendente", status_faturamento: "aguardando",
        valor_total: orc.valor_total, observacoes: orc.observacoes,
      }).select().single();
      if (error) throw error;
      if (items && items.length > 0 && newOV) {
        const ovItems = items.map((i: any) => ({
          ordem_venda_id: newOV.id, produto_id: i.produto_id,
          codigo_snapshot: i.codigo_snapshot, descricao_snapshot: i.descricao_snapshot,
          variacao: i.variacao, quantidade: i.quantidade, unidade: i.unidade,
          valor_unitario: i.valor_unitario, valor_total: i.valor_total,
          peso_unitario: i.peso_unitario, peso_total: i.peso_total,
          quantidade_faturada: 0,
        }));
        await supabase.from("ordens_venda_itens").insert(ovItems);
      }
      await supabase.from("orcamentos").update({ status: "convertido" }).eq("id", orc.id);
      toast.success(`Ordem de Venda ${ovNumero} criada!`);
      fetchData();
      navigate(`/ordens-venda`);
    } catch (err: any) {
      toast.error("Erro ao converter cotação.");
    } finally {
      setConvertingId(null);
    }
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((orc) => {
      if (statusFilter !== "todos" && orc.status !== statusFilter) return false;
      if (!query) return true;
      return [orc.numero, orc.clientes?.nome_razao_social, orc.observacoes].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, searchTerm, statusFilter]);

  const columns = [
    { key: "numero", label: "Nº", render: (o: Orcamento) => <span className="font-mono text-xs font-medium text-primary">{o.numero}</span> },
    { key: "cliente", label: "Cliente", render: (o: Orcamento) => o.clientes?.nome_razao_social || "—" },
    { key: "data_orcamento", label: "Data", render: (o: Orcamento) => formatDate(o.data_orcamento) },
    { key: "validade", label: "Validade", render: (o: Orcamento) => o.validade ? formatDate(o.validade) : "—" },
    { key: "valor_total", label: "Total", render: (o: Orcamento) => <span className="font-semibold font-mono">{formatCurrency(Number(o.valor_total || 0))}</span> },
    { key: "status", label: "Status", render: (o: Orcamento) => <StatusBadge status={o.status} label={statusLabels[o.status]} /> },
    {
      key: "acoes_comercial", label: "Ações", sortable: false, render: (o: Orcamento) => (
        <div className="flex gap-1">
          {o.status === "rascunho" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleSendForApproval(o); }}>
              <Send className="w-3 h-3" /> Enviar p/ Aprovação
            </Button>
          )}
          {o.status === "confirmado" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleApprove(o); }} disabled={!isAdmin} title={!isAdmin ? "Somente admins podem aprovar" : ""}>
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
  const statusOptions = ["todos", "rascunho", "confirmado", "aprovado", "convertido", "cancelado", "faturado"];

  const orcActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter !== "todos") chips.push({ key: "status", label: "Status", value: statusFilter, displayValue: statusLabels[statusFilter] || statusFilter });
    return chips;
  }, [statusFilter]);

  return (
    <AppLayout>
      <ModulePage
        title="Cotações"
        subtitle="Criação e emissão de propostas comerciais"
        addLabel="Nova Cotação"
        onAdd={() => navigate("/cotacoes/novo")}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total de Cotações" value={String(kpis.total)} icon={FileText} variationType="neutral" variation="registros" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={DollarSign} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Aprovadas" value={String(kpis.approved)} icon={Clock} variationType="positive" variation="aguardando OV" />
          <SummaryCard title="Taxa de Conversão" value={`${kpis.conversionRate}%`} icon={BarChart3} variationType="positive" variation="cotações → OV" />
        </div>

        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por número da cotação ou cliente..."
          activeFilters={orcActiveFilters}
          onRemoveFilter={() => setStatusFilter("todos")}
          count={filteredData.length}
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>{status === "todos" ? "Todos os status" : statusLabels[status] || status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AdvancedFilterBar>

        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={(o) => { setSelected(o); setDrawerOpen(true); }}
        />
      </ModulePage>

      <ViewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Cotação ${selected?.numero || ""}`}
        badge={selected ? <StatusBadge status={selected.status} label={statusLabels[selected.status]} /> : undefined}
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); navigate(`/cotacoes/${selected.id}`); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); handleDuplicate(selected); }}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Duplicar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <ViewSection title="Dados Gerais">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Número"><span className="font-mono font-medium">{selected.numero}</span></ViewField>
                <ViewField label="Cliente">{selected.clientes?.nome_razao_social || "—"}</ViewField>
                <ViewField label="Data">{formatDate(selected.data_orcamento)}</ViewField>
                <ViewField label="Validade">{selected.validade ? formatDate(selected.validade) : "—"}</ViewField>
              </div>
            </ViewSection>

            <ViewSection title="Valores">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</span>
                <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(Number(selected.valor_total || 0))}</p>
              </div>
            </ViewSection>

            {selected.observacoes && (
              <ViewSection title="Observações">
                <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
              </ViewSection>
            )}

            <div className="space-y-2 pt-2">
              <Button onClick={() => { setDrawerOpen(false); navigate(`/cotacoes/${selected.id}`); }} className="w-full gap-2">Abrir Cotação</Button>
              {selected.status === "rascunho" && (
                <Button variant="secondary" onClick={() => { setDrawerOpen(false); handleSendForApproval(selected); }} className="w-full gap-2">
                  <Send className="w-4 h-4" /> Enviar p/ Aprovação
                </Button>
              )}
              {selected.status === "confirmado" && (
                <Button variant="secondary" onClick={() => { setDrawerOpen(false); handleApprove(selected); }} className="w-full gap-2" disabled={!isAdmin}>
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
              <Button variant="outline" onClick={async () => {
                const token = crypto.randomUUID();
                await (supabase.from('orcamentos') as any).update({ public_token: token }).eq('id', selected.id);
                const url = `${window.location.origin}/orcamento-publico?token=${token}`;
                await navigator.clipboard.writeText(url);
                toast.success('Link público copiado para a área de transferência!');
                fetchData();
              }} className="w-full gap-2">
                <Link2 className="w-4 h-4" /> Gerar Link Público
              </Button>
            </div>
          </div>
        )}
      </ViewDrawer>

      <ConfirmDialog
        open={!!convertingId}
        onClose={() => setConvertingId(null)}
        onConfirm={() => convertingOrc && handleConvertToOV(convertingOrc)}
        title="Converter em Ordem de Venda"
        description={`Deseja converter a cotação ${convertingOrc?.numero} em uma Ordem de Venda?`}
      />
    </AppLayout>
  );
};

export default Orcamentos;
