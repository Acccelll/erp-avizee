import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SummaryCard } from "@/components/SummaryCard";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Lancamento {
  id: string; tipo: string; valor: number; status: string;
  data_vencimento: string; data_pagamento: string | null;
  conta_bancaria_id: string | null; descricao: string;
  contas_bancarias?: { descricao: string; bancos?: { nome: string } } | null;
}

interface ContaBancaria {
  id: string; descricao: string; saldo_atual: number;
  bancos?: { nome: string };
}

type Periodicidade = "diaria" | "semanal" | "mensal";

const FluxoCaixa = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("diaria");
  const [filterBanco, setFilterBanco] = useState("todos");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1, 0);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: lancs }, { data: contas }] = await Promise.all([
        (supabase as any).from("financeiro_lancamentos")
          .select("id, tipo, valor, status, data_vencimento, data_pagamento, conta_bancaria_id, descricao, contas_bancarias(descricao, bancos(nome))")
          .eq("ativo", true)
          .gte("data_vencimento", dataInicio)
          .lte("data_vencimento", dataFim),
        (supabase as any).from("contas_bancarias").select("*, bancos(nome)").eq("ativo", true),
      ]);
      setLancamentos(lancs || []);
      setContasBancarias(contas || []);
      setLoading(false);
    };
    load();
  }, [dataInicio, dataFim]);

  const filtered = useMemo(() => {
    if (filterBanco === "todos") return lancamentos;
    return lancamentos.filter(l => l.conta_bancaria_id === filterBanco);
  }, [lancamentos, filterBanco]);

  const grouped = useMemo(() => {
    const groups: Record<string, { prevReceber: number; prevPagar: number; realReceber: number; realPagar: number; items: Lancamento[] }> = {};

    const getKey = (dateStr: string): string => {
      const d = new Date(dateStr + "T00:00:00");
      if (periodicidade === "diaria") return d.toISOString().split("T")[0];
      if (periodicidade === "semanal") {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        return `Sem ${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
      }
      return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    };

    filtered.forEach(l => {
      const key = getKey(l.data_vencimento);
      if (!groups[key]) groups[key] = { prevReceber: 0, prevPagar: 0, realReceber: 0, realPagar: 0, items: [] };
      const g = groups[key];
      g.items.push(l);
      const val = Number(l.valor || 0);
      if (l.tipo === "receber") {
        g.prevReceber += val;
        if (l.status === "pago") g.realReceber += val;
      } else {
        g.prevPagar += val;
        if (l.status === "pago") g.realPagar += val;
      }
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, periodicidade]);

  const totals = useMemo(() => {
    let prevReceber = 0, prevPagar = 0, realReceber = 0, realPagar = 0;
    filtered.forEach(l => {
      const val = Number(l.valor || 0);
      if (l.tipo === "receber") { prevReceber += val; if (l.status === "pago") realReceber += val; }
      else { prevPagar += val; if (l.status === "pago") realPagar += val; }
    });
    return { prevReceber, prevPagar, realReceber, realPagar, saldoPrevisto: prevReceber - prevPagar, saldoRealizado: realReceber - realPagar };
  }, [filtered]);

  // Chart data
  const chartData = useMemo(() => {
    let saldoAcumPrev = 0;
    let saldoAcumReal = 0;
    return grouped.map(([key, g]) => {
      saldoAcumPrev += (g.prevReceber - g.prevPagar);
      saldoAcumReal += (g.realReceber - g.realPagar);
      const label = periodicidade === "diaria"
        ? new Date(key + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        : key;
      return { name: label, previsto: saldoAcumPrev, realizado: saldoAcumReal };
    });
  }, [grouped, periodicidade]);

  // Risk detection
  const hasNegativeRisk = chartData.some(d => d.previsto < 0);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="page-title">Fluxo de Caixa</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada de entradas e saídas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Entradas Previstas" value={formatCurrency(totals.prevReceber)} subtitle={`Realizado: ${formatCurrency(totals.realReceber)}`} icon={TrendingUp} variant="success" />
        <SummaryCard title="Saídas Previstas" value={formatCurrency(totals.prevPagar)} subtitle={`Realizado: ${formatCurrency(totals.realPagar)}`} icon={TrendingDown} variant="danger" />
        <SummaryCard title="Saldo Previsto" value={formatCurrency(totals.saldoPrevisto)} icon={Wallet} variant={totals.saldoPrevisto >= 0 ? "success" : "danger"} />
        <SummaryCard title="Saldo Realizado" value={formatCurrency(totals.saldoRealizado)} icon={Wallet} variant={totals.saldoRealizado >= 0 ? "info" : "danger"} />
      </div>

      {/* Risk alert */}
      {hasNegativeRisk && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">Atenção: o saldo previsto ficará negativo em algum período. Considere antecipar recebíveis ou postergar pagamentos.</span>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saldo Acumulado — Previsto vs Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="previsto" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Previsto" />
                  <Area type="monotone" dataKey="realizado" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" strokeWidth={2} name="Realizado" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-card rounded-xl border">
        <div className="space-y-1">
          <Label className="text-xs">Período de</Label>
          <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">até</Label>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Periodicidade</Label>
          <div className="flex gap-1">
            {(["diaria", "semanal", "mensal"] as Periodicidade[]).map(p => (
              <Button key={p} size="sm" variant={periodicidade === p ? "default" : "outline"} onClick={() => setPeriodicidade(p)}>
                {p === "diaria" ? "Diária" : p === "semanal" ? "Semanal" : "Mensal"}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Banco</Label>
          <Select value={filterBanco} onValueChange={setFilterBanco}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Consolidado</SelectItem>
              {contasBancarias.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.bancos?.nome} - {c.descricao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flow table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum lançamento encontrado no período selecionado.</div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-semibold">Período</th>
                <th className="text-right p-3 font-semibold text-success">Entradas Prev.</th>
                <th className="text-right p-3 font-semibold text-success">Entradas Real.</th>
                <th className="text-right p-3 font-semibold text-destructive">Saídas Prev.</th>
                <th className="text-right p-3 font-semibold text-destructive">Saídas Real.</th>
                <th className="text-right p-3 font-semibold">Saldo Previsto</th>
                <th className="text-right p-3 font-semibold">Saldo Realizado</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let saldoAcumPrev = 0;
                let saldoAcumReal = 0;
                return grouped.map(([key, g]) => {
                  saldoAcumPrev += (g.prevReceber - g.prevPagar);
                  saldoAcumReal += (g.realReceber - g.realPagar);
                  return (
                    <tr key={key} className="border-b hover:bg-muted/10">
                      <td className="p-3 font-medium">
                        {periodicidade === "diaria" ? new Date(key + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : key}
                      </td>
                      <td className="p-3 text-right mono text-success">{formatCurrency(g.prevReceber)}</td>
                      <td className="p-3 text-right mono text-success/70">{formatCurrency(g.realReceber)}</td>
                      <td className="p-3 text-right mono text-destructive">{formatCurrency(g.prevPagar)}</td>
                      <td className="p-3 text-right mono text-destructive/70">{formatCurrency(g.realPagar)}</td>
                      <td className={`p-3 text-right mono font-semibold ${saldoAcumPrev >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(saldoAcumPrev)}
                      </td>
                      <td className={`p-3 text-right mono font-semibold ${saldoAcumReal >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(saldoAcumReal)}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-bold">
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-right mono text-success">{formatCurrency(totals.prevReceber)}</td>
                <td className="p-3 text-right mono text-success/70">{formatCurrency(totals.realReceber)}</td>
                <td className="p-3 text-right mono text-destructive">{formatCurrency(totals.prevPagar)}</td>
                <td className="p-3 text-right mono text-destructive/70">{formatCurrency(totals.realPagar)}</td>
                <td className={`p-3 text-right mono ${totals.saldoPrevisto >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totals.saldoPrevisto)}</td>
                <td className={`p-3 text-right mono ${totals.saldoRealizado >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totals.saldoRealizado)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Bank accounts summary */}
      {contasBancarias.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Contas Bancárias
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contasBancarias.map(c => (
              <div
                key={c.id}
                className={`stat-card cursor-pointer transition-all ${filterBanco === c.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setFilterBanco(filterBanco === c.id ? "todos" : c.id)}
              >
                <p className="text-xs text-muted-foreground font-medium">{c.bancos?.nome}</p>
                <p className="text-sm font-medium mt-0.5">{c.descricao}</p>
                <p className="text-lg font-bold mono mt-1">{formatCurrency(Number(c.saldo_atual || 0))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default FluxoCaixa;
