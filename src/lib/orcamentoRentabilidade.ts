import type { OrcamentoItem } from "@/components/Orcamento/OrcamentoItemsGrid";

export type InternalCostSource = "ultimo_custo_compra" | "custo_medio" | "custo_manual_cotacao" | "custo_produto" | "indisponivel";
export type MarginStatus = "saudavel" | "atencao" | "critica" | "negativa" | "indisponivel";

export interface MarginThresholds {
  healthy: number;
  attention: number;
  critical: number;
  minimum: number;
}

export const DEFAULT_MARGIN_THRESHOLDS: MarginThresholds = {
  healthy: 0.2,
  attention: 0.12,
  critical: 0.05,
  minimum: 0.1,
};

export interface InternalCostCandidate {
  productCost?: number | null;
}

export interface RentabilidadeContext {
  descontoGlobal: number;
  frete: number;
  impostoSt: number;
  impostoIpi: number;
  outrasDespesas: number;
}

export interface RentabilidadeItem {
  itemIndex: number;
  produtoId: string;
  descricao: string;
  quantidade: number;
  precoVendaUnitario: number;
  descontoPercentual: number;
  descontoRateadoUnitario: number;
  vendaLiquidaUnitaria: number;
  vendaTotalLiquida: number;
  custoBaseUnitario: number | null;
  custoPadraoUnitario: number | null;
  custoSimuladoUnitario: number | null;
  usaCustoSimulado: boolean;
  custoSource: InternalCostSource;
  freteRateadoUnitario: number;
  impostoRateadoUnitario: number;
  outrosCustosRateadosUnitario: number;
  custoFinalUnitario: number | null;
  lucroUnitario: number | null;
  lucroTotal: number | null;
  margemPercentual: number | null;
  margemStatus: MarginStatus;
  alerts: string[];
}

export interface RentabilidadeResumo {
  custoTotalProdutos: number;
  vendaTotalLiquida: number;
  frete: number;
  impostos: number;
  descontos: number;
  outrosCustos: number;
  lucroBrutoTotal: number;
  lucroLiquidoEstimado: number;
  margemGeralPercentual: number;
  margemMinimaAtingida: boolean;
}

export interface RentabilidadeAnalise {
  items: RentabilidadeItem[];
  resumo: RentabilidadeResumo;
  alerts: string[];
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const safeNumber = (value: number | null | undefined) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function getCustoBaseAnalise(item: OrcamentoItem, candidate: InternalCostCandidate): { custoBasePadrao: number | null; custoBaseAnalise: number | null; source: InternalCostSource } {
  const custoPadrao = candidate.productCost != null && candidate.productCost > 0 ? candidate.productCost : null;
  const usaSimulado = Boolean(item.usa_custo_simulado) && (item.custo_simulado ?? null) != null && Number(item.custo_simulado) >= 0;

  if (usaSimulado) {
    return { custoBasePadrao: custoPadrao, custoBaseAnalise: Number(item.custo_simulado), source: "custo_manual_cotacao" };
  }

  if (custoPadrao != null) {
    return { custoBasePadrao: custoPadrao, custoBaseAnalise: custoPadrao, source: "custo_produto" };
  }

  return { custoBasePadrao: null, custoBaseAnalise: null, source: "indisponivel" };
}

export function getOrigemCustoAnalise(item: OrcamentoItem): "cadastro_produto" | "simulado" {
  return item.usa_custo_simulado && (item.custo_simulado ?? null) != null ? "simulado" : "cadastro_produto";
}

function getMarginStatus(margin: number | null, thresholds: MarginThresholds): MarginStatus {
  if (margin == null) return "indisponivel";
  if (margin < 0) return "negativa";
  if (margin < thresholds.critical) return "critica";
  if (margin < thresholds.attention) return "atencao";
  return "saudavel";
}

export function calcularRentabilidade(
  items: OrcamentoItem[],
  context: RentabilidadeContext,
  getCostCandidate: (item: OrcamentoItem) => InternalCostCandidate,
  thresholds: MarginThresholds = DEFAULT_MARGIN_THRESHOLDS,
): RentabilidadeAnalise {
  const validItems = items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => item.produto_id);
  const totalBrutoItens = validItems.reduce((sum, { item }) => sum + safeNumber(item.quantidade) * safeNumber(item.valor_unitario), 0);
  const descontoGlobal = Math.max(0, safeNumber(context.descontoGlobal));
  const frete = Math.max(0, safeNumber(context.frete));
  const impostos = Math.max(0, safeNumber(context.impostoSt) + safeNumber(context.impostoIpi));
  const outrosCustos = Math.max(0, safeNumber(context.outrasDespesas));

