import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { SummaryCard } from '@/components/SummaryCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/DataTable';
import { BarChart3, Package, Wallet, ShoppingCart, TrendingUp, Truck, Download, Printer, RefreshCcw, Hash, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { carregarRelatorio, exportarCsv, formatCellValue, type RelatorioResultado, type TipoRelatorio } from '@/services/relatorios.service';
import { formatCurrency, formatNumber } from '@/lib/format';
import { toast } from 'sonner';

const reportCards: Array<{ type: TipoRelatorio; title: string; description: string; icon: typeof Package }> = [
  { type: 'estoque', title: 'Estoque', description: 'Posição atual, custo e alertas', icon: Package },
  { type: 'financeiro', title: 'Financeiro', description: 'Contas a pagar e receber', icon: Wallet },
  { type: 'fluxo_caixa', title: 'Fluxo de Caixa', description: 'Entradas, saídas e saldo', icon: TrendingUp },
  { type: 'vendas', title: 'Vendas', description: 'Ordens por período e faturamento', icon: ShoppingCart },
  { type: 'compras', title: 'Compras', description: 'Consolidado por fornecedor', icon: Truck },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
];

export default function Relatorios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoInicial = (searchParams.get('tipo') as TipoRelatorio) || 'estoque';
  const [tipo, setTipo] = useState<TipoRelatorio>(tipoInicial);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<RelatorioResultado>({ title: '', subtitle: '', rows: [] });

  useEffect(() => {
    const tipoQuery = searchParams.get('tipo') as TipoRelatorio | null;
    if (tipoQuery && tipoQuery !== tipo) setTipo(tipoQuery);
  }, [searchParams, tipo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const report = await carregarRelatorio(tipo, { dataInicio, dataFim });
      setResultado(report);
    } catch (error: any) {
      console.error('[relatorios]', error);
      toast.error("Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tipo]);

  // KPIs computed from report data
  const kpis = useMemo(() => {
    const rows = resultado.rows as any[];
    const total = rows.length;
    const chartData = resultado.chartData || [];
    const totalValue = chartData.reduce((s, c) => s + (c.value || 0), 0);
    const alertCount = tipo === 'estoque'
      ? rows.filter((r: any) => r.situacao !== "OK").length
      : tipo === 'financeiro'
      ? rows.filter((r: any) => r.status === "vencido").length
      : 0;
    return { total, totalValue, alertCount };
  }, [resultado, tipo]);

  const columns = useMemo(() => {
    if (!resultado.rows.length) return [];
    return Object.keys(resultado.rows[0]).map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      render: (item: Record<string, unknown>): React.ReactNode => formatCellValue(item[key], key) as React.ReactNode,
    }));
  }, [resultado.rows]);

  const handleSelectTipo = (nextTipo: TipoRelatorio) => {
    setTipo(nextTipo);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tipo', nextTipo);
      return next;
    });
  };

  const handleExportCsv = () => {
    exportarCsv(resultado.title || tipo, resultado.rows as Record<string, unknown>[]);
    toast.success('Exportação CSV iniciada.');
  };

  const handleExportPdf = () => {
    import('jspdf').then(async ({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(resultado.title || 'Relatório', margin, y);
      y += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(resultado.subtitle || '', margin, y);
      y += 4;
      const periodoText = dataInicio || dataFim
        ? `Período: ${dataInicio || '—'} a ${dataFim || '—'}`
        : `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
      doc.text(periodoText, margin, y);
      y += 8;

      // Table
      const rows = resultado.rows as Record<string, unknown>[];
      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        const colWidth = (pageWidth - margin * 2) / keys.length;

        // Header row
        doc.setFillColor(105, 5, 0); // bordô
        doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        keys.forEach((key, i) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
          doc.text(label, margin + i * colWidth + 2, y + 5);
        });
        y += 7;

        // Data rows
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);

        const maxRows = Math.min(rows.length, 200);
        for (let r = 0; r < maxRows; r++) {
          if (y > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 15;
          }
          if (r % 2 === 0) {
            doc.setFillColor(245, 245, 240);
            doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
          }
          keys.forEach((key, i) => {
            const val = String(formatCellValue(rows[r][key], key) ?? '');
            doc.text(val.substring(0, 30), margin + i * colWidth + 2, y + 4);
          });
          y += 6;
        }

        // Totals
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`Total de registros: ${rows.length}`, margin, y);
      }

      doc.save(`${resultado.title || 'relatorio'}.pdf`);
      toast.success('PDF gerado com sucesso!');
    });
  };

  return (
    <AppLayout>
      <ModulePage title="Relatórios" subtitle="Análises gerenciais, exportações e visão consolidada por módulo.">
        <div className="space-y-6">
          {/* Report type selector */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {reportCards.map((card) => (
              <button
                key={card.type}
                onClick={() => handleSelectTipo(card.type)}
                className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 ${
                  tipo === card.type ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'bg-card'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`rounded-lg p-2 ${tipo === card.type ? 'bg-primary/20' : 'bg-muted'}`}>
                    <card.icon className={`h-4 w-4 ${tipo === card.type ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  {tipo === card.type && <BarChart3 className="h-3.5 w-3.5 text-primary ml-auto" />}
                </div>
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
              </button>
            ))}
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard title="Registros" value={formatNumber(kpis.total)} icon={Hash} variationType="neutral" variation="no relatório" />
            <SummaryCard title="Valor Consolidado" value={formatCurrency(kpis.totalValue)} icon={DollarSign} variationType="neutral" variation="soma do gráfico" />
            {kpis.alertCount > 0 && (
              <SummaryCard title="Alertas" value={String(kpis.alertCount)} icon={AlertTriangle} variationType="negative" variation={tipo === 'estoque' ? 'abaixo do mínimo' : 'vencidos'} />
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data inicial</Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 w-[160px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data final</Label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 w-[160px]" />
                </div>
                <div className="flex flex-wrap gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5"><RefreshCcw className="h-3.5 w-3.5" />Atualizar</Button>
                  <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5"><FileText className="h-3.5 w-3.5" />PDF</Button>
                  <Button size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-3.5 w-3.5" />CSV</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report + Chart */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{resultado.title || 'Relatório'}</CardTitle>
                <CardDescription>{resultado.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={columns} data={resultado.rows as Record<string, unknown>[]} loading={loading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo Visual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(resultado.chartData || []).length > 0 ? (
                  <>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        {(resultado.chartData || []).length <= 4 ? (
                          <PieChart>
                            <Pie data={resultado.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                              {(resultado.chartData || []).map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          </PieChart>
                        ) : (
                          <BarChart data={resultado.chartData}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis hide />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {(resultado.chartData || []).slice(0, 6).map((item, i) => (
                        <div key={`${item.name}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <span className="text-sm font-mono font-semibold">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    O resumo gráfico aparecerá conforme o relatório possuir dados consolidados.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ModulePage>
    </AppLayout>
  );
}
