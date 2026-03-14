import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber, formatDate, daysSince } from "@/lib/format";
import {
  Package, Users, TrendingUp, DollarSign,
  FileText, AlertTriangle, Truck, ClipboardList, Warehouse
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    produtos: 0, clientes: 0, fornecedores: 0,
    orcamentos: 0, compras: 0, contasReceber: 0,
    contasPagar: 0, contasVencidas: 0,
    totalReceber: 0, totalPagar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrcamentos, setRecentOrcamentos] = useState<any[]>([]);
  const [recentCompras, setRecentCompras] = useState<any[]>([]);
  const [backlogPedidos, setBacklogPedidos] = useState<any[]>([]);
  const [comprasAguardando, setComprasAguardando] = useState<any[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
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
        (supabase as any).from("orcamentos").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("compras").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("tipo", "receber").eq("status", "aberto").eq("ativo", true),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("tipo", "pagar").eq("status", "aberto").eq("ativo", true),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("status", "vencido").eq("ativo", true),
        (supabase as any).from("orcamentos").select("id, numero, valor_total, status, data_orcamento, clientes(nome_razao_social)").eq("ativo", true).order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("compras").select("numero, valor_total, status, data_compra, fornecedores(nome_razao_social)").eq("ativo", true).order("created_at", { ascending: false }).limit(5),
        // Backlog: orçamentos confirmados (aguardando faturamento)
        (supabase as any).from("orcamentos").select("id, numero, valor_total, data_orcamento, clientes(nome_razao_social)").eq("ativo", true).eq("status", "confirmado").order("data_orcamento", { ascending: true }).limit(10),
        // Compras aguardando chegada (confirmadas sem data_entrega_real)
        (supabase as any).from("compras").select("id, numero, valor_total, data_compra, data_entrega_prevista, fornecedores(nome_razao_social)").eq("ativo", true).eq("status", "confirmado").is("data_entrega_real", null).order("data_entrega_prevista", { ascending: true }).limit(10),
        // Produtos com estoque abaixo do mínimo
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
      setBacklogPedidos(backlog || []);
      setComprasAguardando(compAguardando || []);
      // Filter products where estoque_atual <= estoque_minimo
      setEstoqueBaixo(
        (estMin || []).filter((p: any) => p.estoque_minimo > 0 && (p.estoque_atual ?? 0) <= p.estoque_minimo)
      );
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    {
      title: "Contas a Receber",
      value: formatCurrency(stats.totalReceber),
      icon: TrendingUp,
      path: "/financeiro?tipo=receber",
      change: `${formatNumber(stats.contasReceber)} em aberto`,
      changeType: "positive" as const,
    },
    {
      title: "Contas a Pagar",
      value: formatCurrency(stats.totalPagar),
      icon: DollarSign,
      path: "/financeiro?tipo=pagar",
      change: stats.contasVencidas > 0 ? `${formatNumber(stats.contasVencidas)} vencidas` : "Nenhuma vencida",
      changeType: stats.contasVencidas > 0 ? ("negative" as const) : ("positive" as const),
    },
    {
      title: "Produtos Ativos",
      value: formatNumber(stats.produtos),
      icon: Package,
      path: "/produtos",
      change: `${formatNumber(stats.produtos)} cadastrados`,
      changeType: "neutral" as const,
    },
    {
      title: "Clientes Ativos",
      value: formatNumber(stats.clientes),
      icon: Users,
      path: "/clientes",
      change: `${formatNumber(stats.clientes)} cadastrados`,
      changeType: "neutral" as const,
    },
  ];

  const stockPie = [
    { name: "Orçamentos", value: stats.orcamentos || 1, color: "hsl(var(--primary))" },
    { name: "Compras", value: stats.compras || 1, color: "hsl(var(--secondary))" },
    { name: "Fornecedores", value: stats.fornecedores || 1, color: "hsl(var(--success))" },
  ];

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema ERP AviZee</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.title} className="cursor-pointer" onClick={() => navigate(c.path)}>
            <StatCard title={c.title} value={c.value} change={c.change} changeType={c.changeType} icon={c.icon} />
          </div>
        ))}
      </div>

      {/* Alert Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Backlog - Pedidos confirmados aguardando faturamento */}
        <div
          className="stat-card cursor-pointer border-l-4 border-l-warning"
          onClick={() => navigate("/orcamentos")}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Aguardando Faturamento</p>
              <p className="text-2xl font-bold mt-1 mono">{formatNumber(backlogPedidos.length)}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                {backlogPedidos.length > 0
                  ? `Total: ${formatCurrency(backlogPedidos.reduce((s, o) => s + Number(o.valor_total || 0), 0))}`
                  : "Nenhum pedido pendente"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10">
              <ClipboardList className="w-5 h-5 text-warning" />
            </div>
          </div>
        </div>

        {/* Compras aguardando chegada */}
        <div
          className="stat-card cursor-pointer border-l-4 border-l-info"
          onClick={() => navigate("/compras")}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Compras Aguardando</p>
              <p className="text-2xl font-bold mt-1 mono">{formatNumber(comprasAguardando.length)}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                {comprasAguardando.length > 0
                  ? `Total: ${formatCurrency(comprasAguardando.reduce((s, c) => s + Number(c.valor_total || 0), 0))}`
                  : "Nenhuma pendente"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-info/10">
              <Truck className="w-5 h-5 text-info" />
            </div>
          </div>
        </div>

        {/* Estoque mínimo */}
        <div
          className="stat-card cursor-pointer border-l-4 border-l-destructive"
          onClick={() => navigate("/estoque")}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Estoque Mínimo</p>
              <p className="text-2xl font-bold mt-1 mono">{formatNumber(estoqueBaixo.length)}</p>
              <p className="text-xs mt-1 text-destructive font-medium">
                {estoqueBaixo.length > 0
                  ? `${estoqueBaixo.length} produto(s) abaixo do mínimo`
                  : "Estoque OK"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </div>
        </div>
      </div>

      {/* Backlog Detail + Estoque Baixo Detail */}
      {(backlogPedidos.length > 0 || estoqueBaixo.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Backlog detail */}
          {backlogPedidos.length > 0 && (
            <div className="bg-card rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-warning" />
                  Pedidos Aguardando Faturamento
                </h3>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {backlogPedidos.map((o: any) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between py-2 px-2 border-b last:border-b-0 hover:bg-muted/20 rounded cursor-pointer"
                    onClick={() => navigate(`/orcamentos/${o.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium mono">{o.numero}</p>
                      <p className="text-xs text-muted-foreground">{o.clientes?.nome_razao_social || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold mono">{formatCurrency(Number(o.valor_total || 0))}</p>
                      <p className="text-xs text-warning font-medium">{daysSince(o.data_orcamento)} dias</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estoque Baixo detail */}
          {estoqueBaixo.length > 0 && (
            <div className="bg-card rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Produtos Abaixo do Estoque Mínimo
                </h3>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {estoqueBaixo.slice(0, 10).map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 px-2 border-b last:border-b-0 hover:bg-muted/20 rounded cursor-pointer"
                    onClick={() => navigate("/estoque")}
                  >
                    <div>
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground mono">{p.codigo_interno || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm mono">
                        <span className="text-destructive font-bold">{formatNumber(p.estoque_atual ?? 0)}</span>
                        <span className="text-muted-foreground"> / {formatNumber(p.estoque_minimo)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{p.unidade_medida}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Recent Orcamentos */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Últimos Orçamentos</h3>
            <button onClick={() => navigate("/orcamentos")} className="text-xs text-primary hover:underline">Ver todos →</button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : recentOrcamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum orçamento encontrado</p>
          ) : (
            <div className="space-y-2">
              {recentOrcamentos.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-b-0 hover:bg-muted/20 px-2 rounded cursor-pointer" onClick={() => navigate(`/orcamentos/${o.id}`)}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium mono">{o.numero}</p>
                      <p className="text-xs text-muted-foreground">{o.clientes?.nome_razao_social || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold mono">{formatCurrency(Number(o.valor_total || 0))}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.data_orcamento)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Pie */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold text-foreground mb-4">Resumo Geral</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stockPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {stockPie.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {stockPie.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium mono">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Compras */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Últimas Compras</h3>
          <button onClick={() => navigate("/compras")} className="text-xs text-primary hover:underline">Ver todas →</button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : recentCompras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma compra encontrada</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentCompras.map((c: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-3 hover:bg-muted/20 cursor-pointer" onClick={() => navigate("/compras")}>
                <div className="flex justify-between items-center mb-1">
                  <span className="mono text-xs font-medium text-primary">{c.numero}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(c.data_compra)}</span>
                </div>
                <p className="text-sm truncate">{c.fornecedores?.nome_razao_social || "—"}</p>
                <p className="mono font-semibold text-sm mt-1">{formatCurrency(Number(c.valor_total || 0))}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
