import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { SummaryCard } from "@/components/SummaryCard";
import { AdvancedFilterBar, type FilterChip } from "@/components/AdvancedFilterBar";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, FileOutput } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate, daysSince, formatNumber } from "@/lib/format";
import { CheckCircle, Package, FileText, DollarSign, Clock, Truck } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface OrdemVenda {
  id: string; numero: string; data_emissao: string; cliente_id: string;
  cotacao_id: string; status: string; status_faturamento: string;
  data_aprovacao: string; data_prometida_despacho: string;
  prazo_despacho_dias: number; valor_total: number; observacoes: string;
  po_number: string;
  ativo: boolean;
  clientes?: { nome_razao_social: string };
  orcamentos?: { numero: string };
}

const statusComercialLabels: Record<string, string> = {
  pendente: "Pendente", aprovada: "Aprovada", em_separacao: "Em Separação", cancelada: "Cancelada",
};
const statusFaturamentoLabels: Record<string, string> = {
  aguardando: "Aguardando", parcial: "Parcial", total: "Faturado",
};
const statusFaturamentoColors: Record<string, string> = {
  aguardando: "bg-warning/10 text-warning border-warning/30",
  parcial: "bg-info/10 text-info border-info/30",
  total: "bg-success/10 text-success border-success/30",
};

