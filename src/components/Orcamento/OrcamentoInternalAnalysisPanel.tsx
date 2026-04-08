import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ShieldAlert, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { OrcamentoInternalAccess } from "@/lib/orcamentoInternalAccess";
import type { MarginStatus, RentabilidadeAnalise, InternalCostSource } from "@/lib/orcamentoRentabilidade";

interface Props {
  analysis: RentabilidadeAnalise;
  access: OrcamentoInternalAccess;
  onUpdateSimulation: (itemIndex: number, payload: { custo_simulado?: number | null; usa_custo_simulado?: boolean; origem_custo_analise?: "cadastro_produto" | "simulado" }) => void;
  onClearSimulation: (itemIndex: number) => void;
  onClearAllSimulations: () => void;
}

const MARGIN_LABEL: Record<MarginStatus, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  critica: "Crítica",
  negativa: "Negativa",
  indisponivel: "Indisponível",
};

const COST_SOURCE_LABEL: Record<InternalCostSource, string> = {
  ultimo_custo_compra: "Último custo de compra",
  custo_medio: "Custo médio",
  custo_manual_cotacao: "Custo manual",
  custo_produto: "Custo do cadastro",
  indisponivel: "Sem custo",
};

function marginClass(status: MarginStatus) {
  if (status === "saudavel") return "bg-emerald-100 text-emerald-700";
  if (status === "atencao") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function OrcamentoInternalAnalysisPanel({ analysis, access, onUpdateSimulation, onClearSimulation, onClearAllSimulations }: Props) {
  const [open, setOpen] = useState(false);
  const topAlerts = useMemo(() => analysis.alerts.slice(0, 4), [analysis.alerts]);

  if (!access.canViewInternalMargin) {
    return null;
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Análise Interna de Rentabilidade</h3>
          <p className="text-xs text-muted-foreground">Área interna (não exibida em PDF/e-mail/cliente). Preparada para controle por permissão.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((prev) => !prev)} className="gap-1.5">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Ocultar" : "Exibir"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Simulação interna. Este valor não altera o cadastro do produto.</p>

      {!!topAlerts.length && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs space-y-1">
          {topAlerts.map((alert) => (
            <p key={alert} className="flex items-center gap-1.5 text-amber-900"><TriangleAlert className="h-3.5 w-3.5" />{alert}</p>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Venda total líquida</p>
              <p className="font-semibold">{formatCurrency(analysis.resumo.vendaTotalLiquida)}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Custo total</p>
              <p className="font-semibold">{formatCurrency(analysis.resumo.custoTotalProdutos)}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Margem geral</p>
              <p className={`font-semibold ${analysis.resumo.margemGeralPercentual < 0 ? "text-red-600" : ""}`}>{new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(analysis.resumo.margemGeralPercentual)}</p>
            </div>
          </div>

          <div className="overflow-auto border rounded-lg bg-background">
            <table className="w-full min-w-[1000px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left p-2">Item</th>
                  {access.canViewInternalCosts && <th className="text-right p-2">Custo padrão</th>}
                  {access.canViewInternalCosts && <th className="text-right p-2">Custo simulado</th>}
                  {access.canViewInternalCosts && <th className="text-left p-2">Usar simulado</th>}
                  {access.canViewInternalCosts && <th className="text-right p-2">Custo final</th>}
                  <th className="text-right p-2">Venda líquida un.</th>
                  <th className="text-right p-2">Lucro un.</th>
                  <th className="text-right p-2">Lucro total</th>
                  <th className="text-right p-2">Margem</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.items.map((item) => (
                  <tr key={`${item.produtoId}-${item.itemIndex}`} className="border-b last:border-0">
                    <td className="p-2">
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-muted-foreground">{item.quantidade} un. · {COST_SOURCE_LABEL[item.custoSource]}</p>
                      {item.usaCustoSimulado && <Badge className="mt-1 bg-blue-100 text-blue-700 hover:bg-blue-100">Simulado</Badge>}
                    </td>
                    {access.canViewInternalCosts && <td className="p-2 text-right">{item.custoPadraoUnitario == null ? "Custo padrão indisponível" : formatCurrency(item.custoPadraoUnitario)}</td>}
                    {access.canViewInternalCosts && (
                      <td className="p-2 text-right">
                        <input
                          className="h-8 w-28 rounded-md border px-2 text-right"
                          type="number"
                          min={0}
                          disabled={!access.canEditInternalCostBasis}
                          value={item.custoSimuladoUnitario ?? ""}
                          onChange={(e) => onUpdateSimulation(item.itemIndex, { custo_simulado: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                        />
                      </td>
                    )}
                    {access.canViewInternalCosts && (
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!access.canEditInternalCostBasis || item.custoSimuladoUnitario == null}
                            checked={item.usaCustoSimulado}
                            onChange={(e) => onUpdateSimulation(item.itemIndex, { usa_custo_simulado: e.target.checked, origem_custo_analise: e.target.checked ? "simulado" : "cadastro_produto" })}
                          />
                          <Button variant="ghost" size="sm" disabled={!access.canEditInternalCostBasis} onClick={() => onClearSimulation(item.itemIndex)}>Voltar ao padrão</Button>
                        </div>
                      </td>
                    )}
                    {access.canViewInternalCosts && <td className="p-2 text-right">{item.custoFinalUnitario == null ? "—" : formatCurrency(item.custoFinalUnitario)}</td>}
                    <td className="p-2 text-right">{formatCurrency(item.vendaLiquidaUnitaria)}</td>
                    <td className="p-2 text-right">{item.lucroUnitario == null ? "—" : formatCurrency(item.lucroUnitario)}</td>
                    <td className="p-2 text-right">{item.lucroTotal == null ? "—" : formatCurrency(item.lucroTotal)}</td>
                    <td className="p-2 text-right">{item.margemPercentual == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.margemPercentual)}</td>
                    <td className="p-2">
                      <Badge variant="secondary" className={marginClass(item.margemStatus)}>{MARGIN_LABEL[item.margemStatus]}</Badge>
                      {!!item.alerts.length && <p className="text-[11px] text-muted-foreground mt-1">{item.alerts[0]}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border bg-background p-3 text-xs">
            <p className="font-medium mb-1 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Resumo interno da cotação</p>
            <div className="mb-2">
              <Button size="sm" variant="outline" disabled={!access.canEditInternalCostBasis} onClick={onClearAllSimulations}>Limpar todas as simulações</Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-1.5 text-muted-foreground">
              <p>Frete: <span className="text-foreground">{formatCurrency(analysis.resumo.frete)}</span></p>
              <p>Impostos: <span className="text-foreground">{formatCurrency(analysis.resumo.impostos)}</span></p>
              <p>Descontos: <span className="text-foreground">{formatCurrency(analysis.resumo.descontos)}</span></p>
              <p>Outros custos: <span className="text-foreground">{formatCurrency(analysis.resumo.outrosCustos)}</span></p>
              <p>Lucro bruto: <span className="text-foreground">{formatCurrency(analysis.resumo.lucroBrutoTotal)}</span></p>
              <p>Lucro líquido estimado: <span className="text-foreground">{formatCurrency(analysis.resumo.lucroLiquidoEstimado)}</span></p>
              <p>Margem geral: <span className="text-foreground">{new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(analysis.resumo.margemGeralPercentual)}</span></p>
              <p>Atingiu margem mínima: <span className={analysis.resumo.margemMinimaAtingida ? "text-emerald-600" : "text-red-600"}>{analysis.resumo.margemMinimaAtingida ? "Sim" : "Não"}</span></p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
