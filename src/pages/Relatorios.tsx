import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { SummaryCard } from '@/components/SummaryCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from "@/components/ui/MultiSelect";
import { DataTable } from '@/components/DataTable';
import { PreviewModal } from '@/components/ui/PreviewModal';
import { cn } from '@/lib/utils';
import { BarChart3, Package, Wallet, ShoppingCart, TrendingUp, Truck, Download, RefreshCcw, Hash, AlertTriangle, DollarSign, FileText, Eye, ArrowLeftRight, FileSpreadsheet, Receipt, Layers, Building2, Boxes, Landmark, PieChart as PieChartIcon, LineChart } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend, LineChart as RechartsLineChart, Line } from 'recharts';
import { carregarRelatorio, exportarCsv, exportarXlsx, formatCellValue, type RelatorioResultado, type TipoRelatorio } from '@/services/relatorios.service';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QUICK_PERIODS, REPORTS_META, type ReportCategory } from './relatoriosConfig';

const reportCards = Object.values(REPORTS_META);

const categoryMeta: Record<ReportCategory, { title: string; icon: typeof Building2 }> = {
  comercial: { title: 'Comercial', icon: Building2 },
  financeiro: { title: 'Financeiro', icon: Landmark },
  estoque_suprimentos: { title: 'Estoque e Suprimentos', icon: Boxes },
  fiscal_faturamento: { title: 'Fiscal / Faturamento', icon: Receipt },
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
  'hsl(262 83% 58%)',
];

