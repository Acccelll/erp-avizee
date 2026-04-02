import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryCard } from "@/components/SummaryCard";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2 } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
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

import { statusOrcamento, statusToOptions, getStatusLabel } from "@/lib/statusSchema";

const statusLabels: Record<string, string> = Object.fromEntries(
  Object.entries(statusOrcamento).map(([k, v]) => [k, v.label])
);

const Orcamentos = () => {
  const navigate = useNavigate();
  const { pushView } = useRelationalNavigation();
  const { data, loading, remove, fetchData } = useSupabaseCrud<Orcamento>({ table: "orcamentos", select: "*, clientes(nome_razao_social)" });
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [poNumberCliente, setPoNumberCliente] = useState("");
  const [dataPoCliente, setDataPoCliente] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [clienteFilters, setClienteFilters] = useState<string[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!supabase) return;
    supabase.from("clientes").select("id, nome_razao_social").eq("ativo", true).then(({ data }) => setClientesList(data || []));
  }, []);

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
        po_number: poNumberCliente || null,
        data_po_cliente: dataPoCliente || null,
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
      setPoNumberCliente("");
      setDataPoCliente("");
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
      if (statusFilters.length > 0 && !statusFilters.includes(orc.status)) return false;
      if (clienteFilters.length > 0 && !clienteFilters.includes(orc.cliente_id || "")) return false;

      if (!query) return true;
      return [orc.numero, orc.clientes?.nome_razao_social, orc.observacoes].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, searchTerm, statusFilters, clienteFilters]);

  const columns = [
    { key: "numero", label: "Nº", sortable: true, render: (o: Orcamento) => <span className="font-mono text-xs font-medium text-primary">{o.numero}</span> },
    { key: "cliente", label: "Cliente", render: (o: Orcamento) => o.clientes?.nome_razao_social || "—" },
    { key: "data_orcamento", label: "Data", sortable: true, render: (o: Orcamento) => formatDate(o.data_orcamento) },
    { key: "validade", label: "Validade", render: (o: Orcamento) => o.validade ? formatDate(o.validade) : "—" },
    { key: "valor_total", label: "Total", sortable: true, render: (o: Orcamento) => <span className="font-semibold font-mono">{formatCurrency(Number(o.valor_total || 0))}</span> },
    { key: "status", label: "Status", sortable: true, render: (o: Orcamento) => <StatusBadge status={o.status} label={statusLabels[o.status]} /> },
    {
      key: "acoes_comercial", label: "Ações", sortable: false, render: (o: Orcamento) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/orcamentos/${o.id}`); }}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar cotação</TooltipContent>
          </Tooltip>
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

  const orcActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    statusFilters.forEach(f => {
      chips.push({ key: "status", label: "Status", value: [f], displayValue: statusLabels[f] || f });
    });
    clienteFilters.forEach(f => {
      const cli = clientesList.find(x => x.id === f);
      chips.push({ key: "cliente", label: "Cliente", value: [f], displayValue: cli?.nome_razao_social || f });
    });
    return chips;
  }, [statusFilters, clienteFilters, clientesList]);

  const handleRemoveOrcFilter = (key: string, value?: string) => {
    if (key === "status") setStatusFilters(prev => prev.filter(v => v !== value));
    if (key === "cliente") setClienteFilters(prev => prev.filter(v => v !== value));
  };

  const statusOptions: MultiSelectOption[] = Object.entries(statusLabels).map(([k, v]) => ({
    label: v, value: k
  }));

  const clienteOptions: MultiSelectOption[] = clientesList.map(c => ({
    label: c.nome_razao_social, value: c.id
  }));

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
          onRemoveFilter={handleRemoveOrcFilter}
          onClearAll={() => { setStatusFilters([]); setClienteFilters([]); }}
          count={filteredData.length}
        >
          <MultiSelect
            options={statusOptions}
            selected={statusFilters}
            onChange={setStatusFilters}
            placeholder="Status"
            className="w-[200px]"
          />
          <MultiSelect
            options={clienteOptions}
            selected={clienteFilters}
            onChange={setClienteFilters}
            placeholder="Clientes"
            className="w-[250px]"
          />
        </AdvancedFilterBar>

        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={(o) => pushView("orcamento", o.id)}
        />
      </ModulePage>

      <ConfirmDialog
        open={!!convertingId}
        onClose={() => {
          setConvertingId(null);
          setPoNumberCliente("");
          setDataPoCliente("");
        }}
        onConfirm={() => convertingOrc && handleConvertToOV(convertingOrc)}
        title="Converter em Ordem de Venda"
        description={`Deseja converter a cotação ${convertingOrc?.numero} em uma Ordem de Venda?`}
      >
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-2">
            <Label className="text-xs">Nº Pedido do Cliente (PO)</Label>
            <Input
              value={poNumberCliente}
              onChange={(e) => setPoNumberCliente(e.target.value)}
              placeholder="Ex: PO-2026-00123"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Número do pedido de compra emitido pelo cliente.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data do Pedido do Cliente</Label>
            <Input
              type="date"
              value={dataPoCliente}
              onChange={(e) => setDataPoCliente(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
};

export default Orcamentos;
