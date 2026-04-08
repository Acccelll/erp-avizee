import type { OrcamentoItem } from "@/components/Orcamento/OrcamentoItemsGrid";

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

export interface RentabilidadeScenarioConfig {
  nomeCenario?: string;
  freteTotalSimulado?: number | null;
  impostosTotaisSimulados?: number | null;
  outrosCustosTotaisSimulados?: number | null;
  descontoGlobalSimulado?: number | null;
  reajusteGlobalPrecoPercentual?: number | null;
  reajusteGlobalCustoPercentual?: number | null;
}

export interface RentabilidadeComparativo {
  vendaBase: number;
  vendaCenario: number;
  custoBase: number;
  custoCenario: number;
  lucroBase: number;
  lucroCenario: number;
  margemBase: number;
  margemCenario: number;
  deltaLucro: number;
  deltaMargem: number;
}

export interface RentabilidadeItem {
  itemIndex: number;
  produtoId: string;
  descricao: string;
  quantidade: number;
  usarCenario: boolean;
  precoBaseUnitario: number;
  precoCenarioUnitario: number;
  descontoBase: number;
  descontoCenario: number;
  custoBaseUnitario: number | null;
  custoCenarioUnitario: number | null;
  freteRateadoBase: number;
  freteRateadoSimulado: number;
  impostoRateadoBase: number;
  impostoRateadoSimulado: number;
  outrosCustosBase: number;
  outrosCustosSimulados: number;
  lucroBaseUnitario: number | null;
  lucroCenarioUnitario: number | null;
  margemBasePercentual: number | null;
  margemCenarioPercentual: number | null;
  deltaLucro: number | null;
  deltaMargem: number | null;
  margemStatus: MarginStatus;
  alerts: string[];
}

export interface RentabilidadeResumo {
  freteTotalBase: number;
  freteTotalSimulado: number;
  impostosTotaisBase: number;
  impostosTotaisSimulados: number;
  outrosCustosBase: number;
  outrosCustosSimulados: number;
  descontoGlobalBase: number;
  descontoGlobalSimulado: number;
  cenarioAtivo: boolean;
  nomeCenario?: string;
}

export interface RentabilidadeAnalise {
  items: RentabilidadeItem[];
  resumo: RentabilidadeResumo;
  comparativo: RentabilidadeComparativo;
  alerts: string[];
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const safeNumber = (value: number | null | undefined) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function resolveBaseValue(value: number | null | undefined, fallback = 0): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function resolveScenarioValue(baseValue: number, scenarioValue?: number | null): number {
  if (scenarioValue == null) return baseValue;
  return Math.max(0, Number(scenarioValue));
}

export function resolveScenarioEffectiveValue(baseValue: number, scenarioValue: number, useScenario: boolean): number {
  return useScenario ? scenarioValue : baseValue;
}

export function calcularLucro(vendaLiquidaUnitaria: number, custoFinalUnitario: number | null): number | null {
  if (custoFinalUnitario == null) return null;
  return round2(vendaLiquidaUnitaria - custoFinalUnitario);
}

export function calcularMargem(lucroUnitario: number | null, vendaLiquidaUnitaria: number): number | null {
  if (lucroUnitario == null || vendaLiquidaUnitaria <= 0) return null;
  return lucroUnitario / vendaLiquidaUnitaria;
}

export function calcularDelta(base: number | null, cenario: number | null): number | null {
  if (base == null || cenario == null) return null;
  return round2(cenario - base);
}

export function getCustoBaseAnalise(item: OrcamentoItem, candidate: InternalCostCandidate): number | null {
  if (item.custo_base_padrao != null && item.custo_base_padrao > 0) return item.custo_base_padrao;
  if (candidate.productCost != null && candidate.productCost > 0) return candidate.productCost;
  return null;
}

function getMarginStatus(margin: number | null, thresholds: MarginThresholds): MarginStatus {
  if (margin == null) return "indisponivel";
  if (margin < 0) return "negativa";
  if (margin < thresholds.critical) return "critica";
  if (margin < thresholds.attention) return "atencao";
  return "saudavel";
}

function mapGlobalContext(base: RentabilidadeContext, scenario: RentabilidadeScenarioConfig) {
  return {
    freteBase: Math.max(0, safeNumber(base.frete)),
    freteSimulado: Math.max(0, safeNumber(scenario.freteTotalSimulado ?? base.frete)),
    impostosBase: Math.max(0, safeNumber(base.impostoSt) + safeNumber(base.impostoIpi)),
    impostosSimulado: Math.max(0, safeNumber(scenario.impostosTotaisSimulados ?? (base.impostoSt + base.impostoIpi))),
    outrosBase: Math.max(0, safeNumber(base.outrasDespesas)),
    outrosSimulado: Math.max(0, safeNumber(scenario.outrosCustosTotaisSimulados ?? base.outrasDespesas)),
    descontoBase: Math.max(0, safeNumber(base.descontoGlobal)),
    descontoSimulado: Math.max(0, safeNumber(scenario.descontoGlobalSimulado ?? base.descontoGlobal)),
    reajustePrecoPercentual: safeNumber(scenario.reajusteGlobalPrecoPercentual),
    reajusteCustoPercentual: safeNumber(scenario.reajusteGlobalCustoPercentual),
  };
}

export function calcularRentabilidade(
  items: OrcamentoItem[],
  context: RentabilidadeContext,
  scenario: RentabilidadeScenarioConfig,
  getCostCandidate: (item: OrcamentoItem) => InternalCostCandidate,
  thresholds: MarginThresholds = DEFAULT_MARGIN_THRESHOLDS,
): RentabilidadeAnalise {
  const globals = mapGlobalContext(context, scenario);

  const validItems = items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => item.produto_id);

