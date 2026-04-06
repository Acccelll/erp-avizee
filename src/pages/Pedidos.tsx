import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryCard } from "@/components/SummaryCard";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { ViewDrawerV2, ViewField } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { FileOutput } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate, daysSince, formatNumber } from "@/lib/format";
import { calcularStatusFaturamentoOV } from "@/lib/fiscal";
import { CheckCircle, FileText, DollarSign, Truck } from "lucide-react";
import { LogisticaRastreioSection } from "@/components/logistica/LogisticaRastreioSection";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Pedido {
  id: string; numero: string; data_emissao: string; cliente_id: string;
  cotacao_id: string; status: string; status_faturamento: string;
  data_aprovacao: string; data_prometida_despacho: string;
  prazo_despacho_dias: number; valor_total: number; observacoes: string;
  po_number: string;
  ativo: boolean;
  clientes?: { nome_razao_social: string };
  orcamentos?: { numero: string };
}

const statusOperacionalLabels: Record<string, string> = {
  pendente: "Aguardando",
  aprovada: "Aprovado",
  em_separacao: "Em Separação",
  separado: "Separado",
  em_transporte: "Em Transporte",
  entregue: "Entregue",
  faturado: "Faturado",
  cancelada: "Cancelado",
};

const statusFaturamentoLabels: Record<string, string> = {
  aguardando: "Aguardando",
  parcial: "Parcial",
  total: "Faturado",
};
const statusFaturamentoColors: Record<string, string> = {
  aguardando: "bg-warning/10 text-warning border-warning/30",
  parcial: "bg-info/10 text-info border-info/30",
  total: "bg-success/10 text-success border-success/30",
};