const OrdensVenda = () => {
  const navigate = useNavigate();
  const { pushView } = useRelationalNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, loading, remove, fetchData } = useSupabaseCrud<OrdemVenda>({
    table: "ordens_venda", select: "*, clientes(nome_razao_social), orcamentos(numero)",
  });
  const [selected, setSelected] = useState<OrdemVenda | null>(null);
  const [ovItems, setOvItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [faturamentoFilters, setFaturamentoFilters] = useState<string[]>([]);
  const [clienteFilters, setClienteFilters] = useState<string[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [generatingNfId, setGeneratingNfId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("clientes").select("id, nome_razao_social").eq("ativo", true).then(({ data }) => setClientesList(data || []));
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const totalValue = data.reduce((s, o) => s + Number(o.valor_total || 0), 0);
    const pending = data.filter(o => o.status === "pendente").length;
    const inProgress = data.filter(o => o.status === "aprovada" || o.status === "em_separacao").length;
    return { total, totalValue, pending, inProgress };
  }, [data]);

  const handleView = (ov: OrdemVenda) => {
    setSelected(ov);
    setDrawerOpen(true);
  };

  const handleApprove = async (ov: OrdemVenda) => {
    try {
      await supabase.from("ordens_venda").update({
        status: "aprovada", data_aprovacao: new Date().toISOString().split("T")[0],
      }).eq("id", ov.id);
      toast.success(`OV ${ov.numero} aprovada!`);
      fetchData();
    } catch (err: any) {
      console.error('[ordens-venda]', err);
      toast.error("Erro ao aprovar ordem de venda.");
    }
  };

  const handleGenerateNF = async (ov: OrdemVenda) => {
    try {
      const { data: ovItems } = await supabase.from("ordens_venda_itens").select("*").eq("ordem_venda_id", ov.id);
      const { count } = await supabase.from("notas_fiscais").select("*", { count: "exact", head: true });
      const nfNumero = String((count || 0) + 1).padStart(6, "0");

      const totalProdutos = (ovItems || []).reduce((s: number, i: any) => s + Number(i.valor_total || 0), 0);

      const { data: newNF, error } = await supabase.from("notas_fiscais").insert({
        numero: nfNumero,
        tipo: "saida",
        data_emissao: new Date().toISOString().split("T")[0],
        cliente_id: ov.cliente_id,
        ordem_venda_id: ov.id,
        valor_total: totalProdutos,
        status: "pendente",
        movimenta_estoque: true,
        gera_financeiro: true,
        observacoes: `Gerada a partir da OV ${ov.numero}`,
      }).select().single();

      if (error) throw error;

      if (ovItems && ovItems.length > 0 && newNF) {
        const nfItems = ovItems.map((i: any) => ({
          nota_fiscal_id: newNF.id,
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
        }));
        await supabase.from("notas_fiscais_itens").insert(nfItems);
      }

      // Update OV faturamento status
      const totalQtd = (ovItems || []).reduce((s: number, i: any) => s + Number(i.quantidade || 0), 0);
      const totalFat = (ovItems || []).reduce((s: number, i: any) => s + Number(i.quantidade_faturada || 0), 0);
      const newFatStatus = (totalFat + totalQtd >= totalQtd * 2) ? "total" : totalFat > 0 ? "parcial" : "total";
      
      await supabase.from("ordens_venda").update({ status_faturamento: "total" }).eq("id", ov.id);

      // Update quantities faturadas
      if (ovItems) {
        for (const item of ovItems) {
          await supabase.from("ordens_venda_itens").update({
            quantidade_faturada: item.quantidade,
          }).eq("id", item.id);
        }
      }

      toast.success(`NF ${nfNumero} gerada a partir da OV ${ov.numero}!`);
      fetchData();
    } catch (err: any) {
      console.error('[ordens-venda] gerar NF:', err);
      toast.error("Erro ao gerar Nota Fiscal.");
    } finally {
      setGeneratingNfId(null);
    }
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((ov) => {
      if (statusFilters.length > 0 && !statusFilters.includes(ov.status)) return false;
      if (faturamentoFilters.length > 0 && !faturamentoFilters.includes(ov.status_faturamento)) return false;
      if (clienteFilters.length > 0 && !clienteFilters.includes(ov.cliente_id || "")) return false;

      if (!query) return true;
      return [ov.numero, ov.clientes?.nome_razao_social, ov.orcamentos?.numero, ov.observacoes].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, faturamentoFilters, searchTerm, statusFilters, clienteFilters]);

  const ovActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    statusFilters.forEach(f => {
      chips.push({ key: "status", label: "Status", value: [f], displayValue: statusComercialLabels[f] || f });
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

  const handleRemoveOvFilter = (key: string, value?: string) => {
    if (key === "status") setStatusFilters(prev => prev.filter(v => v !== value));
    if (key === "faturamento") setFaturamentoFilters(prev => prev.filter(v => v !== value));
    if (key === "cliente") setClienteFilters(prev => prev.filter(v => v !== value));
  };

  const statusOptions: MultiSelectOption[] = Object.entries(statusComercialLabels).map(([k, v]) => ({ label: v, value: k }));
  const faturamentoOptions: MultiSelectOption[] = Object.entries(statusFaturamentoLabels).map(([k, v]) => ({ label: v, value: k }));
  const clienteOptions: MultiSelectOption[] = clientesList.map(c => ({ label: c.nome_razao_social, value: c.id }));

  const columns = [
    { key: "numero", label: "Nº OV", render: (o: OrdemVenda) => <span className="mono text-xs font-medium text-primary">{o.numero}</span> },
    { key: "po_number", label: "PO Cliente", render: (o: OrdemVenda) => o.po_number ? <span className="mono text-xs">{o.po_number}</span> : "—" },
    { key: "cotacao", label: "Cotação", render: (o: OrdemVenda) => o.orcamentos?.numero ? <span className="mono text-xs">{o.orcamentos.numero}</span> : "—" },
    { key: "cliente", label: "Cliente", render: (o: OrdemVenda) => o.clientes?.nome_razao_social || "—" },
    { key: "data_emissao", label: "Emissão", render: (o: OrdemVenda) => formatDate(o.data_emissao) },
    { key: "valor_total", label: "Total", render: (o: OrdemVenda) => <span className="font-semibold mono">{formatCurrency(Number(o.valor_total || 0))}</span> },
    { key: "status", label: "Status", render: (o: OrdemVenda) => <StatusBadge status={o.status} label={statusComercialLabels[o.status]} /> },
    {
      key: "faturamento", label: "Faturamento", render: (o: OrdemVenda) => (
        <Badge variant="outline" className={`text-xs ${statusFaturamentoColors[o.status_faturamento] || ""}`}>
          {statusFaturamentoLabels[o.status_faturamento] || o.status_faturamento}
        </Badge>
      ),
    },
    {
      key: "dias", label: "Dias", render: (o: OrdemVenda) => {
        const dias = daysSince(o.data_emissao);
        return <span className={`mono text-xs ${dias > 7 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{dias}d</span>;
      },
    },
    {
      key: "acoes_ov", label: "Ações", sortable: false, render: (o: OrdemVenda) => (
        <div className="flex gap-1">
          {o.status === "pendente" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleApprove(o); }}>
              <CheckCircle className="w-3 h-3" /> Aprovar
            </Button>
          )}
          {(o.status === "aprovada" || o.status === "em_separacao") && o.status_faturamento !== "total" && (
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setGeneratingNfId(o.id); }}>
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
        title="Ordens de Venda"
        subtitle="Gestão de pedidos comerciais e faturamento"
      >
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por OV, cliente ou cotação..."
          activeFilters={ovActiveFilters}
          onRemoveFilter={handleRemoveOvFilter}
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
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total de OVs" value={formatNumber(kpis.total)} icon={FileText} variationType="neutral" variation="registros" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={DollarSign} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Pendentes" value={formatNumber(kpis.pending)} icon={Clock} variationType={kpis.pending > 0 ? "negative" : "positive"} variant={kpis.pending > 0 ? "warning" : undefined} variation="aguardando aprovação" />
          <SummaryCard title="Em Andamento" value={formatNumber(kpis.inProgress)} icon={Truck} variationType="positive" variation="aprovadas + separação" />
        </div>

        <DataTable columns={columns} data={filteredData} loading={loading} onView={handleView} />
      </ModulePage>

      <ViewDrawerV2
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`OV ${selected?.numero}`}
        badge={selected ? <StatusBadge status={selected.status} label={statusComercialLabels[selected.status]} /> : undefined}
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
                {selected.orcamentos?.numero && (
                  <ViewField label="Cotação Origem">
                    <RelationalLink type="orcamento" id={selected.cotacao_id}>{selected.orcamentos.numero}</RelationalLink>
                  </ViewField>
                )}
              </div>
            )
          }
        ] : []}
      />

      <ConfirmDialog
        open={!!generatingNfId}
        onClose={() => setGeneratingNfId(null)}
        onConfirm={() => {
          const ov = data.find(o => o.id === generatingNfId);
          if (ov) handleGenerateNF(ov);
        }}
        title="Gerar Nota Fiscal"
        description={`Deseja gerar uma Nota Fiscal de saída para a OV ${data.find(o => o.id === generatingNfId)?.numero || ""}? Todos os itens serão incluídos.`}
      />
    </AppLayout>
  );
};

export default OrdensVenda;
