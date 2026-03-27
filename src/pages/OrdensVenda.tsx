import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { SummaryCard } from "@/components/SummaryCard";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, FileOutput } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { data, loading, remove, fetchData } = useSupabaseCrud<OrdemVenda>({
    table: "ordens_venda", select: "*, clientes(nome_razao_social), orcamentos(numero)",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<OrdemVenda | null>(null);
  const [ovItems, setOvItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [faturamentoFilter, setFaturamentoFilter] = useState<string>("todos");
  const [generatingNfId, setGeneratingNfId] = useState<string | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const totalValue = data.reduce((s, o) => s + Number(o.valor_total || 0), 0);
    const pending = data.filter(o => o.status === "pendente").length;
    const inProgress = data.filter(o => o.status === "aprovada" || o.status === "em_separacao").length;
    return { total, totalValue, pending, inProgress };
  }, [data]);

  const handleView = async (ov: OrdemVenda) => {
    setSelected(ov); setDrawerOpen(true); setLoadingItems(true);
    const { data: items } = await supabase.from("ordens_venda_itens").select("*, produtos(nome)").eq("ordem_venda_id", ov.id);
    setOvItems(items || []); setLoadingItems(false);
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
      if (statusFilter !== "todos" && ov.status !== statusFilter) return false;
      if (faturamentoFilter !== "todos" && ov.status_faturamento !== faturamentoFilter) return false;
      if (!query) return true;
      return [ov.numero, ov.clientes?.nome_razao_social, ov.orcamentos?.numero, ov.observacoes].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, faturamentoFilter, searchTerm, statusFilter]);

  const columns = [
    { key: "numero", label: "Nº OV", render: (o: OrdemVenda) => <span className="mono text-xs font-medium text-primary">{o.numero}</span> },
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
        count={filteredData.length}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por OV, cliente ou cotação..."
        filters={<><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Status comercial" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem>{Object.entries(statusComercialLabels).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}</SelectContent></Select><Select value={faturamentoFilter} onValueChange={setFaturamentoFilter}><SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Faturamento" /></SelectTrigger><SelectContent><SelectItem value="todos">Todo faturamento</SelectItem>{Object.entries(statusFaturamentoLabels).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}</SelectContent></Select></>}
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total de OVs" value={formatNumber(kpis.total)} icon={FileText} variationType="neutral" variation="registros" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={DollarSign} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Pendentes" value={formatNumber(kpis.pending)} icon={Clock} variationType={kpis.pending > 0 ? "negative" : "positive"} variant={kpis.pending > 0 ? "warning" : undefined} variation="aguardando aprovação" />
          <SummaryCard title="Em Andamento" value={formatNumber(kpis.inProgress)} icon={Truck} variationType="positive" variation="aprovadas + separação" />
        </div>

        <DataTable columns={columns} data={filteredData} loading={loading} onView={handleView} />
      </ModulePage>

      <ViewDrawerV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Ordem de Venda"
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Nº OV</span><p className="font-medium mono">{selected.numero}</p></div>
              <div><span className="text-xs text-muted-foreground">Cotação Origem</span><p className="mono text-sm">{selected.orcamentos?.numero || "—"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Cliente</span><p>{selected.clientes?.nome_razao_social || "—"}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Emissão</span><p>{formatDate(selected.data_emissao)}</p></div>
              <div><span className="text-xs text-muted-foreground">Aprovação</span><p>{selected.data_aprovacao ? formatDate(selected.data_aprovacao) : "—"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold mono text-lg">{formatCurrency(Number(selected.valor_total || 0))}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Status Comercial</span><StatusBadge status={selected.status} label={statusComercialLabels[selected.status]} /></div>
              <div>
                <span className="text-xs text-muted-foreground">Faturamento</span>
                <Badge variant="outline" className={`mt-1 ${statusFaturamentoColors[selected.status_faturamento] || ""}`}>
                  {statusFaturamentoLabels[selected.status_faturamento] || selected.status_faturamento}
                </Badge>
              </div>
            </div>
            <div className="pt-2">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Itens</h4>
              {loadingItems ? (
                <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : ovItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item</p>
              ) : (
                <div className="space-y-2">
                  {ovItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-accent/20 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{item.descricao_snapshot || item.produtos?.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground mono">{item.codigo_snapshot || "—"} • {item.quantidade} {item.unidade}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold mono">{formatCurrency(Number(item.valor_total || 0))}</p>
                        <p className="text-xs text-muted-foreground">Fat.: {item.quantidade_faturada || 0}/{item.quantidade}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selected.observacoes && (
              <div className="pt-2">
                <span className="text-xs text-muted-foreground">Observações</span>
                <p className="text-sm mt-1">{selected.observacoes}</p>
              </div>
            )}
            <div className="pt-2 space-y-2">
              {selected.status === "pendente" && (
                <Button onClick={() => { setDrawerOpen(false); handleApprove(selected); }} className="w-full gap-2">
                  <CheckCircle className="w-4 h-4" /> Aprovar OV
                </Button>
              )}
              {(selected.status === "aprovada" || selected.status === "em_separacao") && selected.status_faturamento !== "total" && (
                <Button variant="default" onClick={() => { setDrawerOpen(false); setGeneratingNfId(selected.id); }} className="w-full gap-2">
                  <FileOutput className="w-4 h-4" /> Gerar Nota Fiscal
                </Button>
              )}
            </div>
          </div>
        )}
      </ViewDrawerV2>

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