  const totalBrutoBase = validItems.reduce((sum, { item }) => sum + safeNumber(item.quantidade) * safeNumber(item.valor_unitario), 0);
  const totalBrutoScenario = validItems.reduce((sum, { item }) => {
    const precoBase = safeNumber(item.valor_unitario);
    const precoScenarioRaw = resolveScenarioValue(precoBase, item.preco_simulado_unitario);
    const precoScenario = round2(precoScenarioRaw * (1 + globals.reajustePrecoPercentual / 100));
    const useScenario = Boolean(item.usar_cenario);
    const precoEfetivo = resolveScenarioEffectiveValue(precoBase, precoScenario, useScenario);
    return sum + safeNumber(item.quantidade) * precoEfetivo;
  }, 0);

  const analysisItems = validItems.map(({ item, originalIndex }): RentabilidadeItem => {
    const quantidade = safeNumber(item.quantidade);
    const useScenario = Boolean(item.usar_cenario);

    const precoBase = safeNumber(item.valor_unitario);
    const precoScenarioRaw = resolveScenarioValue(precoBase, item.preco_simulado_unitario);
    const precoScenario = round2(precoScenarioRaw * (1 + globals.reajustePrecoPercentual / 100));

    const descontoBase = Math.max(0, safeNumber(item.desconto_percentual));
    const descontoScenario = resolveScenarioValue(descontoBase, item.desconto_simulado_percentual);

    const vendaBaseUnitaria = round2(precoBase * (1 - descontoBase / 100));
    const vendaScenarioUnitaria = round2(precoScenario * (1 - descontoScenario / 100));

    const baseRateioBase = quantidade * precoBase;
    const baseRateioScenario = quantidade * (useScenario ? precoScenario : precoBase);
    const percentualRateioBase = totalBrutoBase > 0 ? baseRateioBase / totalBrutoBase : 0;
    const percentualRateioScenario = totalBrutoScenario > 0 ? baseRateioScenario / totalBrutoScenario : 0;

    const descontoGlobalRateadoBase = quantidade > 0 ? (globals.descontoBase * percentualRateioBase) / quantidade : 0;
    const descontoGlobalRateadoScenario = quantidade > 0 ? (globals.descontoSimulado * percentualRateioScenario) / quantidade : 0;

    const vendaLiquidaBase = round2(Math.max(0, vendaBaseUnitaria - descontoGlobalRateadoBase));
    const vendaLiquidaScenario = round2(Math.max(0, vendaScenarioUnitaria - descontoGlobalRateadoScenario));

    const freteBase = quantidade > 0 ? round2((globals.freteBase * percentualRateioBase) / quantidade) : 0;
    const freteScenario = quantidade > 0 ? round2((globals.freteSimulado * percentualRateioScenario) / quantidade) : 0;
    const impostoBase = quantidade > 0 ? round2((globals.impostosBase * percentualRateioBase) / quantidade) : 0;
    const impostoScenario = quantidade > 0 ? round2((globals.impostosSimulado * percentualRateioScenario) / quantidade) : 0;
    const outrosBase = quantidade > 0 ? round2((globals.outrosBase * percentualRateioBase) / quantidade) : 0;
    const outrosScenarioGlobal = quantidade > 0 ? round2((globals.outrosSimulado * percentualRateioScenario) / quantidade) : 0;
    const outrosScenarioItem = Math.max(0, safeNumber(item.outros_custos_simulados_unitario));
    const outrosScenario = round2(outrosScenarioGlobal + (useScenario ? outrosScenarioItem : 0));

    const custoBase = getCustoBaseAnalise(item, getCostCandidate(item));
    const custoScenarioRaw = resolveScenarioValue(custoBase ?? 0, item.custo_simulado);
    const custoScenario = custoBase == null && !item.custo_simulado ? null : round2(custoScenarioRaw * (1 + globals.reajusteCustoPercentual / 100));

    const custoFinalBase = custoBase == null ? null : round2(custoBase + freteBase + impostoBase + outrosBase);
    const custoFinalScenario = custoScenario == null ? null : round2(custoScenario + freteScenario + impostoScenario + outrosScenario);

    const lucroBase = calcularLucro(vendaLiquidaBase, custoFinalBase);
    const lucroScenario = calcularLucro(vendaLiquidaScenario, useScenario ? custoFinalScenario : custoFinalBase);

    const margemBase = calcularMargem(lucroBase, vendaLiquidaBase);
    const margemScenario = calcularMargem(lucroScenario, vendaLiquidaScenario);

    const alerts: string[] = [];
    if (custoBase == null) alerts.push("Custo padrão indisponível");
    if (lucroScenario != null && lucroScenario < 0) alerts.push("Item com lucro negativo");
    if (margemScenario != null && margemScenario < thresholds.minimum) alerts.push("Margem abaixo da mínima");
    if (useScenario) alerts.push("Item com cenário ativo");

    return {
      itemIndex: originalIndex,
      produtoId: item.produto_id,
      descricao: item.descricao_snapshot || "Item sem descrição",
      quantidade,
      usarCenario: useScenario,
      precoBaseUnitario: precoBase,
      precoCenarioUnitario: useScenario ? precoScenario : precoBase,
      descontoBase,
      descontoCenario: useScenario ? descontoScenario : descontoBase,
      custoBaseUnitario: custoBase,
      custoCenarioUnitario: useScenario ? custoScenario : custoBase,
      freteRateadoBase: freteBase,
      freteRateadoSimulado: useScenario ? freteScenario : freteBase,
      impostoRateadoBase: impostoBase,
      impostoRateadoSimulado: useScenario ? impostoScenario : impostoBase,
      outrosCustosBase: outrosBase,
      outrosCustosSimulados: useScenario ? outrosScenario : outrosBase,
      lucroBaseUnitario: lucroBase,
      lucroCenarioUnitario: lucroScenario,
      margemBasePercentual: margemBase,
      margemCenarioPercentual: margemScenario,
      deltaLucro: calcularDelta(lucroBase, lucroScenario),
      deltaMargem: calcularDelta(margemBase, margemScenario),
      margemStatus: getMarginStatus(margemScenario, thresholds),
      alerts,
    };
  });

