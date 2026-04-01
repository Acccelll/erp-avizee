import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/format';

interface PieItem {
  name: string;
  value: number;
  color: string;
}

export function SummaryPie({ data }: { data: PieItem[] }) {
  const textualSummary = data.map((item) => `${item.name}: ${formatNumber(item.value)}`).join(', ');

  return (
    <figure className="bg-card rounded-xl border p-5" role="img" aria-label={`Gráfico de pizza das ordens de venda por status. ${textualSummary}`}>
      <h3 className="font-semibold text-foreground mb-4">Ordens de Venda por Status</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-medium mono">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">{textualSummary}</figcaption>
    </figure>
  );
}