const Pedidos = () => {
  const { pushView: _pushView } = useRelationalNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, loading, fetchData } = useSupabaseCrud<Pedido>({
    table: "ordens_venda", select: "*, clientes(nome_razao_social), orcamentos(numero)",
  });
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [faturamentoFilters, setFaturamentoFilters] = useState<string[]>([]);
  const [clienteFilters, setClienteFilters] = useState<string[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [generatingNfId, setGeneratingNfId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("clientes").select("id, nome_razao_social").eq("ativo", true).then(({ data }) => setClientesList(data || []));
  }, []);

  const kpis = useMemo(() => {
    const total = data.length;
    const totalValue = data.reduce((s, o) => s + Number(o.valor_total || 0), 0);
    const aprovados = data.filter(o => o.status === "aprovada").length;
    const emAndamento = data.filter(o => ["em_separacao", "separado", "em_transporte"].includes(o.status)).length;
    return { total, totalValue, aprovados, emAndamento };
  }, [data]);

  const handleView = (pedido: Pedido) => {
    setSelected(pedido);
    setDrawerOpen(true);
  };

  const handleGenerateNF = async (pedido: Pedido) => {
    try {
      const { data: pedidoItems } = await supabase.from("ordens_venda_itens").select("*").eq("ordem_venda_id", pedido.id);
      const { count } = await supabase.from("notas_fiscais").select("*", { count: "exact", head: true });
      const nfNumero = String((count || 0) + 1).padStart(6, "0");

      const totalProdutos = (pedidoItems || []).reduce((s: number, i: any) => s + Number(i.valor_total || 0), 0);

      const { data: newNF, error } = await supabase.from("notas_fiscais").insert({
        numero: nfNumero,
        tipo: "saida",
        data_emissao: new Date().toISOString().split("T")[0],
        cliente_id: pedido.cliente_id,
        ordem_venda_id: pedido.id,
        valor_total: totalProdutos,
        status: "pendente",
        movimenta_estoque: true,
        gera_financeiro: true,
        observacoes: `Gerada a partir do Pedido ${pedido.numero}`,
      }).select().single();

      if (error) throw error;

      if (pedidoItems && pedidoItems.length > 0 && newNF) {
        const nfItems = pedidoItems.map((i: any) => ({
          nota_fiscal_id: newNF.id,
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
        }));
        await supabase.from("notas_fiscais_itens").insert(nfItems);
      }

      if (pedidoItems) {
        for (const item of pedidoItems) {
          const novaQtdFaturada = (item.quantidade_faturada || 0) + item.quantidade;
          await supabase.from("ordens_venda_itens").update({
            quantidade_faturada: novaQtdFaturada,
          }).eq("id", item.id);
        }
      }

      const { data: updatedItems } = await supabase
        .from("ordens_venda_itens")
        .select("quantidade, quantidade_faturada")
        .eq("ordem_venda_id", pedido.id);
      const totalQ = (updatedItems || []).reduce((s: number, i: any) => s + Number(i.quantidade), 0);
      const totalF = (updatedItems || []).reduce((s: number, i: any) => s + Number(i.quantidade_faturada || 0), 0);
      const newFatStatus = calcularStatusFaturamentoOV(totalQ, totalF);

      await supabase.from("ordens_venda").update({ status_faturamento: newFatStatus }).eq("id", pedido.id);

      toast.success(`NF ${nfNumero} gerada a partir do Pedido ${pedido.numero}!`);
      fetchData();
    } catch (err: any) {
      console.error('[pedidos] gerar NF:', err);
      toast.error("Erro ao gerar Nota Fiscal.");
    } finally {
      setGeneratingNfId(null);
    }
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((pedido) => {
      if (statusFilters.length > 0 && !statusFilters.includes(pedido.status)) return false;
      if (faturamentoFilters.length > 0 && !faturamentoFilters.includes(pedido.status_faturamento)) return false;
      if (clienteFilters.length > 0 && !clienteFilters.includes(pedido.cliente_id || "")) return false;

      if (!query) return true;
      return [pedido.numero, pedido.clientes?.nome_razao_social, pedido.orcamentos?.numero, pedido.observacoes].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, faturamentoFilters, searchTerm, statusFilters, clienteFilters]);

  const activeFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    statusFilters.forEach(f => {
      chips.push({ key: "status", label: "Status", value: [f], displayValue: statusOperacionalLabels[f] || f });
    });
    faturamentoFilters.forEach(f => {
      chips.push({ key: "faturamento", label: "Faturamento", value: [f], displayValue: statusFaturamentoLabels[f] || f });
    });
    clienteFilters.forEach(f => {
      const cli = clientesList.find(x => x.id === f);
      chips.push({ key: "cliente", label: "Cliente", value: [f], displayValue: cli?.nome_razao_social || f });
    });
    return chips;
  }, [statusFilters, faturamentoFilters, clienteFilters, clientesList]);

  const handleRemoveFilter = (key: string, value?: string) => {
    if (key === "status") setStatusFilters(prev => prev.filter(v => v !== value));
    if (key === "faturamento") setFaturamentoFilters(prev => prev.filter(v => v !== value));
    if (key === "cliente") setClienteFilters(prev => prev.filter(v => v !== value));
  };

  const statusOptions: MultiSelectOption[] = Object.entries(statusOperacionalLabels).map(([k, v]) => ({ label: v, value: k }));
  const faturamentoOptions: MultiSelectOption[] = Object.entries(statusFaturamentoLabels).map(([k, v]) => ({ label: v, value: k }));
  const clienteOptions: MultiSelectOption[] = clientesList.map(c => ({ label: c.nome_razao_social, value: c.id }));

  const columns = [
    { key: "numero", label: "Nº Pedido", render: (p: Pedido) => <span className="mono text-xs font-medium text-primary">{p.numero}</span> },
    { key: "po_number", label: "PO Cliente", render: (p: Pedido) => p.po_number ? <span className="mono text-xs">{p.po_number}</span> : "—" },
    { key: "cotacao", label: "Cotação", render: (p: Pedido) => p.orcamentos?.numero ? <span className="mono text-xs">{p.orcamentos.numero}</span> : "—" },
    { key: "cliente", label: "Cliente", render: (p: Pedido) => p.clientes?.nome_razao_social || "—" },
    { key: "data_emissao", label: "Emissão", render: (p: Pedido) => formatDate(p.data_emissao) },
    { key: "valor_total", label: "Total", render: (p: Pedido) => <span className="font-semibold mono">{formatCurrency(Number(p.valor_total || 0))}</span> },
    { key: "status", label: "Status", render: (p: Pedido) => <StatusBadge status={p.status} label={statusOperacionalLabels[p.status]} /> },
    {
      key: "faturamento", label: "Faturamento", render: (p: Pedido) => (
        <Badge variant="outline" className={`text-xs ${statusFaturamentoColors[p.status_faturamento] || ""}`}>
          {statusFaturamentoLabels[p.status_faturamento] || p.status_faturamento}
        </Badge>
      ),
    },
    {
      key: "dias", label: "Dias", render: (p: Pedido) => {
        const dias = daysSince(p.data_emissao);
        return <span className={`mono text-xs ${dias > 7 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{dias}d</span>;
      },
    },
    {
      key: "acoes", label: "Ações", sortable: false, render: (p: Pedido) => (
        <div className="flex gap-1">
          {(p.status === "aprovada" || p.status === "em_separacao") && p.status_faturamento !== "total" && (
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setGeneratingNfId(p.id); }}>
              <FileOutput className="w-3 h-3" /> Gerar NF
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <ModulePage
        title="Pedidos"
        subtitle="Acompanhamento operacional de pedidos aprovados e faturamento"
      >
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por número, cliente ou cotação..."
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={() => { setStatusFilters([]); setFaturamentoFilters([]); setClienteFilters([]); }}
          count={filteredData.length}
        >
          <MultiSelect
            options={statusOptions}
            selected={statusFilters}
            onChange={setStatusFilters}
            placeholder="Status"
            className="w-[180px]"
          />
          <MultiSelect
            options={faturamentoOptions}
            selected={faturamentoFilters}
            onChange={setFaturamentoFilters}
            placeholder="Faturamento"
            className="w-[180px]"
          />
          <MultiSelect
            options={clienteOptions}
            selected={clienteFilters}
            onChange={setClienteFilters}
            placeholder="Clientes"
            className="w-[200px]"
          />
        </AdvancedFilterBar>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total de Pedidos" value={formatNumber(kpis.total)} icon={FileText} variationType="neutral" variation="registros" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={DollarSign} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Aprovados" value={formatNumber(kpis.aprovados)} icon={CheckCircle} variationType="positive" variation="aguardando operação" />
          <SummaryCard title="Em Andamento" value={formatNumber(kpis.emAndamento)} icon={Truck} variationType="positive" variation="separação / transporte" />
        </div>

        <DataTable columns={columns} data={filteredData} loading={loading} onView={handleView} />
      </ModulePage>

      <ViewDrawerV2
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Pedido ${selected?.numero}`}
        badge={selected ? <StatusBadge status={selected.status} label={statusOperacionalLabels[selected.status]} /> : undefined}
        tabs={selected ? [
          {
            value: "dados", label: "Dados", content: (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Número"><span className="font-mono">{selected.numero}</span></ViewField>
                  <ViewField label="Emissão">{formatDate(selected.data_emissao)}</ViewField>
                  <ViewField label="PO Cliente">{selected.po_number || "—"}</ViewField>
                  <ViewField label="Total"><span className="font-semibold font-mono">{formatCurrency(selected.valor_total)}</span></ViewField>
                </div>
                <ViewField label="Cliente">
                  {selected.clientes?.nome_razao_social ? (
                    <RelationalLink type="cliente" id={selected.cliente_id}>{selected.clientes.nome_razao_social}</RelationalLink>
                  ) : "—"}
                </ViewField>
                {selected.cotacao_id && (
                  <ViewField label="Cotação de Origem">
                    <RelationalLink type="orcamento" id={selected.cotacao_id}>
                      {selected.orcamentos?.numero || "Ver cotação"}
                    </RelationalLink>
                  </ViewField>
                )}
              </div>
            )
          },
          {
            value: "logistica",
            label: "Logística",
            content: (
              <LogisticaRastreioSection ordemVendaId={selected.id} />
            )
          }
        ] : []}
      />

      <ConfirmDialog
        open={!!generatingNfId}
        onClose={() => setGeneratingNfId(null)}
        onConfirm={() => {
          const pedido = data.find(o => o.id === generatingNfId);
          if (pedido) handleGenerateNF(pedido);
        }}
        title="Gerar Nota Fiscal"
        description={`Deseja gerar uma Nota Fiscal de saída para o Pedido ${data.find(o => o.id === generatingNfId)?.numero || ""}? Todos os itens serão incluídos.`}
      />
    </AppLayout>
  );
};

export default Pedidos;