function buildPdf(resultado: RelatorioResultado, dataInicio: string, dataFim: string) {
  return import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

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

    const rows = resultado.rows as Record<string, unknown>[];
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      const colWidth = (pageWidth - margin * 2) / keys.length;

      doc.setFillColor(105, 5, 0);
      doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      keys.forEach((key, i) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
        doc.text(label, margin + i * colWidth + 2, y + 5);
      });
      y += 7;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const maxRows = Math.min(rows.length, 200);
      if (rows.length > 200) {
        y += 10;
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(180, 0, 0);
        doc.text(`⚠ PDF limitado a 200 de ${rows.length} registros. Use "Exportar Excel" para o relatório completo.`, margin, y);
      }
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

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Total de registros: ${rows.length}`, margin, y);
    }

    return doc;
  });
}

export default function Relatorios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoInicial = (searchParams.get('tipo') as TipoRelatorio) || 'estoque';
  const [tipo, setTipo] = useState<TipoRelatorio>(tipoInicial);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroClienteIds, setFiltroClienteIds] = useState<string[]>([]);
  const [filtroFornecedorIds, setFiltroFornecedorIds] = useState<string[]>([]);
  const [filtroGrupoIds, setFiltroGrupoIds] = useState<string[]>([]);
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');
  const [agrupamento, setAgrupamento] = useState<string>('padrao');
  const [dreCompetencia, setDreCompetencia] = useState<'mes' | 'trimestre' | 'ano' | 'personalizado'>('mes');
  const [dreMes, setDreMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [clientes, setClientes] = useState<{ id: string; nome_razao_social: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome_razao_social: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RelatorioResultado>({ title: '', subtitle: '', rows: [] });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('id, nome_razao_social').eq('ativo', true).order('nome_razao_social').limit(300),
      supabase.from('fornecedores').select('id, nome_razao_social').eq('ativo', true).order('nome_razao_social').limit(300),
      supabase.from('grupos_produto').select('id, nome').eq('ativo', true).order('nome'),
    ]).then(([{ data: c }, { data: f }, { data: g }]) => {
      setClientes(c || []);
      setFornecedores(f || []);
      setGrupos(g || []);
    });
  }, []);

  useEffect(() => {
    const tipoQuery = searchParams.get('tipo') as TipoRelatorio | null;
    if (tipoQuery && tipoQuery !== tipo) setTipo(tipoQuery);
  }, [searchParams, tipo]);

  const getDreDateRange = () => {
    if (dreCompetencia === 'personalizado') return { dataInicio, dataFim };
    const now = new Date();
    if (dreCompetencia === 'mes') {
      const [y, m] = dreMes.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      return { dataInicio: start, dataFim: end };
    }
    if (dreCompetencia === 'trimestre') {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10);
      return { dataInicio: start, dataFim: end };
    }
    return { dataInicio: `${now.getFullYear()}-01-01`, dataFim: `${now.getFullYear()}-12-31` };
  };

  const loadData = async () => {
    setLoading(true);
    setErrorLoading(null);
    try {
      const filtros = tipo === 'dre'
        ? { ...getDreDateRange(), clienteId: undefined, fornecedorId: undefined, grupoProdutoId: undefined }
        : {
          dataInicio,
          dataFim,
          clienteIds: filtroClienteIds.length > 0 ? filtroClienteIds : undefined,
          fornecedorIds: filtroFornecedorIds.length > 0 ? filtroFornecedorIds : undefined,
          grupoProdutoIds: filtroGrupoIds.length > 0 ? filtroGrupoIds : undefined,
          tiposFinanceiros: filtroTipos.length > 0 ? filtroTipos : undefined,
        };
      const report = await carregarRelatorio(tipo, filtros);
      setResultado(report);
    } catch (error: unknown) {
      console.error('[relatorios]', error);
      setErrorLoading('Não foi possível carregar os dados desse relatório. Revise filtros e tente novamente.');
      toast.error('Não foi possível carregar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tipo]);

  const isQtyReport = resultado._isQuantityReport === true;
  const isDreReport = resultado._isDreReport === true;

  const filteredRows = useMemo(() => {
    const rows = (resultado.rows || []) as Record<string, unknown>[];
    if (statusFiltro === 'todos') return rows;
    return rows.filter((r) => {
      const status = String(r.status || r.situacao || r.faturamento || '').toLowerCase();
      return status.includes(statusFiltro.toLowerCase());
    });
  }, [resultado.rows, statusFiltro]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    if (agrupamento === 'valor_desc') {
      return rows.sort((a, b) => Number(b.valor || b.valorTotal || 0) - Number(a.valor || a.valorTotal || 0));
    }
    if (agrupamento === 'vencimento') {
      return rows.sort((a, b) => String(a.vencimento || a.data || '').localeCompare(String(b.vencimento || b.data || '')));
    }
    if (agrupamento === 'status') {
      return rows.sort((a, b) => String(a.status || a.situacao || '').localeCompare(String(b.status || b.situacao || ''), 'pt-BR'));
    }
    return rows;
  }, [filteredRows, agrupamento]);

  const kpiCards = useMemo(() => {
    const rows = sortedRows;
    const totals = resultado.totals || {};
    const getTopShare = (count: number, field: string) => {
      const total = rows.reduce((s, r) => s + Number(r[field] || 0), 0);
      if (!total) return 0;
      return rows.slice(0, count).reduce((s, r) => s + Number(r[field] || 0), 0) / total * 100;
    };

    if (tipo === 'financeiro') {
      return [
        { title: 'Em aberto', value: formatCurrency(Number(totals.totalAberto || 0)), icon: Wallet, variation: 'carteira em aberto' },
        { title: 'Vencido', value: formatCurrency(Number(totals.vencido || 0)), icon: AlertTriangle, variation: 'requer ação imediata' },
        { title: 'Pago', value: formatCurrency(Number(totals.totalPago || 0)), icon: DollarSign, variation: 'já liquidado' },
        { title: 'A pagar / receber', value: `${formatCurrency(Number(totals.totalPagar || 0))} / ${formatCurrency(Number(totals.totalReceber || 0))}`, icon: Hash, variation: 'saldo por tipo' },
      ];
    }

    if (tipo === 'estoque_minimo') {
      return [
        { title: 'Itens críticos', value: formatNumber(rows.length), icon: AlertTriangle, variation: 'abaixo do mínimo' },
        { title: 'Itens zerados', value: formatNumber(rows.filter((r) => Number(r.estoqueAtual || 0) <= 0).length), icon: Package, variation: 'ruptura imediata' },
        { title: 'Qtd em déficit', value: formatNumber(rows.reduce((s, r) => s + Number(r.deficit || 0), 0)), icon: Boxes, variation: 'unidades' },
        { title: 'Custo de reposição', value: formatCurrency(Number(totals.custoTotal || 0)), icon: DollarSign, variation: 'estimado' },
      ];
    }

    if (tipo === 'faturamento') {
      return [
        { title: 'Notas', value: formatNumber(rows.length), icon: Receipt, variation: 'confirmadas' },
        { title: 'Bruto', value: formatCurrency(Number(totals.totalBruto || 0)), icon: DollarSign, variation: 'faturamento bruto' },
        { title: 'Impostos', value: formatCurrency(Number(totals.totalImpostos || 0)), icon: Landmark, variation: 'retenções' },
        { title: 'Líquido', value: formatCurrency(Number(totals.totalLiquido || 0)), icon: Wallet, variation: 'resultado líquido' },
        { title: 'Ticket médio', value: formatCurrency(rows.length ? Number(totals.totalLiquido || 0) / rows.length : 0), icon: Hash, variation: 'líquido por NF' },
      ];
    }

    if (tipo === 'fluxo_caixa') {
      return [
        { title: 'Entradas', value: formatCurrency(Number(totals.totalEntradas || 0)), icon: TrendingUp, variation: 'período' },
        { title: 'Saídas', value: formatCurrency(Number(totals.totalSaidas || 0)), icon: ArrowLeftRight, variation: 'período' },
        { title: 'Saldo período', value: formatCurrency(Number(totals.saldoPeriodo || 0)), icon: Wallet, variation: 'entradas - saídas' },
        { title: 'Saldo acumulado', value: formatCurrency(Number(totals.saldoFinal || 0)), icon: Wallet, variation: 'posição cronológica final' },
      ];
    }

    if (tipo === 'vendas') {
      const totalVendido = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
      return [
        { title: 'Total vendido', value: formatCurrency(totalVendido), icon: DollarSign, variation: 'ordens no período' },
        { title: 'Pedidos', value: formatNumber(rows.length), icon: ShoppingCart, variation: 'quantidade' },
        { title: 'Ticket médio', value: formatCurrency(rows.length ? totalVendido / rows.length : 0), icon: Hash, variation: 'por pedido' },
        { title: 'Aguardando faturamento', value: formatNumber(rows.filter((r) => String(r.statusFaturamento || '').toLowerCase() === 'aguardando').length), icon: AlertTriangle, variation: 'pipeline comercial' },
      ];
    }
    if (tipo === 'vendas_cliente') {
      const total = rows.reduce((s, r) => s + Number(r.valorTotal || 0), 0);
      return [
        { title: 'Total vendido', value: formatCurrency(total), icon: DollarSign, variation: 'somatório do ranking' },
        { title: 'Clientes atendidos', value: formatNumber(rows.length), icon: ShoppingCart, variation: 'no período' },
        { title: 'Top 5', value: `${getTopShare(5, 'valorTotal').toFixed(1)}%`, icon: BarChart3, variation: 'concentração de receita' },
        { title: 'Top 10', value: `${getTopShare(10, 'valorTotal').toFixed(1)}%`, icon: TrendingUp, variation: 'concentração ampliada' },
      ];
    }
    if (tipo === 'compras_fornecedor') {
      const total = rows.reduce((s, r) => s + Number(r.valorTotal || 0), 0);
      return [
        { title: 'Total comprado', value: formatCurrency(total), icon: DollarSign, variation: 'somatório do ranking' },
        { title: 'Fornecedores ativos', value: formatNumber(rows.length), icon: Truck, variation: 'no período' },
        { title: 'Ticket médio', value: formatCurrency(rows.length ? total / rows.length : 0), icon: Hash, variation: 'por fornecedor' },
        { title: 'Top 5', value: `${getTopShare(5, 'valorTotal').toFixed(1)}%`, icon: BarChart3, variation: 'concentração de compras' },
      ];
    }
    if (tipo === 'margem_produtos') {
      const margens = rows.map((r) => Number(r.margem || 0));
      return [
        { title: 'Média de margem', value: `${formatNumber(Number(totals.mediaMargemPct || 0))}%`, icon: TrendingUp, variation: 'potencial de rentabilidade' },
        { title: 'Margem negativa', value: formatNumber(rows.filter((r) => Number(r.margem || 0) < 0).length), icon: AlertTriangle, variation: 'itens críticos' },
        { title: 'Maior margem', value: `${formatNumber(Math.max(...margens, 0))}%`, icon: DollarSign, variation: 'melhor item' },
        { title: 'Menor margem', value: `${formatNumber(Math.min(...margens, 0))}%`, icon: ArrowLeftRight, variation: 'pior item' },
      ];
    }

    if (tipo === 'divergencias') {
      return [
        { title: 'Pendências', value: formatNumber(rows.length), icon: AlertTriangle, variation: 'itens críticos' },
        { title: 'Valor impactado', value: formatCurrency(rows.reduce((s, r) => s + Number(r.valor || 0), 0)), icon: DollarSign, variation: 'estimado' },
      ];
    }

    const chartData = resultado.chartData || [];
    const totalValue = chartData.reduce((s, c) => s + (c.value || 0), 0);
    return [
      { title: 'Registros', value: formatNumber(rows.length), icon: Hash, variation: 'no relatório' },
      { title: isQtyReport ? 'Total Movimentado' : 'Valor Consolidado', value: isQtyReport ? formatNumber(totalValue) : formatCurrency(totalValue), icon: isQtyReport ? Package : DollarSign, variation: isQtyReport ? 'soma das quantidades' : 'soma do gráfico' },
    ];
  }, [sortedRows, resultado.totals, resultado.chartData, tipo, isQtyReport]);

  const columns = useMemo(() => {
    if (!sortedRows.length) return [];
    const orderedKeys = REPORTS_META[tipo].defaultColumns.filter((key) => key in sortedRows[0]);
    const fallbackKeys = Object.keys(sortedRows[0]).filter((key) => !orderedKeys.includes(key));
    return [...orderedKeys, ...fallbackKeys].map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      render: (item: Record<string, unknown>): React.ReactNode => {
        const raw = item[key];
        if ((key.toLowerCase().includes('status') || key.toLowerCase().includes('situacao') || key === 'faixa' || key === 'classe') && typeof raw === 'string') {
          const normalized = raw.toLowerCase();
          const isCritical = ['vencido', 'abaixo do mínimo', 'ruptura', 'zerado', 'pendente', 'nf s/ financeiro', 'pedido s/ nf', 'c', 'negativa'].some((t) => normalized.includes(t));
          return <Badge variant={isCritical ? 'destructive' : 'secondary'}>{raw}</Badge>;
        }
        if (key === 'criticidade' && typeof raw === 'string') {
          return <Badge variant={raw.toLowerCase().includes('alta') || raw.toLowerCase().includes('ruptura') ? 'destructive' : 'secondary'}>{raw}</Badge>;
        }
        return formatCellValue(raw, key, isQtyReport) as React.ReactNode;
      },
    }));
  }, [sortedRows, isQtyReport, tipo]);

  const handleSelectTipo = (nextTipo: TipoRelatorio) => {
    setFiltroClienteIds([]);
    setFiltroFornecedorIds([]);
    setFiltroGrupoIds([]);
    setFiltroTipos([]);
    setStatusFiltro('todos');
    setAgrupamento('padrao');
    setTipo(nextTipo);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tipo', nextTipo);
      return next;
    });
  };

  const applyQuickPeriod = (period: 'hoje' | '7d' | '15d' | '30d' | 'mes' | 'mes_anterior') => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    if (period === 'hoje') {
      setDataInicio(end);
      setDataFim(end);
      return;
    }
    if (period === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      setDataInicio(start.toISOString().slice(0, 10));
      setDataFim(end);
      return;
    }
    if (period === '15d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 15);
      setDataInicio(start.toISOString().slice(0, 10));
      setDataFim(end);
      return;
    }
    if (period === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      setDataInicio(start.toISOString().slice(0, 10));
      setDataFim(end);
      return;
    }
    if (period === 'mes_anterior') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDataInicio(start.toISOString().slice(0, 10));
      setDataFim(last.toISOString().slice(0, 10));
      return;
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    setDataInicio(start);
    setDataFim(end);
  };

  const handleExportCsv = () => {
    exportarCsv(resultado.title || tipo, resultado.rows as Record<string, unknown>[]);
    toast.success('Exportação CSV iniciada.');
  };

  const handleExportPdf = async () => {
    if (resultado && resultado.rows.length > 200) {
      toast.warning(`Este relatório tem ${resultado.rows.length} registros. O PDF mostrará apenas os primeiros 200. Use "Exportar Excel" para exportar tudo.`, { duration: 8000 });
    }
    const doc = await buildPdf(resultado, dataInicio, dataFim);
    doc.save(`${resultado.title || 'relatorio'}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const handleExportXlsx = async () => {
    await exportarXlsx(resultado.title || tipo, resultado.rows as Record<string, unknown>[]);
    toast.success('Excel gerado com sucesso!');
  };

  const periodoLabel = dataInicio || dataFim
    ? `${dataInicio ? formatDate(dataInicio) : '—'} a ${dataFim ? formatDate(dataFim) : '—'}`
    : new Date().toLocaleDateString('pt-BR');

  const groupedReports = useMemo(() => {
    return Object.entries(categoryMeta).map(([category, meta]) => ({
      category: category as ReportCategory,
      ...meta,
      items: reportCards.filter((r) => r.category === category),
    }));
  }, []);

  const selectedMeta = reportCards.find((r) => r.type === tipo);
  const prioritized = reportCards.filter((r) => (r.priority || 0) > 0).sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 6);
  const showEmptyData = !loading && !errorLoading && sortedRows.length === 0;

  const chartMode = selectedMeta?.chartMode || 'auto';
  const usePie = chartMode === 'pie' || (chartMode === 'auto' && (resultado.chartData || []).length <= 4);
  const useLine = chartMode === 'line';
  const tableFooter = useMemo(() => {
    if (!sortedRows.length) return null;
    if (tipo === 'estoque') {
      return <div className="text-xs font-medium">Qtd total: {formatNumber(Number(resultado.totals?.totalQtd || 0))} • Custo total: {formatCurrency(Number(resultado.totals?.totalCusto || 0))} • Valor potencial: {formatCurrency(Number(resultado.totals?.totalVenda || 0))}</div>;
    }
    if (tipo === 'financeiro') {
      return <div className="text-xs font-medium">Em aberto: {formatCurrency(Number(resultado.totals?.totalAberto || 0))} • Pago: {formatCurrency(Number(resultado.totals?.totalPago || 0))} • Vencido: {formatCurrency(Number(resultado.totals?.vencido || 0))}</div>;
    }
    if (tipo === 'fluxo_caixa') {
      return <div className="text-xs font-medium">Entradas: {formatCurrency(Number(resultado.totals?.totalEntradas || 0))} • Saídas: {formatCurrency(Number(resultado.totals?.totalSaidas || 0))} • Saldo acumulado: {formatCurrency(Number(resultado.totals?.saldoFinal || 0))}</div>;
    }
    return null;
  }, [tipo, sortedRows.length, resultado.totals]);

  return (
    <AppLayout>
      <ModulePage title="Relatórios" subtitle="Análises gerenciais, exportações e visão consolidada por módulo.">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4 text-primary" />Entrada do módulo de Relatórios</CardTitle>
              <CardDescription>Selecione primeiro o contexto de negócio e o relatório prioritário para seguir para filtros, preview e exportações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-2">Relatórios prioritários</p>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                  {prioritized.map((card) => (
                    <button
                      key={card.type}
                      onClick={() => handleSelectTipo(card.type)}
                      className={cn('rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 bg-card', tipo === card.type && 'border-primary bg-primary/5 ring-1 ring-primary/20')}
                    >
                      <div className="flex items-center gap-2">
                        <card.icon className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold leading-tight">{card.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {groupedReports.map((group) => (
                  <div key={group.category} className="rounded-lg border p-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><group.icon className="h-4 w-4 text-muted-foreground" />{group.title}</p>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                      {group.items.map((card) => (
                        <button
                          key={card.type}
                          onClick={() => handleSelectTipo(card.type)}
                          className={cn('rounded-lg border p-3 text-left transition-all hover:border-primary/30', tipo === card.type ? 'border-primary bg-primary/5' : 'bg-card')}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{card.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{card.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Execução e análise — {selectedMeta?.title || 'Relatório'}</CardTitle>
              <CardDescription>{selectedMeta?.objective || 'Após selecionar o relatório, ajuste filtros, analise KPIs, veja o gráfico e exporte os dados.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedMeta && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Contexto: {categoryMeta[selectedMeta.category].title}</Badge>
                  <Badge variant="secondary">Gráfico: {selectedMeta.chartMode}</Badge>
                  {selectedMeta.drilldowns.map((item) => (
                    <Badge key={item} variant="outline" className="text-[11px]">Drill-down: {item}</Badge>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpiCards.map((kpi) => (
                  <SummaryCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} variationType="neutral" variation={kpi.variation} />
                ))}
              </div>

              <Card>
                <CardContent className="pt-5 pb-4 space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data inicial</Label>
                      <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 w-[160px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data final</Label>
                      <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 w-[160px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Períodos rápidos</Label>
                      <div className="flex gap-2 flex-wrap">
                        {QUICK_PERIODS.map((period) => (
                          <Button key={period.id} size="sm" variant="outline" onClick={() => applyQuickPeriod(period.id)}>
                            {period.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-auto">
                      <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5"><RefreshCcw className="h-3.5 w-3.5" />Atualizar</Button>
                      <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!resultado.rows.length} className="gap-1.5"><Eye className="h-3.5 w-3.5" />Visualizar</Button>
                      <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5"><FileText className="h-3.5 w-3.5" />PDF</Button>
                      <Button variant="outline" size="sm" onClick={handleExportXlsx} disabled={!resultado.rows.length} className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</Button>
                      <Button size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-3.5 w-3.5" />CSV</Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-end">
                    {selectedMeta?.supportedFilters.includes('cliente') && (
                      <div className="space-y-1">
                        <Label className="text-xs">Clientes</Label>
                        <MultiSelect options={clientes.map((c) => ({ label: c.nome_razao_social, value: c.id }))} selected={filtroClienteIds} onChange={setFiltroClienteIds} placeholder="Todos os clientes" className="w-[250px]" />
                      </div>
                    )}

                    {selectedMeta?.supportedFilters.includes('fornecedor') && (
                      <div className="space-y-1">
                        <Label className="text-xs">Fornecedores</Label>
                        <MultiSelect options={fornecedores.map((f) => ({ label: f.nome_razao_social, value: f.id }))} selected={filtroFornecedorIds} onChange={setFiltroFornecedorIds} placeholder="Todos os fornecedores" className="w-[250px]" />
                      </div>
                    )}

                    {selectedMeta?.supportedFilters.includes('grupo') && (
                      <div className="space-y-1">
                        <Label className="text-xs">Grupos de Produto</Label>
                        <MultiSelect options={grupos.map((g) => ({ label: g.nome, value: g.id }))} selected={filtroGrupoIds} onChange={setFiltroGrupoIds} placeholder="Todos os grupos" className="w-[220px]" />
                      </div>
                    )}

                    {selectedMeta?.supportedFilters.includes('status') && (
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="aberto">Em aberto</SelectItem>
                            <SelectItem value="vencido">Vencido</SelectItem>
                            <SelectItem value="pago">Pago/Confirmado</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs">Agrupamento</Label>
                      <Select value={agrupamento} onValueChange={setAgrupamento}>
                        <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="padrao">Padrão do relatório</SelectItem>
                          <SelectItem value="valor_desc">Maior valor primeiro</SelectItem>
                          <SelectItem value="status">Por status</SelectItem>
                          <SelectItem value="vencimento">Por vencimento/data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedMeta?.supportedFilters.includes('tipos_financeiros') && (
                      <div className="space-y-1">
                        <Label className="text-xs">Tipos</Label>
                        <MultiSelect
                          options={[{ label: 'A Receber', value: 'receber' }, { label: 'A Pagar', value: 'pagar' }]}
                          selected={filtroTipos}
                          onChange={setFiltroTipos}
                          placeholder="Todos"
                          className="w-[180px]"
                        />
                      </div>
                    )}
                  </div>

                  {tipo === 'dre' && (
                    <div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Competência</Label>
                        <Select value={dreCompetencia} onValueChange={(v: 'mes' | 'trimestre' | 'ano' | 'personalizado') => setDreCompetencia(v)}>
                          <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mes">Mês específico</SelectItem>
                            <SelectItem value="trimestre">Trimestre atual</SelectItem>
                            <SelectItem value="ano">Ano atual</SelectItem>
                            <SelectItem value="personalizado">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {dreCompetencia === 'mes' && (
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Mês/Ano</Label>
                          <Input type="month" value={dreMes} onChange={(e) => setDreMes(e.target.value)} className="h-9 w-[160px]" />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{resultado.title || 'Relatório'}</CardTitle>
                    <CardDescription>{resultado.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading && <div className="p-6 text-sm text-muted-foreground">Carregando dados do relatório...</div>}
                    {errorLoading && !loading && <div className="m-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{errorLoading}</div>}

                    {!loading && !errorLoading && isDreReport ? (
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <tbody>
                            {(sortedRows as Array<Record<string, unknown>>).map((row, i) => {
                              const tipoLinha = row.tipo as string | undefined;
                              const valor = row.valor as number | undefined;
                              const linha = row.linha as string | undefined;
                              return (
                                <tr key={i} className={
                                  tipoLinha === 'header' ? 'bg-primary/5 font-bold' :
                                    tipoLinha === 'subtotal' ? 'bg-muted/50 font-semibold border-t' :
                                      tipoLinha === 'resultado' ? 'bg-primary/10 font-bold text-lg border-t-2 border-primary/30' :
                                        'text-muted-foreground'
                                }>
                                  <td className={`px-4 py-3 ${tipoLinha === 'deducao' ? 'pl-8' : ''}`}>{linha}</td>
                                  <td className={`px-4 py-3 text-right font-mono ${(valor ?? 0) < 0 ? 'text-destructive' : ''}`}>{formatCurrency(valor ?? 0)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {!loading && !errorLoading && !isDreReport && (
                      <DataTable
                        columns={columns}
                        data={sortedRows}
                        loading={loading}
                        footer={tableFooter}
                        moduleKey={`relatorios-${tipo}`}
                        emptyTitle="Sem dados para o filtro aplicado"
                        emptyDescription={`Nenhum registro encontrado em ${selectedMeta?.title}. Ajuste período, filtros contextuais ou visão de status para leitura operacional.`}
                      />
                    )}

                    {showEmptyData && (
                      <div className="px-4 pb-4 text-xs text-muted-foreground">Nenhum dado encontrado para o filtro atual. As exportações permanecem disponíveis para manter o fluxo operacional.</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">Resumo Visual {useLine ? <LineChart className="h-4 w-4 text-muted-foreground" /> : usePie ? <PieChartIcon className="h-4 w-4 text-muted-foreground" /> : <BarChart3 className="h-4 w-4 text-muted-foreground" />}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(resultado.chartData || []).length > 0 ? (
                      <>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            {useLine ? (
                              <RechartsLineChart data={resultado.chartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip formatter={(v: number) => isQtyReport ? formatNumber(v) : formatCurrency(v)} />
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                              </RechartsLineChart>
                            ) : usePie ? (
                              <PieChart>
                                <Pie data={resultado.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                                  {(resultado.chartData || []).map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} />
                                <Tooltip formatter={(v: number) => isQtyReport ? formatNumber(v) : formatCurrency(v)} />
                              </PieChart>
                            ) : (
                              <BarChart data={resultado.chartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip formatter={(v: number) => isQtyReport ? formatNumber(v) : formatCurrency(v)} />
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
                              <span className="text-sm font-mono font-semibold">{isQtyReport ? formatNumber(item.value) : formatCurrency(item.value)}</span>
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
            </CardContent>
          </Card>
        </div>
      </ModulePage>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`${resultado.title || 'Relatório'} — Pré-visualização`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5"><FileText className="h-3.5 w-3.5" />PDF</Button>
            <Button variant="outline" size="sm" onClick={handleExportXlsx} className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</Button>
            <Button size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-3.5 w-3.5" />CSV</Button>
          </>
        }
      >
        <div className="space-y-6 print:space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-foreground">{resultado.title}</h2>
            <p className="text-sm text-muted-foreground">{resultado.subtitle}</p>
            <p className="text-xs text-muted-foreground mt-1">Período: {periodoLabel}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  {columns.map((col) => (
                    <th key={col.key} className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground border-b">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(resultado.rows as Record<string, unknown>[]).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-muted/20' : ''}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-1.5 border-b border-border/40 text-xs">
                        {formatCellValue(row[col.key], col.key, isQtyReport) as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-3 text-sm">
            <span className="font-semibold text-foreground">Total de registros: {resultado.rows.length}</span>
            {resultado.totals && (
              <div className="flex flex-wrap gap-4">
                {resultado.totals.totalQtd != null && <span className="font-semibold">Qtd Total: {formatNumber(resultado.totals.totalQtd)}</span>}
                {resultado.totals.totalCusto != null && <span className="font-semibold">Total Custo: {formatCurrency(resultado.totals.totalCusto)}</span>}
                {resultado.totals.totalVenda != null && <span className="font-semibold">Total Venda: {formatCurrency(resultado.totals.totalVenda)}</span>}
                {resultado.totals.totalEntradas != null && <span className="font-semibold">Entradas: {isQtyReport ? formatNumber(resultado.totals.totalEntradas) : formatCurrency(resultado.totals.totalEntradas)}</span>}
                {resultado.totals.totalSaidas != null && <span className="font-semibold">Saídas: {isQtyReport ? formatNumber(resultado.totals.totalSaidas) : formatCurrency(resultado.totals.totalSaidas)}</span>}
                {resultado.totals.totalAjustes != null && <span className="font-semibold">Ajustes: {formatNumber(resultado.totals.totalAjustes)}</span>}
                {resultado.totals.saldoAtual != null && <span className="font-semibold">Saldo Atual: {formatNumber(resultado.totals.saldoAtual)}</span>}
                {resultado.totals.saldoFinal != null && <span className="font-semibold text-primary">Saldo Final: {formatCurrency(resultado.totals.saldoFinal)}</span>}
                {resultado.totals.receitaBruta != null && <span className="font-semibold">Receita Bruta: {formatCurrency(resultado.totals.receitaBruta)}</span>}
                {resultado.totals.receitaLiquida != null && <span className="font-semibold">Receita Líquida: {formatCurrency(resultado.totals.receitaLiquida)}</span>}
                {resultado.totals.resultado != null && <span className={`font-semibold ${resultado.totals.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>Resultado: {formatCurrency(resultado.totals.resultado)}</span>}
              </div>
            )}
          </div>
        </div>
      </PreviewModal>
    </AppLayout>
  );
}
