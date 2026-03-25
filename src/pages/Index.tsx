import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SummaryCard } from "@/components/SummaryCard";
import { PeriodFilter, financialPeriods, Period } from "@/components/dashboard/PeriodFilter";
import { AlertCards } from "@/components/dashboard/AlertCards";
import { BacklogDetail } from "@/components/dashboard/BacklogDetail";
import { EstoqueBaixoDetail } from "@/components/dashboard/EstoqueBaixoDetail";
import { ComprasConfirmadasDetail } from "@/components/dashboard/ComprasConfirmadasDetail";
import { RecentOrcamentos } from "@/components/dashboard/RecentOrcamentos";
import { RecentCompras } from "@/components/dashboard/RecentCompras";
import { SummaryPie } from "@/components/dashboard/SummaryPie";
import { supabase } from "@/integrations/supabase/client";
import { periodToFinancialRange } from "@/lib/periodFilter";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Package, Users, TrendingUp, DollarSign } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState({
    produtos: 0, clientes: 0, fornecedores: 0,
    orcamentos: 0, compras: 0, contasReceber: 0,
    contasPagar: 0, contasVencidas: 0,
    totalReceber: 0, totalPagar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrcamentos, setRecentOrcamentos] = useState<any[]>([]);
  const [recentCompras, setRecentCompras] = useState<any[]>([]);
  const [backlogOVs, setBacklogOVs] = useState<any[]>([]);
  const [comprasAguardando, setComprasAguardando] = useState<any[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { dateFrom, dateTo } = periodToFinancialRange(period);
      const isVencidos = period === 'vencidos';
      const today = new Date().toISOString().slice(0, 10);

      const isTodos = period === 'todos';

      // Build financial queries based on period (forward-looking)
      const buildFinQuery = (tipo: string) => {
        let q = (supabase as any).from("financeiro_lancamentos").select("valor").eq("tipo", tipo).eq("ativo", true);
        if (isVencidos) {
          q = q.in("status", ["aberto", "vencido"]).lt("data_vencimento", today);
        } else if (isTodos) {
          q = q.in("status", ["aberto", "vencido"]);
        } else {
          q = q.eq("status", "aberto").gte("data_vencimento", dateFrom);
          if (dateTo) q = q.lte("data_vencimento", dateTo);
        }
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
      ] = await Promise.all([
        (supabase as any).from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("clientes").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("fornecedores").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("orcamentos").select("*", { count: "exact", head: true }).eq("ativo", true).gte("data_orcamento", dateFrom),
        (supabase as any).from("compras").select("*", { count: "exact", head: true }).eq("ativo", true).gte("data_compra", dateFrom),
        buildFinQuery("receber"),
        buildFinQuery("pagar"),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("status", "vencido").eq("ativo", true),
        (supabase as any).from("orcamentos").select("id, numero, valor_total, status, data_orcamento, clientes(nome_razao_social)").eq("ativo", true).gte("data_orcamento", dateFrom).order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("compras").select("numero, valor_total, status, data_compra, fornecedores(nome_razao_social)").eq("ativo", true).gte("data_compra", dateFrom).order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("ordens_venda")
          .select("id, numero, valor_total, data_emissao, data_prometida_despacho, prazo_despacho_dias, status, status_faturamento, clientes(nome_razao_social)")
          .eq("ativo", true)
          .in("status", ["aprovada", "em_separacao"])
          .in("status_faturamento", ["aguardando", "parcial"])
          .order("data_emissao", { ascending: true }).limit(15),
        (supabase as any).from("compras").select("id, numero, valor_total, data_compra, data_entrega_prevista, fornecedores(nome_razao_social)").eq("ativo", true).eq("status", "confirmado").is("data_entrega_real", null).order("data_entrega_prevista", { ascending: true }).limit(10),
        (supabase as any).from("produtos").select("id, nome, codigo_interno, estoque_atual, estoque_minimo, unidade_medida").eq("ativo", true).not("estoque_minimo", "is", null).limit(100),
      ]);

      setStats({
        produtos: produtos || 0, clientes: clientes || 0, fornecedores: fornecedores || 0,
        orcamentos: orcamentos || 0, compras: compras || 0,
        totalReceber: (receber || []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0),
        totalPagar: (pagar || []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0),
        contasVencidas: (vencidas || []).length,
        contasReceber: (receber || []).length,
        contasPagar: (pagar || []).length,
      });
      setRecentOrcamentos(orcRecent || []);
      setRecentCompras(compRecent || []);
      setBacklogOVs(backlog || []);
      setComprasAguardando(compAguardando || []);
      setEstoqueBaixo(
        (estMin || []).filter((p: any) => p.estoque_minimo > 0 && (p.estoque_atual ?? 0) <= p.estoque_minimo)
      );
      setLoading(false);
    };
    load();
  }, [period]);

  const kpiCards = [
    {
      title: "Contas a Receber",
      value: formatCurrency(stats.totalReceber),
      icon: TrendingUp,
      path: "/financeiro?tipo=receber",
      variation: `${formatNumber(stats.contasReceber)} em aberto`,
      variationType: "positive" as const,
    },
    {
      title: "Contas a Pagar",
      value: formatCurrency(stats.totalPagar),
      icon: DollarSign,
      path: "/financeiro?tipo=pagar",
      variation: stats.contasVencidas > 0 ? `${formatNumber(stats.contasVencidas)} vencidas` : "Nenhuma vencida",
      variationType: stats.contasVencidas > 0 ? ("negative" as const) : ("positive" as const),
    },
    {
      title: "Produtos Ativos",
      value: formatNumber(stats.produtos),
      icon: Package,
      path: "/produtos",
      variation: `${formatNumber(stats.produtos)} cadastrados`,
      variationType: "neutral" as const,
    },
    {
      title: "Clientes Ativos",
      value: formatNumber(stats.clientes),
      icon: Users,
      path: "/clientes",
      variation: `${formatNumber(stats.clientes)} cadastrados`,
      variationType: "neutral" as const,
    },
  ];

  const stockPie = [
    { name: "Orçamentos", value: stats.orcamentos || 1, color: "hsl(var(--primary))" },
    { name: "Compras", value: stats.compras || 1, color: "hsl(var(--secondary))" },
    { name: "Fornecedores", value: stats.fornecedores || 1, color: "hsl(var(--success))" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema ERP AviZee</p>
        </div>
      </div>

      {/* Financial KPIs with period filter */}
      <div className="mb-6 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contas a Receber / Pagar</h2>
          <PeriodFilter value={period} onChange={setPeriod} options={financialPeriods} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">O filtro de período se aplica apenas aos cards abaixo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((c) => (
            <SummaryCard
              key={c.title}
              title={c.title}
              value={c.value}
              variation={c.variation}
              variationType={c.variationType}
              icon={c.icon}
              onClick={() => navigate(c.path)}
            />
          ))}
        </div>
      </div>

      <AlertCards
        backlogCount={backlogOVs.length}
        backlogTotal={backlogOVs.reduce((s, o) => s + Number(o.valor_total || 0), 0)}
        comprasCount={comprasAguardando.length}
        comprasTotal={comprasAguardando.reduce((s, c) => s + Number(c.valor_total || 0), 0)}
        estoqueBaixoCount={estoqueBaixo.length}
      />

      {(backlogOVs.length > 0 || estoqueBaixo.length > 0 || comprasAguardando.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <BacklogDetail items={backlogOVs} />
          <ComprasConfirmadasDetail items={comprasAguardando} />
          {estoqueBaixo.length > 0 && <EstoqueBaixoDetail items={estoqueBaixo} />}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <RecentOrcamentos items={recentOrcamentos} loading={loading} />
        <SummaryPie data={stockPie} />
      </div>

      <RecentCompras items={recentCompras} loading={loading} />
    </AppLayout>
  );
};

export default Dashboard;
