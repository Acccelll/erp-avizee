import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartPoint {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export function FluxoCaixaChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const dateFrom = sixMonthsAgo.toISOString().slice(0, 10);

      const { data: lancamentos } = await supabase
        .from('financeiro_lancamentos')
        .select('tipo, valor, data_vencimento')
        .eq('ativo', true)
        .in('status', ['pago', 'aberto', 'vencido'])
        .gte('data_vencimento', dateFrom)
        .order('data_vencimento', { ascending: true });

      const monthMap = new Map<string, { entradas: number; saidas: number }>();

      for (const l of lancamentos || []) {
        const month = (l.data_vencimento as string).slice(0, 7);
        const current = monthMap.get(month) || { entradas: 0, saidas: 0 };
        const valor = Number(l.valor || 0);
        if (l.tipo === 'receber') current.entradas += valor;
        else current.saidas += valor;
        monthMap.set(month, current);
      }

      const months = Array.from(monthMap.keys()).sort();
      let saldo = 0;
      const points: ChartPoint[] = months.map((m) => {
        const { entradas, saidas } = monthMap.get(m)!;
        saldo += entradas - saidas;
        const [year, mon] = m.split('-');
        const mesLabel = new Date(Number(year), Number(mon) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        return { mes: mesLabel, entradas, saidas, saldo };
      });

      setData(points);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-5">
        <h3 className="font-semibold text-foreground mb-4">Fluxo de Caixa</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados financeiros para exibir.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-5">
      <h3 className="font-semibold text-foreground mb-4">Fluxo de Caixa (6 meses)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis hide />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saídas' : 'Saldo',
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="entradas" stroke="hsl(142 76% 36%)" fill="url(#colorEntradas)" strokeWidth={2} />
          <Area type="monotone" dataKey="saidas" stroke="hsl(0 84% 60%)" fill="url(#colorSaidas)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />Entradas</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(0 84% 60%)' }} />Saídas</span>
      </div>
    </div>
  );
}
