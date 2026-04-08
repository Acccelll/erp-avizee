import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { SummaryCard, type SummaryCardProps } from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from "@/components/ui/MultiSelect";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { DataTable } from '@/components/DataTable';
import { PreviewModal } from '@/components/ui/PreviewModal';
import { BarChart3, Package, Wallet, ShoppingCart, TrendingUp, Truck, Download, RefreshCcw, Hash, AlertTriangle, DollarSign, FileText, Eye, ArrowLeftRight, FileSpreadsheet, CalendarClock, Receipt } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { carregarRelatorio, exportarCsv, exportarXlsx, formatCellValue, type RelatorioResultado, type TipoRelatorio } from '@/services/relatorios.service';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type ReportCard = { type: TipoRelatorio; title: string; description: string; icon: typeof Package };

const reportGroups: Array<{ label: string; icon: typeof Package; reports: ReportCard[] }> = [
  {
    label: 'Comercial',
    icon: ShoppingCart,
    reports: [
      { type: 'vendas', title: 'Vendas', description: 'Ordens por período e faturamento', icon: ShoppingCart },
      { type: 'vendas_cliente', title: 'Vendas/Cliente', description: 'Ranking de clientes por volume', icon: ShoppingCart },
      { type: 'faturamento', title: 'Faturamento', description: 'NFs de saída confirmadas com impostos', icon: Receipt },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    reports: [
      { type: 'financeiro', title: 'Financeiro', description: 'Contas a pagar e receber', icon: Wallet },
      { type: 'fluxo_caixa', title: 'Fluxo de Caixa', description: 'Entradas, saídas e saldo', icon: TrendingUp },
      { type: 'aging', title: 'Aging', description: 'Vencidos por faixa de dias', icon: CalendarClock },
      { type: 'dre', title: 'DRE', description: 'Demonstrativo de resultado', icon: BarChart3 },
    ],
  },
  {
    label: 'Estoque / Suprimentos',
    icon: Package,
    reports: [
      { type: 'estoque', title: 'Estoque', description: 'Posição atual, custo e alertas', icon: Package },
      { type: 'estoque_minimo', title: 'Estoque Mínimo', description: 'Produtos abaixo do mínimo', icon: AlertTriangle },
      { type: 'movimentos_estoque', title: 'Movimentos', description: 'Entradas, saídas e ajustes por período', icon: ArrowLeftRight },
      { type: 'compras', title: 'Compras', description: 'Consolidado por fornecedor', icon: Truck },
      { type: 'compras_fornecedor', title: 'Compras/Fornecedor', description: 'Ranking de fornecedores', icon: Truck },
    ],
  },
  {
    label: 'Gerencial',
    icon: BarChart3,
    reports: [
      { type: 'curva_abc', title: 'Curva ABC', description: 'Classificação por faturamento', icon: TrendingUp },
      { type: 'margem_produtos', title: 'Margem', description: 'Análise de margem por produto', icon: DollarSign },
    ],
  },
  {
    label: 'Integridade',
    icon: AlertTriangle,
    reports: [
      { type: 'divergencias', title: 'Divergências', description: 'Pedidos sem NF, NF sem financeiro', icon: AlertTriangle },
    ],
  },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
];

const STATUS_KEYS = new Set(['status', 'situacao', 'faturamento']);
const MONETARY_KEYS = ['valor', 'custo', 'venda', 'total', 'receita', 'imposto', 'frete', 'desconto', 'lucro', 'ticket', 'saldo', 'bruto', 'liquido', 'reposicao', 'margem', 'markup'];

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
        // Add warning at bottom of last page
        y += 10;
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(180, 0, 0);
        doc.text(
          `⚠ PDF limitado a 200 de ${rows.length} registros. Use "Exportar Excel" para o relatório completo.`,
          margin, y
        );
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

function getToday(): [string, string] {
  const d = new Date().toISOString().slice(0, 10);
  return [d, d];
}

function getCurrentMonth(): [string, string] {
  const n = new Date();
  const start = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
  const end = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10);
  return [start, end];
}

