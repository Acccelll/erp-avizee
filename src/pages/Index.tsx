import { useEffect, useMemo, useState, useCallback } from "react";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { SummaryCard } from "@/components/SummaryCard";
import { AlertCards } from "@/components/dashboard/AlertCards";
import { BacklogDetail } from "@/components/dashboard/BacklogDetail";
import { EstoqueBaixoDetail } from "@/components/dashboard/EstoqueBaixoDetail";
import { ComprasConfirmadasDetail } from "@/components/dashboard/ComprasConfirmadasDetail";
import { RecentOrcamentos } from "@/components/dashboard/RecentOrcamentos";
import { RecentCompras } from "@/components/dashboard/RecentCompras";
import { SummaryPie } from "@/components/dashboard/SummaryPie";
import { FluxoCaixaChart } from "@/components/dashboard/FluxoCaixaChart";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ViewDrawerV2 } from "@/components/ViewDrawerV2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardPeriodProvider, useDashboardPeriod, type DashboardPeriod } from "@/contexts/DashboardPeriodContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CalendarRange, DollarSign, Package, TrendingUp, Users } from "lucide-react";

interface DashboardGridItem {
  id: string;
  span: string;
  render: () => JSX.Element;
}

const defaultLayout = [
  "welcome",
  "revenue",
  "kpis",
  "alerts",
  "details",
  "orc-pie",
  "cash-compras",
] as const;

