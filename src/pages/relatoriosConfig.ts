import { type TipoRelatorio } from '@/services/relatorios.service';
import { AlertTriangle, ArrowLeftRight, BarChart3, CalendarClock, DollarSign, Package, PieChart as PieChartIcon, Receipt, ShoppingCart, TrendingUp, Truck, Wallet } from 'lucide-react';

export type ReportCategory = 'comercial' | 'financeiro' | 'estoque_suprimentos' | 'fiscal_faturamento';
export type ChartMode = 'bar' | 'pie' | 'line' | 'auto';
export type FilterKey = 'periodo' | 'periodo_pagamento' | 'cliente' | 'fornecedor' | 'grupo' | 'status' | 'tipos_financeiros' | 'top_n' | 'somente_criticos' | 'somente_com_saldo' | 'somente_zerados' | 'somente_abaixo_minimo' | 'margem_negativa' | 'somente_com_estoque' | 'faixa_aging' | 'origem' | 'competencia_dre';

export interface ReportMeta {
  type: TipoRelatorio;
  title: string;
  description: string;
  objective: string;
  category: ReportCategory;
  icon: typeof Package;
  priority?: number;
  chartMode: ChartMode;
  supportedFilters: FilterKey[];
  defaultColumns: string[];
  kpiKeys: string[];
  drilldowns: string[];
}