  const analysisItems = validItems.map(({ item, originalIndex }): RentabilidadeItem => {
    const quantidade = safeNumber(item.quantidade);
    const precoVendaUnitario = safeNumber(item.valor_unitario);
    const descontoPercentual = safeNumber(item.desconto_percentual);
    const descontoItemUnitario = precoVendaUnitario * (descontoPercentual / 100);
    const vendaAposDescontoItemUnitario = precoVendaUnitario - descontoItemUnitario;
    const baseRateio = quantidade * precoVendaUnitario;
    const percentualRateio = totalBrutoItens > 0 ? baseRateio / totalBrutoItens : 0;
    const descontoGlobalRateadoUnitario = quantidade > 0 ? (descontoGlobal * percentualRateio) / quantidade : 0;
    const vendaLiquidaUnitaria = round2(Math.max(0, vendaAposDescontoItemUnitario - descontoGlobalRateadoUnitario));

    const freteRateadoUnitario = quantidade > 0 ? round2((frete * percentualRateio) / quantidade) : 0;
    const impostoRateadoUnitario = quantidade > 0 ? round2((impostos * percentualRateio) / quantidade) : 0;
    const outrosCustosRateadosUnitario = quantidade > 0 ? round2((outrosCustos * percentualRateio) / quantidade) : 0;

    const { custoBaseAnalise, custoBasePadrao, source } = getCustoBaseAnalise(item, getCostCandidate(item));
    const custoFinalUnitario = custoBaseAnalise == null
      ? null
      : round2(custoBaseAnalise + freteRateadoUnitario + impostoRateadoUnitario + outrosCustosRateadosUnitario);

    const lucroUnitario = custoFinalUnitario == null ? null : round2(vendaLiquidaUnitaria - custoFinalUnitario);
    const lucroTotal = lucroUnitario == null ? null : round2(lucroUnitario * quantidade);
    const margemPercentual = vendaLiquidaUnitaria > 0 && lucroUnitario != null ? lucroUnitario / vendaLiquidaUnitaria : null;
    const margemStatus = getMarginStatus(margemPercentual, thresholds);

    const alerts: string[] = [];
    if (custoFinalUnitario == null) alerts.push("Custo indisponível");
    if (lucroUnitario != null && lucroUnitario < 0) alerts.push("Item com lucro negativo");
    if (margemPercentual != null && margemPercentual < thresholds.minimum) alerts.push("Margem abaixo da mínima");
    if (descontoPercentual > 0 && margemPercentual != null && margemPercentual < thresholds.attention) alerts.push("Desconto comprometeu a margem");
    if (custoBaseAnalise != null && custoFinalUnitario != null && custoFinalUnitario > custoBaseAnalise) alerts.push("Frete/impostos reduziram a rentabilidade");

    return {
      itemIndex: originalIndex,
      produtoId: item.produto_id,
      descricao: item.descricao_snapshot || "Item sem descrição",
      quantidade,
      precoVendaUnitario,
      descontoPercentual,
      descontoRateadoUnitario: round2(descontoItemUnitario + descontoGlobalRateadoUnitario),
      vendaLiquidaUnitaria,
      vendaTotalLiquida: round2(vendaLiquidaUnitaria * quantidade),
      custoBaseUnitario: custoBaseAnalise,
      custoPadraoUnitario: custoBasePadrao,
      custoSimuladoUnitario: item.custo_simulado ?? null,
      usaCustoSimulado: Boolean(item.usa_custo_simulado),
      custoSource: source,
      freteRateadoUnitario,
      impostoRateadoUnitario,
      outrosCustosRateadosUnitario,
      custoFinalUnitario,
      lucroUnitario,
      lucroTotal,
      margemPercentual,
      margemStatus,
      alerts,
    };
  });

  const vendaTotalLiquida = round2(analysisItems.reduce((sum, item) => sum + item.vendaTotalLiquida, 0));
  const custoTotalProdutos = round2(analysisItems.reduce((sum, item) => sum + (item.custoFinalUnitario ?? 0) * item.quantidade, 0));
  const lucroBrutoTotal = round2(vendaTotalLiquida - custoTotalProdutos);
  const lucroLiquidoEstimado = lucroBrutoTotal;
  const margemGeralPercentual = vendaTotalLiquida > 0 ? lucroBrutoTotal / vendaTotalLiquida : 0;

  const alerts = new Set<string>();
  analysisItems.forEach((item) => item.alerts.forEach((alert) => alerts.add(alert)));

  return {
    items: analysisItems,
    resumo: {
      custoTotalProdutos,
      vendaTotalLiquida,
      frete,
      impostos,
      descontos: descontoGlobal,
      outrosCustos,
      lucroBrutoTotal,
      lucroLiquidoEstimado,
      margemGeralPercentual,
      margemMinimaAtingida: margemGeralPercentual >= thresholds.minimum,
    },
    alerts: [...alerts],
  };
}