function getPreviousMonth(): [string, string] {
  const n = new Date();
  const m = n.getMonth() === 0 ? 11 : n.getMonth() - 1;
  const y = n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return [start, end];
}

function getCurrentYear(): [string, string] {
  const y = new Date().getFullYear();
  return [`${y}-01-01`, `${y}-12-31`];
}

function buildKpis(tipoRel: TipoRelatorio, res: RelatorioResultado): SummaryCardProps[] {
  const rows = res.rows as Record<string, unknown>[];
  const totals = res.totals || {};
  const chartData = res.chartData || [];

  switch (tipoRel) {
    case 'estoque': {
      const alertas = rows.filter((r) => r.situacao !== 'OK').length;
      return [
        { title: 'Total de Itens', value: formatNumber(rows.length), icon: Package },
        { title: 'Valor em Estoque', value: formatCurrency(totals.totalCusto ?? 0), icon: DollarSign, variant: 'info' },
        { title: 'Abaixo do Mínimo', value: String(alertas), icon: AlertTriangle, variant: alertas > 0 ? 'danger' : 'default', variationType: alertas > 0 ? 'negative' : 'neutral', variation: alertas > 0 ? 'reposição necessária' : 'estoque OK' },
      ];
    }
    case 'estoque_minimo':
      return [
        { title: 'Itens Críticos', value: formatNumber(rows.length), icon: AlertTriangle, variant: rows.length > 0 ? 'danger' : 'default', variationType: rows.length > 0 ? 'negative' : 'neutral', variation: 'abaixo do mínimo' },
        { title: 'Custo de Reposição', value: formatCurrency(totals.custoTotal ?? 0), icon: DollarSign, variant: 'warning' },
      ];
    case 'movimentos_estoque':
      return [
        { title: 'Movimentos', value: formatNumber(rows.length), icon: ArrowLeftRight },
        { title: 'Entradas', value: formatNumber(totals.totalEntradas ?? 0), icon: TrendingUp, variant: 'success' },
        { title: 'Saídas', value: formatNumber(totals.totalSaidas ?? 0), icon: Package, variant: 'warning' },
      ];
    case 'financeiro': {
      const receber = chartData.find((c) => c.name === 'Receber')?.value ?? 0;
      const pagar = chartData.find((c) => c.name === 'Pagar')?.value ?? 0;
      const vencidos = rows.filter((r) => r.status === 'vencido').length;
      return [
        { title: 'A Receber', value: formatCurrency(receber), icon: TrendingUp, variant: 'success' },
        { title: 'A Pagar', value: formatCurrency(pagar), icon: Wallet, variant: 'danger' },
        { title: 'Vencidos', value: String(vencidos), icon: AlertTriangle, variant: vencidos > 0 ? 'danger' : 'default', variationType: vencidos > 0 ? 'negative' : 'neutral', variation: vencidos > 0 ? 'títulos vencidos' : 'sem vencidos' },
      ];
    }
    case 'fluxo_caixa': {
      const sf = totals.saldoFinal ?? 0;
      return [
        { title: 'Total Entradas', value: formatCurrency(totals.totalEntradas ?? 0), icon: TrendingUp, variant: 'success' },
        { title: 'Total Saídas', value: formatCurrency(totals.totalSaidas ?? 0), icon: Wallet, variant: 'danger' },
        { title: 'Saldo Final', value: formatCurrency(sf), icon: DollarSign, variant: sf >= 0 ? 'success' : 'danger', variationType: sf >= 0 ? 'positive' : 'negative', variation: sf >= 0 ? 'saldo positivo' : 'saldo negativo' },
      ];
    }
    case 'vendas': {
      const totalVendas = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const ticket = rows.length > 0 ? totalVendas / rows.length : 0;
      return [
        { title: 'Pedidos', value: formatNumber(rows.length), icon: ShoppingCart },
        { title: 'Valor Total', value: formatCurrency(totalVendas), icon: DollarSign, variant: 'info' },
        { title: 'Ticket Médio', value: formatCurrency(ticket), icon: TrendingUp },
      ];
    }
    case 'faturamento':
      return [
        { title: 'NFs Emitidas', value: formatNumber(rows.length), icon: Receipt },
        { title: 'Receita Bruta', value: formatCurrency(totals.totalBruto ?? 0), icon: DollarSign, variant: 'info' },
        { title: 'Receita Líquida', value: formatCurrency(totals.totalLiquido ?? 0), icon: TrendingUp, variant: 'success' },
        { title: 'Impostos', value: formatCurrency(totals.totalImpostos ?? 0), icon: FileText, variant: 'warning' },
      ];
    case 'vendas_cliente': {
      const totalVC = rows.reduce((s, r) => s + Number(r.valorTotal ?? 0), 0);
      const ticketVC = rows.length > 0 ? totalVC / rows.length : 0;
      return [
        { title: 'Clientes', value: formatNumber(rows.length), icon: ShoppingCart },
        { title: 'Volume Total', value: formatCurrency(totalVC), icon: DollarSign, variant: 'info' },
        { title: 'Ticket Médio', value: formatCurrency(ticketVC), icon: TrendingUp },
      ];
    }
    case 'compras': {
      const totalCompras = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
      return [
        { title: 'Pedidos', value: formatNumber(rows.length), icon: Truck },
        { title: 'Valor Total', value: formatCurrency(totalCompras), icon: DollarSign, variant: 'info' },
      ];
    }
    case 'compras_fornecedor': {
      const totalCF = rows.reduce((s, r) => s + Number(r.valorTotal ?? 0), 0);
      const ticketCF = rows.length > 0 ? totalCF / rows.length : 0;
      return [
        { title: 'Fornecedores', value: formatNumber(rows.length), icon: Truck },
        { title: 'Volume Total', value: formatCurrency(totalCF), icon: DollarSign, variant: 'info' },
        { title: 'Ticket Médio', value: formatCurrency(ticketCF), icon: TrendingUp },
      ];
    }
    case 'aging': {
      const vencidosAging = rows.filter((r) => r.faixa !== 'A vencer').length;
      const critico = rows.filter((r) => r.faixa === '90+ dias').reduce((s, r) => s + Number(r.valor ?? 0), 0);
      return [
        { title: 'Títulos Vencidos', value: formatNumber(vencidosAging), icon: CalendarClock, variant: vencidosAging > 0 ? 'danger' : 'default' },
        { title: 'Valor Total', value: formatCurrency(totals.totalValor ?? 0), icon: DollarSign, variant: 'warning' },
        { title: 'Crítico (90+ dias)', value: formatCurrency(critico), icon: AlertTriangle, variant: critico > 0 ? 'danger' : 'default' },
      ];
    }
    case 'dre': {
      const rb = totals.receitaBruta ?? 0;
      const rl = totals.receitaLiquida ?? 0;
      const resul = totals.resultado ?? 0;
      return [
        { title: 'Receita Bruta', value: formatCurrency(rb), icon: TrendingUp, variant: 'info' },
        { title: 'Receita Líquida', value: formatCurrency(rl), icon: DollarSign, variant: rl >= 0 ? 'success' : 'danger' },
        { title: 'Resultado', value: formatCurrency(resul), icon: BarChart3, variant: resul >= 0 ? 'success' : 'danger', variationType: resul >= 0 ? 'positive' : 'negative', variation: resul >= 0 ? 'lucro' : 'prejuízo' },
      ];
    }
    case 'curva_abc': {
      const classA = rows.filter((r) => r.classe === 'A').length;
      return [
        { title: 'Produtos', value: formatNumber(rows.length), icon: Package },
        { title: 'Faturamento Total', value: formatCurrency(totals.grandTotal ?? 0), icon: DollarSign, variant: 'info' },
        { title: 'Classe A', value: formatNumber(classA), icon: TrendingUp, variant: 'success', variation: 'itens estratégicos' },
      ];
    }
    case 'margem_produtos': {
      const media = totals.mediaMargemPct ?? 0;
      return [
        { title: 'Produtos', value: formatNumber(rows.length), icon: Package },
        { title: 'Margem Média', value: `${media}%`, icon: TrendingUp, variant: media > 0 ? 'success' : 'danger' },
      ];
    }
    case 'divergencias': {
      const pedSemNf = rows.filter((r) => r.tipo === 'Pedido s/ NF').length;
      const nfSemFin = rows.filter((r) => r.tipo === 'NF s/ Financeiro').length;
      return [
        { title: 'Total Divergências', value: formatNumber(rows.length), icon: AlertTriangle, variant: rows.length > 0 ? 'danger' : 'default' },
        { title: 'Pedidos s/ NF', value: formatNumber(pedSemNf), icon: FileText, variant: pedSemNf > 0 ? 'warning' : 'default' },
        { title: 'NF s/ Financeiro', value: formatNumber(nfSemFin), icon: Wallet, variant: nfSemFin > 0 ? 'warning' : 'default' },
      ];
    }
    default:
      return [{ title: 'Registros', value: formatNumber(rows.length), icon: Hash }];
  }
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
  const [dreCompetencia, setDreCompetencia] = useState<'mes' | 'trimestre' | 'ano' | 'personalizado'>('mes');
  const [dreMes, setDreMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [clientes, setClientes] = useState<{ id: string; nome_razao_social: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome_razao_social: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<RelatorioResultado>({ title: '', subtitle: '', rows: [] });
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedReport = tipo;

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

  const loadData = async () => {
    setLoading(true);
    try {
      const filtros = selectedReport === 'dre'
        ? { ...getDreDateRange(), clienteId: undefined, fornecedorId: undefined, grupoProdutoId: undefined }
        : {
            dataInicio,
            dataFim,
            clienteIds: filtroClienteIds.length > 0 ? filtroClienteIds : undefined,
            fornecedorIds: filtroFornecedorIds.length > 0 ? filtroFornecedorIds : undefined,
            grupoProdutoIds: filtroGrupoIds.length > 0 ? filtroGrupoIds : undefined,
            tiposFinanceiros: filtroTipos.length > 0 ? filtroTipos : undefined
          };
      const report = await carregarRelatorio(tipo, filtros);
      setResultado(report);
    } catch (error: unknown) {
      console.error('[relatorios]', error);
      toast.error("Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tipo]);

  const isQtyReport = resultado._isQuantityReport === true;
  const isDreReport = resultado._isDreReport === true;

  const columns = useMemo(() => {
    if (!resultado.rows.length) return [];
    return Object.keys(resultado.rows[0]).map((key) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      render: (item: Record<string, unknown>): React.ReactNode => {
        const value = item[key];

        if (STATUS_KEYS.has(key) && typeof value === 'string') {
          return <StatusBadge status={value} />;
        }

        if (key === 'classe' && typeof value === 'string') {
          const classColors: Record<string, string> = {
            A: 'bg-success/10 text-success border-success/20',
            B: 'bg-warning/10 text-warning border-warning/20',
            C: 'bg-muted text-muted-foreground border-muted',
          };
          return (
            <Badge variant="outline" className={`text-xs font-semibold ${classColors[value] ?? 'bg-muted text-muted-foreground border-muted'}`}>
              {value}
            </Badge>
          );
        }

        const formatted = formatCellValue(value, key, isQtyReport);

        if (typeof value === 'number' && !isQtyReport) {
          const lower = key.toLowerCase();
          const isMonetary = MONETARY_KEYS.some((k) => lower.includes(k));
          if (isMonetary) {
            return <span className="block w-full text-right font-mono">{formatted as React.ReactNode}</span>;
          }
        }

        return formatted as React.ReactNode;
      },
    }));
  }, [resultado.rows, isQtyReport]);

  const handleSelectTipo = (nextTipo: TipoRelatorio) => {
    setFiltroClienteIds([]);
    setFiltroFornecedorIds([]);
    setFiltroGrupoIds([]);
    setFiltroTipos([]);
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

  const handleExportPdf = async () => {
    if (resultado && resultado.rows.length > 200) {
      toast.warning(
        `Este relatório tem ${resultado.rows.length} registros. O PDF mostrará apenas os primeiros 200. Use "Exportar Excel" para exportar tudo.`,
        { duration: 8000 }
      );
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

  const getDreDateRange = () => {
    if (dreCompetencia === 'personalizado') return { dataInicio, dataFim };
    const now = new Date();
    if (dreCompetencia === 'mes') {
      const [y, m] = dreMes.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2,'0')}-01`;
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      return { dataInicio: start, dataFim: end };
    }
    if (dreCompetencia === 'trimestre') {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10);
      return { dataInicio: start, dataFim: end };
    }
    return {
      dataInicio: `${now.getFullYear()}-01-01`,
      dataFim: `${now.getFullYear()}-12-31`,
    };
  };

  return (
    <AppLayout>
      <ModulePage title="Relatórios" subtitle="Análises gerenciais, exportações e visão consolidada por módulo.">
        <div className="space-y-6">
          {/* Report type selector — grouped by business area */}
          <div className="space-y-4">
            {reportGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <group.icon className="h-3.5 w-3.5" />
                  {group.label}
                </p>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {group.reports.map((card) => (
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
              </div>
            ))}
          </div>

          {/* KPI Summary — contextual per report type */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {buildKpis(tipo, resultado).map((kpi, i) => (
              <SummaryCard key={i} {...kpi} loading={loading} />
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-5 pb-4">
              {/* Period shortcuts */}
              {tipo !== 'dre' && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {[
                    { label: 'Hoje', fn: () => { const [s, e] = getToday(); setDataInicio(s); setDataFim(e); } },
                    { label: 'Este mês', fn: () => { const [s, e] = getCurrentMonth(); setDataInicio(s); setDataFim(e); } },
                    { label: 'Mês anterior', fn: () => { const [s, e] = getPreviousMonth(); setDataInicio(s); setDataFim(e); } },
                    { label: 'Este ano', fn: () => { const [s, e] = getCurrentYear(); setDataInicio(s); setDataFim(e); } },
                  ].map(({ label, fn }) => (
                    <button key={label} type="button" onClick={fn} className="text-xs px-2 py-0.5 rounded border border-border bg-muted/50 hover:bg-muted transition-colors">
                      {label}
                    </button>
                  ))}
                  {(dataInicio || dataFim) && (
                    <button type="button" onClick={() => { setDataInicio(''); setDataFim(''); }} className="text-xs px-2 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                      ✕ Limpar
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data inicial</Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 w-[160px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data final</Label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 w-[160px]" />
                </div>
                <div className="ml-auto">
                  <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5"><RefreshCcw className="h-3.5 w-3.5" />Atualizar</Button>
                </div>
              </div>

              {/* Filtros contextuais */}
              <div className="flex flex-wrap gap-3 items-end mt-3">
                {['vendas', 'faturamento', 'aging', 'curva_abc', 'vendas_cliente'].includes(selectedReport || '') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Clientes</Label>
                    <MultiSelect
                      options={clientes.map(c => ({ label: c.nome_razao_social, value: c.id }))}
                      selected={filtroClienteIds}
                      onChange={setFiltroClienteIds}
                      placeholder="Todos os clientes"
                      className="w-[250px]"
                    />
                  </div>
                )}

                {['compras', 'compras_fornecedor'].includes(selectedReport || '') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Fornecedores</Label>
                    <MultiSelect
                      options={fornecedores.map(f => ({ label: f.nome_razao_social, value: f.id }))}
                      selected={filtroFornecedorIds}
                      onChange={setFiltroFornecedorIds}
                      placeholder="Todos os fornecedores"
                      className="w-[250px]"
                    />
                  </div>
                )}

                {['estoque', 'estoque_minimo', 'movimentos_estoque', 'margem_produtos', 'curva_abc'].includes(selectedReport || '') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Grupos de Produto</Label>
                    <MultiSelect
                      options={grupos.map(g => ({ label: g.nome, value: g.id }))}
                      selected={filtroGrupoIds}
                      onChange={setFiltroGrupoIds}
                      placeholder="Todos os grupos"
                      className="w-[220px]"
                    />
                  </div>
                )}

                {['financeiro', 'aging'].includes(selectedReport || '') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Tipos</Label>
                    <MultiSelect
                      options={[
                        { label: "A Receber", value: "receber" },
                        { label: "A Pagar", value: "pagar" },
                      ]}
                      selected={filtroTipos}
                      onChange={setFiltroTipos}
                      placeholder="Todos"
                      className="w-[180px]"
                    />
                  </div>
                )}
              </div>

              {selectedReport === 'dre' && (
                <div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Competência</Label>
                    <Select value={dreCompetencia} onValueChange={(v: any) => setDreCompetencia(v)}>
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
                      <Input
                        type="month"
                        value={dreMes}
                        onChange={(e) => setDreMes(e.target.value)}
                        className="h-9 w-[160px]"
                      />
                    </div>
                  )}
                  {dreCompetencia === 'trimestre' && (
                    <p className="text-xs text-muted-foreground self-end pb-2">
                      {(() => { const q = Math.floor(new Date().getMonth()/3)+1; return `${q}º trimestre de ${new Date().getFullYear()}`; })()}
                    </p>
                  )}
                  {dreCompetencia === 'ano' && (
                    <p className="text-xs text-muted-foreground self-end pb-2">
                      Exercício {new Date().getFullYear()}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report + Chart */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-start gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{resultado.title || 'Relatório'}</CardTitle>
                  <CardDescription>{resultado.subtitle}</CardDescription>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)} disabled={!resultado.rows.length} className="gap-1.5 text-xs h-8"><Eye className="h-3.5 w-3.5" />Visualizar</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs h-8"><FileText className="h-3.5 w-3.5" />PDF</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportXlsx} disabled={!resultado.rows.length} className="gap-1.5 text-xs h-8"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</Button>
                  <Button variant="ghost" size="sm" onClick={handleExportCsv} className="gap-1.5 text-xs h-8"><Download className="h-3.5 w-3.5" />CSV</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isDreReport ? (
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <tbody>
                         {(resultado.rows as Array<Record<string, unknown>>).map((row, i) => {
                          const tipo = row.tipo as string | undefined;
                          const valor = row.valor as number | undefined;
                          const linha = row.linha as string | undefined;
                          return (
                          <tr key={i} className={
                            tipo === "header" ? "bg-primary/5 font-bold" :
                            tipo === "subtotal" ? "bg-muted/50 font-semibold border-t" :
                            tipo === "resultado" ? "bg-primary/10 font-bold text-lg border-t-2 border-primary/30" :
                            "text-muted-foreground"
                          }>
                            <td className={`px-4 py-3 ${tipo === "deducao" ? "pl-8" : ""}`}>{linha}</td>
                            <td className={`px-4 py-3 text-right font-mono ${(valor ?? 0) < 0 ? "text-destructive" : ""}`}>
                              {formatCurrency(valor ?? 0)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <DataTable columns={columns} data={resultado.rows as Record<string, unknown>[]} loading={loading} />
                )}
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
        </div>
      </ModulePage>

      {/* Preview Modal */}
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
          {/* Report header */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-foreground">{resultado.title}</h2>
            <p className="text-sm text-muted-foreground">{resultado.subtitle}</p>
            <p className="text-xs text-muted-foreground mt-1">Período: {periodoLabel}</p>
          </div>

          {/* Preview table */}
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

          {/* Totals */}
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
            {!resultado.totals && (() => { const total = (resultado.chartData ?? []).reduce((s, c) => s + c.value, 0); return total > 0 ? <span className="font-semibold text-foreground">Valor consolidado: {formatCurrency(total)}</span> : null; })()}
          </div>
        </div>
      </PreviewModal>
    </AppLayout>
  );
}
