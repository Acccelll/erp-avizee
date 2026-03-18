import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/DataTable';
import { BarChart3, Package, Wallet, ShoppingCart, TrendingUp, Truck, Download, Printer, RefreshCcw } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { carregarRelatorio, exportarCsv, formatCellValue, type RelatorioResultado, type TipoRelatorio } from '@/services/relatorios.service';
import { toast } from 'sonner';

const reportCards: Array<{ type: TipoRelatorio; title: string; description: string; icon: typeof Package }> = [
  { type: 'estoque', title: 'Estoque', description: 'Posição atual, custo e alertas', icon: Package },
  { type: 'financeiro', title: 'Financeiro', description: 'Contas a pagar e receber', icon: Wallet },
  { type: 'fluxo_caixa', title: 'Fluxo de Caixa', description: 'Entradas, saídas e saldo acumulado', icon: TrendingUp },
  { type: 'vendas', title: 'Vendas', description: 'Ordens por período e status de faturamento', icon: ShoppingCart },
  { type: 'compras', title: 'Compras por Fornecedor', description: 'Histórico consolidado por fornecedor e entrega', icon: Truck },
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
      toast.error(`Não foi possível carregar o relatório: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tipo]);

  const columns = useMemo(() => {
    if (!resultado.rows.length) return [];

    return Object.keys(resultado.rows[0]).map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      render: (item: Record<string, unknown>) => formatCellValue(item[key], key),
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

  return (
    <AppLayout>
      <ModulePage title="Relatórios" subtitle="Análises gerenciais, exportações e visão consolidada por módulo.">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {reportCards.map((card) => (
              <Card
                key={card.type}
                className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/30 ${tipo === card.type ? 'border-primary shadow-sm' : ''}`}
                onClick={() => handleSelectTipo(card.type)}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    {tipo === card.type && <BarChart3 className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros do relatório</CardTitle>
              <CardDescription>Aplicados sobre o tipo selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[repeat(2,minmax(0,220px))_1fr] md:items-end">
              <div className="space-y-2"><Label>Data inicial</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
              <div className="space-y-2"><Label>Data final</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button variant="outline" onClick={loadData} className="gap-2"><RefreshCcw className="h-4 w-4" />Atualizar</Button>
                <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" />Imprimir / PDF</Button>
                <Button onClick={handleExportCsv} className="gap-2"><Download className="h-4 w-4" />Exportar CSV</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>{resultado.title || 'Relatório'}</CardTitle>
                <CardDescription>{resultado.subtitle || 'Sem dados consolidados para o filtro atual.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={columns} data={resultado.rows as Record<string, unknown>[]} loading={loading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo visual</CardTitle>
                <CardDescription>{resultado.chartTitle || 'Tendência resumida do relatório selecionado.'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resultado.chartData || []}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {(resultado.chartData || []).slice(0, 6).map((item) => (
                    <div key={`${item.name}-${item.value}`} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCellValue(item.value, 'valor')}</p>
                    </div>
                  ))}
                  {!resultado.chartData?.length && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      O resumo gráfico aparecerá conforme o relatório selecionado possuir dados consolidados.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ModulePage>
    </AppLayout>
  );
}