  const baseVenda = round2(analysisItems.reduce((sum, item) => sum + round2(item.precoBaseUnitario * item.quantidade * (1 - item.descontoBase / 100)), 0) - globals.descontoBase);
  const scenarioVenda = round2(analysisItems.reduce((sum, item) => sum + round2(item.precoCenarioUnitario * item.quantidade * (1 - item.descontoCenario / 100)), 0) - globals.descontoSimulado);

  const custoBase = round2(analysisItems.reduce((sum, item) => sum + ((item.custoBaseUnitario ?? 0) + item.freteRateadoBase + item.impostoRateadoBase + item.outrosCustosBase) * item.quantidade, 0));
  const custoScenario = round2(analysisItems.reduce((sum, item) => sum + ((item.custoCenarioUnitario ?? 0) + item.freteRateadoSimulado + item.impostoRateadoSimulado + item.outrosCustosSimulados) * item.quantidade, 0));

  const lucroBase = round2(baseVenda - custoBase);
  const lucroCenario = round2(scenarioVenda - custoScenario);
  const margemBase = baseVenda > 0 ? lucroBase / baseVenda : 0;
  const margemCenario = scenarioVenda > 0 ? lucroCenario / scenarioVenda : 0;

  const alerts = new Set<string>();
  analysisItems.forEach((item) => item.alerts.forEach((alert) => alerts.add(alert)));

  return {
    items: analysisItems,
    resumo: {
      freteTotalBase: globals.freteBase,
      freteTotalSimulado: globals.freteSimulado,
      impostosTotaisBase: globals.impostosBase,
      impostosTotaisSimulados: globals.impostosSimulado,
      outrosCustosBase: globals.outrosBase,
      outrosCustosSimulados: globals.outrosSimulado,
      descontoGlobalBase: globals.descontoBase,
      descontoGlobalSimulado: globals.descontoSimulado,
      cenarioAtivo: analysisItems.some((item) => item.usarCenario) || globals.freteBase !== globals.freteSimulado || globals.impostosBase !== globals.impostosSimulado || globals.outrosBase !== globals.outrosSimulado || globals.descontoBase !== globals.descontoSimulado || globals.reajusteCustoPercentual !== 0 || globals.reajustePrecoPercentual !== 0,
      nomeCenario: scenario.nomeCenario,
    },
    comparativo: {
      vendaBase: baseVenda,
      vendaCenario: scenarioVenda,
      custoBase,
      custoCenario: custoScenario,
      lucroBase,
      lucroCenario,
      margemBase,
      margemCenario,
      deltaLucro: round2(lucroCenario - lucroBase),
      deltaMargem: margemCenario - margemBase,
    },
    alerts: [...alerts],
  };
}