export const REPORTS_META: Record<TipoRelatorio, ReportMeta> = {
  estoque: {
    type: 'estoque', title: 'Estoque', description: 'Posição atual com custo, venda e criticidade.', objective: 'Mostrar posição de estoque com leitura operacional e potencial financeiro.', category: 'estoque_suprimentos', icon: Package, priority: 2, chartMode: 'pie',
    supportedFilters: ['grupo', 'status', 'somente_com_saldo', 'somente_criticos'],
    defaultColumns: ['codigo', 'produto', 'grupo', 'unidade', 'estoqueAtual', 'estoqueMinimo', 'situacao', 'custoUnit', 'totalCusto', 'vendaUnit', 'totalVenda'],
    kpiKeys: ['total_itens', 'quantidade_total', 'custo_total', 'valor_total_potencial', 'itens_criticos', 'itens_zerados'],
    drilldowns: ['produto', 'movimentacoes_estoque'],
  },
  estoque_minimo: {
    type: 'estoque_minimo', title: 'Estoque Mínimo', description: 'Ruptura e risco de abastecimento.', objective: 'Priorizar reposição de itens críticos.', category: 'estoque_suprimentos', icon: AlertTriangle, priority: 1, chartMode: 'bar',
    supportedFilters: ['grupo', 'status', 'somente_zerados', 'somente_abaixo_minimo'],
    defaultColumns: ['codigo', 'produto', 'grupo', 'estoqueAtual', 'estoqueMinimo', 'deficit', 'criticidade', 'custoReposicao'],
    kpiKeys: ['itens_criticos', 'itens_zerados', 'deficit_total', 'custo_reposicao'],
    drilldowns: ['produto', 'compras'],
  },
  movimentos_estoque: {
    type: 'movimentos_estoque', title: 'Movimentos de Estoque', description: 'Trilha operacional das movimentações.', objective: 'Monitorar entradas, saídas e ajustes com rastreabilidade.', category: 'estoque_suprimentos', icon: ArrowLeftRight, chartMode: 'line',
    supportedFilters: ['periodo', 'grupo', 'status', 'origem'],
    defaultColumns: ['data', 'produto', 'tipo', 'origem', 'documento', 'quantidade', 'saldoAnterior', 'saldoPosterior', 'usuario', 'motivo'],
    kpiKeys: ['total_movimentos', 'entradas', 'saidas', 'ajustes'],
    drilldowns: ['produto', 'documento_origem'],
  },
  financeiro: {
    type: 'financeiro', title: 'Financeiro', description: 'Títulos a pagar e receber.', objective: 'Consolidar carteira financeira por vencimento, pagamento e status.', category: 'financeiro', icon: Wallet, priority: 1, chartMode: 'pie',
    supportedFilters: ['periodo', 'periodo_pagamento', 'cliente', 'fornecedor', 'status', 'tipos_financeiros', 'origem'],
    defaultColumns: ['tipo', 'parceiro', 'documento', 'descricao', 'origem', 'vencimento', 'pagamento', 'valorOriginal', 'valorAberto', 'valorPago', 'status', 'atrasoDias', 'formaPagamento', 'banco'],
    kpiKeys: ['total_aberto', 'vencido', 'pago', 'a_pagar', 'a_receber'],
    drilldowns: ['lancamento_financeiro', 'nota_fiscal', 'cliente', 'fornecedor'],
  },
  fluxo_caixa: {
    type: 'fluxo_caixa', title: 'Fluxo de Caixa', description: 'Entradas, saídas e saldo cronológico.', objective: 'Ler comportamento de caixa previsto e realizado.', category: 'financeiro', icon: TrendingUp, priority: 1, chartMode: 'line',
    supportedFilters: ['periodo', 'status', 'origem', 'cliente', 'fornecedor'],
    defaultColumns: ['data', 'parceiro', 'descricao', 'origem', 'entrada', 'saida', 'saldoAcumulado', 'status', 'previstoRealizado'],
    kpiKeys: ['entradas', 'saidas', 'saldo_periodo', 'saldo_acumulado', 'previsto_receber', 'previsto_pagar'],
    drilldowns: ['lancamento_financeiro', 'parceiro'],
  },
  vendas: {
    type: 'vendas', title: 'Vendas', description: 'Pedidos de venda com leitura comercial.', objective: 'Separar evolução comercial de faturamento.', category: 'comercial', icon: ShoppingCart, chartMode: 'line',
    supportedFilters: ['periodo', 'cliente', 'status'],
    defaultColumns: ['numero', 'cliente', 'emissao', 'valor', 'statusComercial', 'statusFaturamento', 'prazo', 'situacaoOperacional'],
    kpiKeys: ['quantidade_pedidos', 'total_vendido', 'ticket_medio', 'aguardando_faturamento', 'faturado', 'parcial'],
    drilldowns: ['pedido_venda', 'cliente', 'faturamento'],
  },
  vendas_cliente: {
    type: 'vendas_cliente', title: 'Vendas por Cliente', description: 'Ranking e concentração por cliente.', objective: 'Identificar concentração e dependência comercial.', category: 'comercial', icon: ShoppingCart, chartMode: 'bar',
    supportedFilters: ['periodo', 'cliente', 'top_n'],
    defaultColumns: ['posicao', 'cliente', 'pedidos', 'valorTotal', 'ticketMedio', 'participacao'],
    kpiKeys: ['total_vendido', 'clientes_atendidos', 'ticket_medio_geral', 'top5', 'top10'],
    drilldowns: ['cliente', 'historico_vendas'],
  },
  compras: {
    type: 'compras', title: 'Compras', description: 'Pedidos de compra e andamento.', objective: 'Monitorar entrega, atraso e abertura de compras.', category: 'estoque_suprimentos', icon: Truck, chartMode: 'bar',
    supportedFilters: ['periodo', 'fornecedor', 'status'],
    defaultColumns: ['numero', 'fornecedor', 'compra', 'prevista', 'entrega', 'valor', 'status', 'atrasoDias'],
    kpiKeys: ['quantidade_compras', 'valor_comprado', 'em_aberto', 'atrasadas', 'entregues'],
    drilldowns: ['pedido_compra', 'fornecedor', 'entrada_estoque'],
  },
  compras_fornecedor: {
    type: 'compras_fornecedor', title: 'Compras por Fornecedor', description: 'Ranking e concentração por fornecedor.', objective: 'Entender dependência de compras e performance de fornecedores.', category: 'estoque_suprimentos', icon: Truck, chartMode: 'bar',
    supportedFilters: ['periodo', 'fornecedor', 'top_n'],
    defaultColumns: ['posicao', 'fornecedor', 'pedidos', 'valorTotal', 'ticketMedio', 'participacao'],
    kpiKeys: ['total_comprado', 'fornecedores_ativos', 'ticket_medio', 'top5'],
    drilldowns: ['fornecedor', 'historico_compras'],
  },
  faturamento: {
    type: 'faturamento', title: 'Faturamento', description: 'Faturamento real bruto x líquido.', objective: 'Ler faturamento efetivo com impostos e descontos.', category: 'fiscal_faturamento', icon: Receipt, priority: 2, chartMode: 'line',
    supportedFilters: ['periodo', 'cliente', 'status'],
    defaultColumns: ['data', 'nf', 'cliente', 'ov', 'valorBruto', 'desconto', 'frete', 'impostos', 'valorLiquido', 'status'],
    kpiKeys: ['quantidade_notas', 'bruto', 'impostos', 'liquido', 'ticket_medio'],
    drilldowns: ['nota_fiscal', 'cliente', 'pedido_venda'],
  },
  aging: {
    type: 'aging', title: 'Aging', description: 'Envelhecimento da carteira em aberto.', objective: 'Priorizar cobrança e controle de atraso por faixa.', category: 'financeiro', icon: CalendarClock, chartMode: 'bar',
    supportedFilters: ['periodo', 'tipos_financeiros', 'cliente', 'fornecedor', 'faixa_aging', 'status'],
    defaultColumns: ['tipo', 'parceiro', 'descricao', 'vencimento', 'diasVencido', 'faixa', 'valor', 'status'],
    kpiKeys: ['total_vencido', 'titulos_vencidos', 'concentracao_faixa', 'maior_atraso'],
    drilldowns: ['lancamento_financeiro', 'parceiro'],
  },
  dre: {
    type: 'dre', title: 'DRE', description: 'Demonstrativo gerencial de resultado.', objective: 'Evidenciar resultado simplificado com estrutura preparada para evolução contábil.', category: 'financeiro', icon: BarChart3, priority: 3, chartMode: 'bar',
    supportedFilters: ['competencia_dre', 'periodo'],
    defaultColumns: ['linha', 'valor'],
    kpiKeys: ['receita_bruta', 'receita_liquida', 'lucro_bruto', 'resultado', 'margem_percentual'],
    drilldowns: ['conta_contabil_futura'],
  },
  curva_abc: {
    type: 'curva_abc', title: 'Curva ABC', description: 'Classificação por relevância de faturamento.', objective: 'Classificar produtos por impacto no faturamento.', category: 'comercial', icon: PieChartIcon, chartMode: 'pie',
    supportedFilters: ['periodo', 'grupo', 'top_n', 'status'],
    defaultColumns: ['posicao', 'codigo', 'produto', 'faturamento', 'percentual', 'acumulado', 'classe'],
    kpiKeys: ['total_faturado', 'quantidade_por_classe', 'participacao_por_classe'],
    drilldowns: ['produto', 'faturamento_produto'],
  },
  margem_produtos: {
    type: 'margem_produtos', title: 'Margem', description: 'Rentabilidade potencial por produto.', objective: 'Evidenciar margem potencial com criticidade comercial.', category: 'comercial', icon: DollarSign, chartMode: 'bar',
    supportedFilters: ['grupo', 'status', 'margem_negativa', 'somente_com_estoque'],
    defaultColumns: ['codigo', 'produto', 'grupo', 'custUnit', 'vendaUnit', 'lucroUnit', 'margem', 'markup', 'estoque'],
    kpiKeys: ['media_margem', 'margem_negativa', 'abaixo_minimo', 'maior_margem', 'menor_margem'],
    drilldowns: ['produto', 'politica_preco_futura'],
  },
  divergencias: {
    type: 'divergencias', title: 'Divergências', description: 'Inconsistências entre módulos.', objective: 'Mapear anomalias entre compras, fiscal, estoque e financeiro.', category: 'fiscal_faturamento', icon: AlertTriangle, priority: 2, chartMode: 'bar',
    supportedFilters: ['periodo', 'status', 'origem'],
    defaultColumns: ['tipo', 'referencia', 'parceiro', 'data', 'valor', 'origem', 'status', 'criticidade', 'observacao'],
    kpiKeys: ['total_divergencias', 'valor_impactado', 'por_tipo', 'criticas'],
    drilldowns: ['pedido', 'nf', 'financeiro', 'compra', 'estoque'],
  },
};

export const QUICK_PERIODS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '15d', label: '15 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Mês atual' },
  { id: 'mes_anterior', label: 'Mês anterior' },
] as const;