const DashboardContent = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { period: globalPeriod, setPeriod: setGlobalPeriod, customStart, customEnd, setCustomStart, setCustomEnd, range: globalRange } = useDashboardPeriod();
  const { value: savedLayout, save: saveLayoutPref } = useUserPreference<string[]>(user?.id, "dashboard_layout", [...defaultLayout]);
  const [layout, setLayout] = useState<string[]>([...defaultLayout]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [metricDrawer, setMetricDrawer] = useState<null | "receber" | "estoque" | "vendas">(null);

  const [stats, setStats] = useState({
    produtos: 0,
    clientes: 0,
    fornecedores: 0,
    orcamentos: 0,
    compras: 0,
    contasReceber: 0,
    contasPagar: 0,
    contasVencidas: 0,
    totalReceber: 0,
    totalPagar: 0,
  });
  const [ovStats, setOvStats] = useState({ pendente: 0, aprovada: 0, em_separacao: 0, faturada: 0 });
  const [faturamento, setFaturamento] = useState({ mesAtual: 0, mesAnterior: 0 });
  const [loading, setLoading] = useState(true);
  const [recentOrcamentos, setRecentOrcamentos] = useState<any[]>([]);
  const [recentCompras, setRecentCompras] = useState<any[]>([]);
  const [backlogOVs, setBacklogOVs] = useState<any[]>([]);
  const [comprasAguardando, setComprasAguardando] = useState<any[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);
  const [compromissos, setCompromissos] = useState<{ contasHoje: number; entregasPendentes: number }>({ contasHoje: 0, entregasPendentes: 0 });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);


  useEffect(() => {
    if (Array.isArray(savedLayout) && savedLayout.length > 0) {
      setLayout(savedLayout.filter((item) => defaultLayout.includes(item)));
    }
  }, [savedLayout]);

  const saveLayout = useCallback(async (nextLayout: string[]) => {
    setLayout(nextLayout);
    await saveLayoutPref(nextLayout);
  }, [saveLayoutPref]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { dateFrom, dateTo } = globalRange;
      const today = new Date().toISOString().slice(0, 10);

      // KPI de saldo pendente (cards): inclui títulos antigos vencidos/abertos.
      // Não aplicar dateFrom para não excluir pendências anteriores ao período.
      const buildFinTotalQuery = (tipo: string) => {
        let q = supabase.from("financeiro_lancamentos").select("valor").eq("tipo", tipo as any).eq("ativo", true);
        q = q.in("status", ["aberto", "vencido"]);
        // Aplica apenas corte superior quando houver data final do período.
        if (dateTo) q = q.lte("data_vencimento", dateTo);
        return q;
      };

      const [
        { count: produtos },
        { count: clientes },
        { count: fornecedores },
        { count: orcamentos },
        { count: compras },
        { data: receber },
        { data: pagar },
        { data: vencidas },
        { data: orcRecent },
        { data: compRecent },
        { data: backlog },
        { data: compAguardando },
        { data: estMin },
        { data: ovData },
        { data: nfAtual },
        { data: nfAnterior },
        { count: contasHoje },
        { count: entregasPendentes },
      ] = await Promise.all([
        supabase.from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("clientes").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("fornecedores").select("*", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("ativo", true).gte("data_orcamento", dateFrom),
        supabase.from("compras").select("*", { count: "exact", head: true }).eq("ativo", true).gte("data_compra", dateFrom),
        buildFinTotalQuery("receber"),
        buildFinTotalQuery("pagar"),
        supabase.from("financeiro_lancamentos").select("valor").eq("status", "vencido").eq("ativo", true),
        supabase.from("orcamentos").select("id, numero, valor_total, status, data_orcamento, clientes(nome_razao_social)").eq("ativo", true).gte("data_orcamento", dateFrom).order("created_at", { ascending: false }).limit(5),
        supabase.from("compras").select("numero, valor_total, status, data_compra, fornecedores(nome_razao_social)").eq("ativo", true).gte("data_compra", dateFrom).order("created_at", { ascending: false }).limit(5),
        supabase
          .from("ordens_venda")
          .select("id, numero, valor_total, data_emissao, data_prometida_despacho, prazo_despacho_dias, status, status_faturamento, clientes(nome_razao_social)")
          .eq("ativo", true)
          .in("status", ["aprovada", "em_separacao"])
          .in("status_faturamento", ["aguardando", "parcial"])
          .order("data_emissao", { ascending: true })
          .limit(15),
        supabase.from("compras").select("id, numero, valor_total, data_compra, data_entrega_prevista, fornecedores(nome_razao_social)").eq("ativo", true).eq("status", "confirmado").is("data_entrega_real", null).order("data_entrega_prevista", { ascending: true }).limit(10),
        supabase.from("produtos").select("id, nome, codigo_interno, estoque_atual, estoque_minimo, unidade_medida").eq("ativo", true).not("estoque_minimo", "is", null).limit(100),
        supabase.from("ordens_venda").select("status").eq("ativo", true),
        (() => {
          const now = new Date();
          const inicioMesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          return supabase.from("notas_fiscais").select("valor_total").eq("ativo", true).eq("tipo", "saida").eq("status", "confirmada").gte("data_emissao", inicioMesAtual);
        })(),
        (() => {
          const now = new Date();
          const inicioMesAnterior = (() => {
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
          })();
          const fimMesAnterior = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          return supabase.from("notas_fiscais").select("valor_total").eq("ativo", true).eq("tipo", "saida").eq("status", "confirmada").gte("data_emissao", inicioMesAnterior).lt("data_emissao", fimMesAnterior);
        })(),
        supabase.from("financeiro_lancamentos").select("id", { count: "exact", head: true }).eq("ativo", true).eq("status", "aberto").eq("data_vencimento", today),
        supabase.from("compras").select("id", { count: "exact", head: true }).eq("ativo", true).eq("status", "confirmado").is("data_entrega_real", null).lte("data_entrega_prevista", today),
      ]);

      setStats({
        produtos: produtos || 0,
        clientes: clientes || 0,
        fornecedores: fornecedores || 0,
        orcamentos: orcamentos || 0,
        compras: compras || 0,
        totalReceber: (receber || []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0),
        totalPagar: (pagar || []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0),
        contasVencidas: (vencidas || []).length,
        contasReceber: (receber || []).length,
        contasPagar: (pagar || []).length,
      });
      setCompromissos({ contasHoje: contasHoje || 0, entregasPendentes: entregasPendentes || 0 });
      setOvStats({
        pendente: (ovData || []).filter((o: any) => o.status === "pendente").length,
        aprovada: (ovData || []).filter((o: any) => o.status === "aprovada").length,
        em_separacao: (ovData || []).filter((o: any) => o.status === "em_separacao").length,
        faturada: (ovData || []).filter((o: any) => o.status === "faturada").length,
      });
      const fatAtual = (nfAtual || []).reduce((s: number, n: any) => s + Number(n.valor_total || 0), 0);
      const fatAnterior = (nfAnterior || []).reduce((s: number, n: any) => s + Number(n.valor_total || 0), 0);
      setFaturamento({ mesAtual: fatAtual, mesAnterior: fatAnterior });
      setRecentOrcamentos(orcRecent || []);
      setRecentCompras(compRecent || []);
      setBacklogOVs(backlog || []);
      setComprasAguardando(compAguardando || []);
      setEstoqueBaixo((estMin || []).filter((p: any) => p.estoque_minimo > 0 && (p.estoque_atual ?? 0) <= p.estoque_minimo));
      setLoading(false);
    };
    load();
  }, [globalRange]);

  const salesDelta = faturamento.mesAnterior > 0 ? ((faturamento.mesAtual - faturamento.mesAnterior) / faturamento.mesAnterior) * 100 : 0;

  const kpiCards = [
    {
      id: "receber",
      title: "Total a Receber",
      value: formatCurrency(stats.totalReceber),
      icon: TrendingUp,
      variation: `${salesDelta >= 0 ? "+" : ""}${salesDelta.toFixed(1)}% vs período anterior`,
      variationType: salesDelta >= 0 ? ("positive" as const) : ("negative" as const),
      variant: stats.contasVencidas > 0 ? ("warning" as const) : ("success" as const),
      sparklineData: [44, 50, 53, 52, 61, 66, 69],
      onClick: () => setMetricDrawer("receber" as const),
    },
    {
      id: "pagar",
      title: "Contas a Pagar",
      value: formatCurrency(stats.totalPagar),
      icon: DollarSign,
      variation: `${formatNumber(stats.contasPagar)} títulos`,
      variationType: stats.contasPagar > 0 ? ("neutral" as const) : ("positive" as const),
      variant: stats.totalPagar > stats.totalReceber ? ("danger" as const) : ("warning" as const),
      sparklineData: [35, 38, 37, 39, 41, 43, 42],
      onClick: () => navigate("/financeiro?tipo=pagar"),
    },
    {
      id: "estoque",
      title: "Estoque Crítico",
      value: formatNumber(estoqueBaixo.length),
      icon: Package,
      variation: `${estoqueBaixo.length > 0 ? "Ação necessária" : "Sem riscos"}`,
      variationType: estoqueBaixo.length > 0 ? ("negative" as const) : ("positive" as const),
      variant: estoqueBaixo.length > 0 ? ("danger" as const) : ("success" as const),
      sparklineData: [18, 17, 15, 14, 12, 9, estoqueBaixo.length],
      onClick: () => setMetricDrawer("estoque" as const),
    },
    {
      id: "vendas",
      title: "Vendas do Mês",
      value: formatCurrency(faturamento.mesAtual),
      icon: Users,
      variation: `${salesDelta >= 0 ? "+" : ""}${salesDelta.toFixed(1)}% vs mês anterior`,
      variationType: salesDelta >= 0 ? ("positive" as const) : ("negative" as const),
      variant: salesDelta >= 0 ? ("success" as const) : ("danger" as const),
      sparklineData: [25, 29, 32, 30, 35, 37, 41],
      onClick: () => setMetricDrawer("vendas" as const),
    },
  ];

  const onDropCard = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = [...layout];
    const from = next.indexOf(draggingId);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    setDraggingId(null);
    saveLayout(next);
  };

  const ovPieData = [
    { name: "Pendente", value: ovStats.pendente || 0, color: "hsl(var(--warning))" },
    { name: "Aprovada", value: ovStats.aprovada || 0, color: "hsl(var(--info))" },
    { name: "Em Separação", value: ovStats.em_separacao || 0, color: "hsl(var(--primary))" },
    { name: "Faturada", value: ovStats.faturada || 0, color: "hsl(var(--success))" },
  ].filter((item) => item.value > 0);

  const gridItems: DashboardGridItem[] = [
    {
      id: "welcome",
      span: "lg:col-span-3",
      render: () => (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">{greeting}, {profile?.nome?.split(" ")[0] || "time"} 👋</h1>
              <p className="text-sm text-muted-foreground">Você tem {compromissos.contasHoje} conta(s) vencendo hoje e {compromissos.entregasPendentes} entrega(s) pendente(s).</p>
            </div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Select value={globalPeriod} onValueChange={(v: DashboardPeriod) => setGlobalPeriod(v)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {globalPeriod === "custom" && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <Label>Data inicial</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div>
                <Label>Data final</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" onClick={() => setGlobalPeriod("custom")}>Aplicar período</Button>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "revenue",
      span: "lg:col-span-3",
      render: () => (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Faturamento</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SummaryCard
              title="Mês Atual"
              value={formatCurrency(faturamento.mesAtual)}
              icon={TrendingUp}
              variation={`${salesDelta >= 0 ? "+" : ""}${salesDelta.toFixed(1)}% vs mês ant.`}
              variationType={salesDelta >= 0 ? "positive" : "negative"}
              variant={salesDelta >= 0 ? "success" : "danger"}
              sparklineData={[20, 23, 27, 25, 28, 33, 36]}
              onClick={() => setMetricDrawer("vendas")}
            />
            <SummaryCard
              title="Mês Anterior"
              value={formatCurrency(faturamento.mesAnterior)}
              icon={DollarSign}
              variation="Referência do período anterior"
              variationType="neutral"
              variant="info"
              sparklineData={[17, 19, 21, 22, 23, 24, 25]}
              onClick={() => navigate("/relatorios")}
            />
          </div>
        </div>
      ),
    },
    {
      id: "kpis",
      span: "lg:col-span-3",
      render: () => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((c) => (
            <SummaryCard key={c.id} {...c} />
          ))}
        </div>
      ),
    },
    {
      id: "alerts",
      span: "lg:col-span-3",
      render: () => (
        <AlertCards
          backlogCount={backlogOVs.length}
          backlogTotal={backlogOVs.reduce((s, o) => s + Number(o.valor_total || 0), 0)}
          comprasCount={comprasAguardando.length}
          comprasTotal={comprasAguardando.reduce((s, c) => s + Number(c.valor_total || 0), 0)}
          estoqueBaixoCount={estoqueBaixo.length}
        />
      ),
    },
    {
      id: "details",
      span: "lg:col-span-3",
      render: () => (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BacklogDetail items={backlogOVs} />
          <ComprasConfirmadasDetail items={comprasAguardando} />
          {estoqueBaixo.length > 0 && <EstoqueBaixoDetail items={estoqueBaixo} />}
        </div>
      ),
    },
    {
      id: "orc-pie",
      span: "lg:col-span-2",
      render: () => (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <RecentOrcamentos items={recentOrcamentos} loading={loading} />
          <SummaryPie data={ovPieData.length > 0 ? ovPieData : [{ name: "Sem OVs", value: 1, color: "hsl(var(--muted))" }]} />
        </div>
      ),
    },
    {
      id: "cash-compras",
      span: "lg:col-span-2",
      render: () => (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FluxoCaixaChart />
          <RecentCompras items={recentCompras} loading={loading} />
        </div>
      ),
    },
  ];

  const detailData = {
    receber: {
      title: "Total a Receber",
      daily: [
        { dia: "Seg", valor: 12000 },
        { dia: "Ter", valor: 18500 },
        { dia: "Qua", valor: 16200 },
        { dia: "Qui", valor: 21100 },
        { dia: "Sex", valor: 19800 },
      ],
      top: [
        { nome: "Cliente A", valor: 32000 },
        { nome: "Cliente B", valor: 22000 },
        { nome: "Cliente C", valor: 14000 },
      ],
    },
    estoque: {
      title: "Estoque Crítico",
      daily: [
        { dia: "Seg", valor: 17 },
        { dia: "Ter", valor: 16 },
        { dia: "Qua", valor: 15 },
        { dia: "Qui", valor: 13 },
        { dia: "Sex", valor: 12 },
      ],
      top: [
        { nome: "SKU-019", valor: 2 },
        { nome: "SKU-130", valor: 3 },
        { nome: "SKU-512", valor: 4 },
      ],
    },
    vendas: {
      title: "Vendas do Mês",
      daily: [
        { dia: "01", valor: 5000 },
        { dia: "05", valor: 9000 },
        { dia: "10", valor: 11500 },
        { dia: "15", valor: 14000 },
        { dia: "20", valor: 18600 },
      ],
      top: [
        { nome: "Produto X", valor: 43000 },
        { nome: "Produto Y", valor: 26000 },
        { nome: "Produto Z", valor: 18000 },
      ],
    },
  } as const;

  if (loading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  const openMetric = metricDrawer ? detailData[metricDrawer] : null;

  return (
    <AppLayout>
      <p className="mb-2 text-xs text-muted-foreground">Arraste e solte os blocos para personalizar seu dashboard.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {layout
          .map((id) => gridItems.find((item) => item.id === id))
          .filter(Boolean)
          .map((item) => (
            <div
              key={item!.id}
              className={item!.span}
              draggable
              onDragStart={() => setDraggingId(item!.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropCard(item!.id)}
            >
              {item!.render()}
            </div>
          ))}
      </div>

      <ViewDrawerV2
        open={!!metricDrawer}
        onClose={() => setMetricDrawer(null)}
        title={openMetric?.title || "Detalhes"}
        tabs={
          openMetric
            ? [
                {
                  value: "evolucao",
                  label: "Evolução diária",
                  content: (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...openMetric.daily]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia" />
                          <YAxis />
                          <Tooltip />
                          <Line dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ),
                },
                {
                  value: "top",
                  label: "Top itens",
                  content: (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...openMetric.top]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nome" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="valor" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ),
                },
              ]
            : []
        }
      />
    </AppLayout>
  );
};

const Dashboard = () => (
  <DashboardPeriodProvider>
    <DashboardContent />
  </DashboardPeriodProvider>
);

export default Dashboard;
