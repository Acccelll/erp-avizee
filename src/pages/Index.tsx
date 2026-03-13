import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Users, ShoppingCart, DollarSign, TrendingUp,
  FileText, AlertTriangle, ArrowUpRight, ArrowDownRight, Warehouse
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
      ] = await Promise.all([
        (supabase as any).from("produtos").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("clientes").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("fornecedores").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("orcamentos").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("compras").select("*", { count: "exact", head: true }).eq("ativo", true),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("tipo", "receber").eq("status", "aberto").eq("ativo", true),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("tipo", "pagar").eq("status", "aberto").eq("ativo", true),
        (supabase as any).from("financeiro_lancamentos").select("valor").eq("status", "vencido").eq("ativo", true),
        (supabase as any).from("orcamentos").select("numero, valor_total, status, data_orcamento, clientes(nome_razao_social)").eq("ativo", true).order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("compras").select("numero, valor_total, status, data_compra, fornecedores(nome_razao_social)").eq("ativo", true).order("created_at", { ascending: false }).limit(5),
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
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { title: "Produtos Ativos", value: stats.produtos, icon: Package, path: "/produtos", change: `${stats.produtos} cadastrados`, changeType: "neutral" as const },
    { title: "Clientes Ativos", value: stats.clientes, icon: Users, path: "/clientes", change: `${stats.clientes} cadastrados`, changeType: "neutral" as const },
    { title: "Contas a Receber", value: `R$ ${stats.totalReceber.toFixed(2)}`, icon: TrendingUp, path: "/financeiro", change: `${stats.contasReceber} em aberto`, changeType: "positive" as const },
    { title: "Contas a Pagar", value: `R$ ${stats.totalPagar.toFixed(2)}`, icon: DollarSign, path: "/financeiro", change: stats.contasVencidas > 0 ? `${stats.contasVencidas} vencidas` : "Nenhuma vencida", changeType: stats.contasVencidas > 0 ? "negative" as const : "positive" as const },
  ];

  const stockPie = [
    { name: "Orçamentos", value: stats.orcamentos || 1, color: "hsl(2, 100%, 21%)" },
    { name: "Compras", value: stats.compras || 1, color: "hsl(21, 63%, 44%)" },
    { name: "Fornecedores", value: stats.fornecedores || 1, color: "hsl(160, 60%, 36%)" },
  ];

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema ERP AviZee</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.title} className="cursor-pointer" onClick={() => navigate(c.path)}>
            <StatCard title={c.title} value={String(c.value)} change={c.change} changeType={c.changeType} icon={c.icon} />
          </div>
        ))}
      </div>

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
              {recentOrcamentos.map((o: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0 hover:bg-muted/20 px-2 rounded cursor-pointer" onClick={() => navigate(`/orcamentos/${o.id}`)}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium font-mono">{o.numero}</p>
                      <p className="text-xs text-muted-foreground">{o.clientes?.nome_razao_social || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">R$ {Number(o.valor_total || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.data_orcamento).toLocaleDateString("pt-BR")}</p>
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
                <span className="font-medium">{item.value}</span>
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
                  <span className="font-mono text-xs font-medium text-primary">{c.numero}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.data_compra).toLocaleDateString("pt-BR")}</span>
                </div>
                <p className="text-sm truncate">{c.fornecedores?.nome_razao_social || "—"}</p>
                <p className="font-mono font-semibold text-sm mt-1">R$ {Number(c.valor_total || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
