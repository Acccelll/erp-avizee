import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, RotateCcw, Settings2, ShieldAlert, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { OrcamentoInternalAccess } from "@/lib/orcamentoInternalAccess";
import type { MarginStatus, RentabilidadeAnalise, RentabilidadeScenarioConfig } from "@/lib/orcamentoRentabilidade";

interface Props {
  analysis: RentabilidadeAnalise;
  access: OrcamentoInternalAccess;
  scenarioConfig: RentabilidadeScenarioConfig;
  onScenarioConfigChange: (patch: Partial<RentabilidadeScenarioConfig>) => void;
  onUpdateItemScenario: (itemIndex: number, payload: Record<string, number | boolean | null | string>) => void;
  onResetItemScenario: (itemIndex: number) => void;
  onClearAllSimulations: () => void;
  onRestoreBase: () => void;
}

const MARGIN_LABEL: Record<MarginStatus, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  critica: "Crítica",
  negativa: "Negativa",
  indisponivel: "Indisponível",
};

function marginClass(status: MarginStatus) {
  if (status === "saudavel") return "bg-emerald-100 text-emerald-700";
  if (status === "atencao") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

const percent = (value: number) => new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function OrcamentoInternalAnalysisPanel({
  analysis,
  access,
  scenarioConfig,
  onScenarioConfigChange,
  onUpdateItemScenario,
  onResetItemScenario,
  onClearAllSimulations,
  onRestoreBase,
}: Props) {
  const [open, setOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const topAlerts = useMemo(() => analysis.alerts.slice(0, 4), [analysis.alerts]);
  const detailItem = analysis.items.find((item) => item.itemIndex === detailIndex) || null;

  if (!access.canViewInternalMargin) return null;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5 p-4 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">Análise Interna · Base x Cenário</h3>
          <p className="text-xs text-muted-foreground">Simulação interna isolada. Não altera cadastro, PDF, pedido, estoque, financeiro ou faturamento.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((p) => !p)} className="gap-1.5 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Ocultar" : "Exibir"}
        </Button>
      </div>

      {!!topAlerts.length && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs space-y-1">
          {topAlerts.map((alert) => <p key={alert} className="flex items-center gap-1.5 text-amber-900"><TriangleAlert className="h-3.5 w-3.5" />{alert}</p>)}
        </div>
      )}

      {open && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Venda Base</p><p className="font-semibold">{formatCurrency(analysis.comparativo.vendaBase)}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Venda Cenário</p><p className="font-semibold">{formatCurrency(analysis.comparativo.vendaCenario)}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Lucro Base</p><p className="font-semibold">{formatCurrency(analysis.comparativo.lucroBase)}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Lucro Cenário</p><p className="font-semibold">{formatCurrency(analysis.comparativo.lucroCenario)}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Impacto Lucro</p><p className={`font-semibold ${analysis.comparativo.deltaLucro < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(analysis.comparativo.deltaLucro)}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Impacto Margem</p><p className={`font-semibold ${analysis.comparativo.deltaMargem < 0 ? "text-red-600" : "text-emerald-600"}`}>{percent(analysis.comparativo.deltaMargem)}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Itens alterados</p><p className="font-semibold">{analysis.resumo.itensAlterados}</p></div>
            <div className="rounded-lg border bg-background p-3"><p className="text-muted-foreground">Cenário ativo</p><p className={`font-semibold ${analysis.resumo.cenarioAtivo ? "text-emerald-600" : "text-muted-foreground"}`}>{analysis.resumo.cenarioAtivo ? "Sim" : "Não"}</p></div>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
              <div className="min-w-0"><Label className="text-[11px]">Frete simulado</Label><Input type="number" min={0} value={scenarioConfig.freteTotalSimulado ?? analysis.resumo.freteTotalBase} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ freteTotalSimulado: Math.max(0, Number(e.target.value)) })} /></div>
              <div className="min-w-0"><Label className="text-[11px]">Impostos simulados</Label><Input type="number" min={0} value={scenarioConfig.impostosTotaisSimulados ?? analysis.resumo.impostosTotaisBase} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ impostosTotaisSimulados: Math.max(0, Number(e.target.value)) })} /></div>
              <div className="min-w-0"><Label className="text-[11px]">Outros custos simulados</Label><Input type="number" min={0} value={scenarioConfig.outrosCustosTotaisSimulados ?? analysis.resumo.outrosCustosBase} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ outrosCustosTotaisSimulados: Math.max(0, Number(e.target.value)) })} /></div>
              <div className="min-w-0"><Label className="text-[11px]">Desconto global simulado</Label><Input type="number" min={0} value={scenarioConfig.descontoGlobalSimulado ?? analysis.resumo.descontoGlobalBase} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ descontoGlobalSimulado: Math.max(0, Number(e.target.value)) })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
              <div className="min-w-0"><Label className="text-[11px]">Reajuste global preço (%)</Label><Input type="number" value={scenarioConfig.reajusteGlobalPrecoPercentual ?? 0} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ reajusteGlobalPrecoPercentual: Number(e.target.value) })} /></div>
              <div className="min-w-0"><Label className="text-[11px]">Reajuste global custo (%)</Label><Input type="number" value={scenarioConfig.reajusteGlobalCustoPercentual ?? 0} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ reajusteGlobalCustoPercentual: Number(e.target.value) })} /></div>
              <div className="min-w-0"><Label className="text-[11px]">Nome do cenário</Label><Input value={scenarioConfig.nomeCenario ?? ""} disabled={!access.canEditInternalCostBasis} onChange={(e) => onScenarioConfigChange({ nomeCenario: e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" className="min-w-0" disabled={!access.canEditInternalCostBasis} onClick={onClearAllSimulations}>Limpar simulações</Button>
              <Button size="sm" variant="outline" className="min-w-0" disabled={!access.canEditInternalCostBasis} onClick={onRestoreBase}>Restaurar base</Button>
            </div>
          </div>

          <div className="overflow-auto border rounded-lg bg-background">
            <table className="w-full min-w-[1400px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left p-2" rowSpan={2}>Item</th>
                  <th className="text-center p-2 border-l" colSpan={3}>Base</th>
                  <th className="text-center p-2 border-l bg-blue-50/70" colSpan={4}>Cenário</th>
                  <th className="text-center p-2 border-l" colSpan={8}>Resultado</th>
                </tr>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-right p-2 border-l">Custo</th>
                  <th className="text-right p-2">Preço</th>
                  <th className="text-right p-2">Desc.%</th>
                  <th className="text-right p-2 border-l bg-blue-50/70">Custo</th>
                  <th className="text-right p-2 bg-blue-50/70">Preço</th>
                  <th className="text-right p-2 bg-blue-50/70">Desc.%</th>
                  <th className="text-left p-2 bg-blue-50/70">Ativo</th>
                  <th className="text-right p-2 border-l">Lucro Base</th>
                  <th className="text-right p-2">Lucro Cen.</th>
                  <th className="text-right p-2">Margem Base</th>
                  <th className="text-right p-2">Margem Cen.</th>
                  <th className="text-right p-2">Δ Lucro</th>
                  <th className="text-right p-2">Δ Margem</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {analysis.items.map((item) => (
                  <tr key={`${item.produtoId}-${item.itemIndex}`} className={`border-b last:border-0 ${item.usarCenario ? "bg-blue-50/40" : ""}`}>
                    <td className="p-2 min-w-[220px]">
                      <p className="font-medium">{item.descricao}</p>
                      {item.usarCenario && <Badge className="mt-1 bg-blue-100 text-blue-700 hover:bg-blue-100">Simulado</Badge>}
                    </td>
                    <td className="p-2 text-right border-l">{item.custoBaseUnitario == null ? "—" : formatCurrency(item.custoBaseUnitario)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.precoBaseUnitario)}</td>
                    <td className="p-2 text-right">{item.descontoBase.toFixed(2)}</td>
                    <td className="p-2 text-right border-l bg-blue-50/60"><Input type="number" min={0} className="h-8 text-right" value={item.custoCenarioUnitario ?? ""} disabled={!access.canEditInternalCostBasis} onChange={(e) => onUpdateItemScenario(item.itemIndex, { custo_simulado: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} /></td>
                    <td className="p-2 text-right bg-blue-50/60"><Input type="number" min={0} className="h-8 text-right" value={item.precoCenarioUnitario} disabled={!access.canEditInternalCostBasis} onChange={(e) => onUpdateItemScenario(item.itemIndex, { preco_simulado_unitario: Math.max(0, Number(e.target.value)) })} /></td>
                    <td className="p-2 text-right bg-blue-50/60"><Input type="number" min={0} className="h-8 text-right" value={item.descontoCenario} disabled={!access.canEditInternalCostBasis} onChange={(e) => onUpdateItemScenario(item.itemIndex, { desconto_simulado_percentual: Math.max(0, Number(e.target.value)) })} /></td>
                    <td className="p-2 bg-blue-50/60"><Switch checked={item.usarCenario} disabled={!access.canEditInternalCostBasis} onCheckedChange={(checked) => onUpdateItemScenario(item.itemIndex, { usar_cenario: checked })} /></td>
                    <td className="p-2 text-right border-l">{item.lucroBaseUnitario == null ? "—" : formatCurrency(item.lucroBaseUnitario)}</td>
                    <td className="p-2 text-right">{item.lucroCenarioUnitario == null ? "—" : formatCurrency(item.lucroCenarioUnitario)}</td>
                    <td className="p-2 text-right">{item.margemBasePercentual == null ? "—" : percent(item.margemBasePercentual)}</td>
                    <td className="p-2 text-right">{item.margemCenarioPercentual == null ? "—" : percent(item.margemCenarioPercentual)}</td>
                    <td className="p-2 text-right">{item.deltaLucro == null ? "—" : formatCurrency(item.deltaLucro)}</td>
                    <td className="p-2 text-right">{item.deltaMargem == null ? "—" : percent(item.deltaMargem)}</td>
                    <td className="p-2"><Badge variant="secondary" className={marginClass(item.margemStatus)}>{MARGIN_LABEL[item.margemStatus]}</Badge></td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled={!access.canEditInternalCostBasis} onClick={() => setDetailIndex(item.itemIndex)}><Settings2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" disabled={!access.canEditInternalCostBasis} onClick={() => onResetItemScenario(item.itemIndex)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border bg-background p-3 text-xs">
            <p className="font-medium mb-1 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Resumo gerencial interno</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-1.5 text-muted-foreground">
              <p>Margem Base: <span className="text-foreground">{percent(analysis.comparativo.margemBase)}</span></p>
              <p>Margem Cenário: <span className="text-foreground">{percent(analysis.comparativo.margemCenario)}</span></p>
              <p>Δ Margem: <span className={analysis.comparativo.deltaMargem < 0 ? "text-red-600" : "text-emerald-600"}>{percent(analysis.comparativo.deltaMargem)}</span></p>
              <p>Cenário ativo: <span className={analysis.resumo.cenarioAtivo ? "text-emerald-600" : "text-muted-foreground"}>{analysis.resumo.cenarioAtivo ? "Sim" : "Não"}</span></p>
            </div>
          </div>
        </>
      )}

      <Dialog open={detailItem != null} onOpenChange={(next) => !next && setDetailIndex(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Simulação avançada do item</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{detailItem.descricao}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Frete cenário (un.)</Label><Input type="number" min={0} value={detailItem.freteRateadoSimulado} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { frete_rateado_simulado_unitario: Math.max(0, Number(e.target.value)), usar_cenario: true })} /></div>
                <div><Label>Imposto cenário (un.)</Label><Input type="number" min={0} value={detailItem.impostoRateadoSimulado} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { imposto_rateado_simulado_unitario: Math.max(0, Number(e.target.value)), usar_cenario: true })} /></div>
                <div><Label>Outros custos cenário (un.)</Label><Input type="number" min={0} value={detailItem.outrosCustosSimulados} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { outros_custos_simulados_unitario: Math.max(0, Number(e.target.value)), usar_cenario: true })} /></div>
                <div><Label>Preço cenário (un.)</Label><Input type="number" min={0} value={detailItem.precoCenarioUnitario} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { preco_simulado_unitario: Math.max(0, Number(e.target.value)), usar_cenario: true })} /></div>
                <div><Label>Desconto cenário (%)</Label><Input type="number" min={0} value={detailItem.descontoCenario} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { desconto_simulado_percentual: Math.max(0, Number(e.target.value)), usar_cenario: true })} /></div>
                <div><Label>Custo cenário (un.)</Label><Input type="number" min={0} value={detailItem.custoCenarioUnitario ?? 0} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { custo_simulado: Math.max(0, Number(e.target.value)), usar_cenario: true })} /></div>
              </div>
              <div>
                <Label>Observação interna do cenário</Label>
                <Textarea value={detailItem.observacaoInternaCenario || ""} onChange={(e) => onUpdateItemScenario(detailItem.itemIndex, { observacao_interna_cenario: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onResetItemScenario(detailItem.itemIndex)}>Restaurar item</Button>
                <Button onClick={() => setDetailIndex(null)}>Concluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
