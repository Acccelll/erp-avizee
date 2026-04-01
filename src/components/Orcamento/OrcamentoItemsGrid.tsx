import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, Tag, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProductSelector } from "@/components/ui/DataSelector";
import { AutocompleteSearch } from "@/components/ui/AutocompleteSearch";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format";
import { ViewDrawerV2 } from "@/components/ViewDrawerV2";

interface ProductWithForn extends Tables<"produtos"> {
  produtos_fornecedores?: (Tables<"produtos_fornecedores"> & {
    fornecedores?: { nome_razao_social: string } | null;
  })[];
}

export interface OrcamentoItem {
  id?: string;
  produto_id: string;
  codigo_snapshot: string;
  descricao_snapshot: string;
  variacao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  peso_unitario: number;
  peso_total: number;
}

interface Props {
  items: OrcamentoItem[];
  onChange: (items: OrcamentoItem[]) => void;
  produtos: ProductWithForn[];
  precosEspeciais?: Tables<"precos_especiais">[];
}

const emptyItem = (): OrcamentoItem => ({
  produto_id: "", codigo_snapshot: "", descricao_snapshot: "", variacao: "",
  quantidade: 0, unidade: "UN", valor_unitario: 0, valor_total: 0,
  peso_unitario: 0, peso_total: 0,
});

export function OrcamentoItemsGrid({ items, onChange, produtos, precosEspeciais }: Props) {
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const addItem = () => onChange([...items, emptyItem()]);

  const getProductOptions = () => {
    return produtos.map((p) => ({
      id: p.id,
      label: p.nome,
      sublabel: `${p.sku || p.codigo_interno || ""} · ${formatCurrency(p.preco_venda || 0)}`,
      rightMeta: `Estoque: ${p.estoque_atual ?? 0}`,
      imageUrl: null,
      searchTerms: [p.sku, p.codigo_interno, p.nome].filter(Boolean) as string[],
    }));
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const next = [...items];
    const item = { ...next[idx], [field]: value };

    if (field === "produto_id" && value) {
      const prod = produtos.find((p: any) => p.id === value);
      if (prod) {
        item.codigo_snapshot = prod.sku || prod.codigo_interno || "";
        item.descricao_snapshot = prod.nome;
        item.unidade = prod.unidade_medida || "UN";

        const precoEspecial = precosEspeciais?.find((p) =>
          p.produto_id === value &&
          (!p.vigencia_inicio || new Date(p.vigencia_inicio + "T00:00:00") <= new Date()) &&
          (!p.vigencia_fim || new Date(p.vigencia_fim + "T23:59:59") >= new Date())
        );

        const precoBase = prod.preco_venda || 0;
        if (precoEspecial) {
          if (precoEspecial.preco_especial && Number(precoEspecial.preco_especial) > 0) {
            item.valor_unitario = Number(precoEspecial.preco_especial);
          } else if (precoEspecial.desconto_percentual && Number(precoEspecial.desconto_percentual) > 0) {
            item.valor_unitario = precoBase * (1 - Number(precoEspecial.desconto_percentual) / 100);
          } else {
            item.valor_unitario = precoBase;
          }
          toast.info(`Preço especial aplicado para ${prod.nome}`);
        } else {
          item.valor_unitario = precoBase;
        }
        item.peso_unitario = prod.peso || 0;
      }
    }

    if (field === "quantidade" || field === "valor_unitario") {
      const qty = field === "quantidade" ? Number(value) : item.quantidade;
      const price = field === "valor_unitario" ? Number(value) : item.valor_unitario;
      item.valor_total = qty * price;
      item.peso_total = qty * item.peso_unitario;
    }

    next[idx] = item;
    onChange(next);
  };

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + Number(item.valor_total || 0), 0), [items]);
  const activeDetailProduct = produtos.find((p) => p.id === detailProductId);

  return (
    <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-foreground">Itens do Orçamento</h3>
        <div className="flex items-center gap-2">
          <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium">Parcial: {formatCurrency(subtotal)}</div>
          <Button size="sm" onClick={addItem} className="gap-1.5">
            <Plus className="w-4 h-4" /> Adicionar Item
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="bg-accent/50 border-b">
              <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[11%]">Código</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[30%]">Descrição do Material</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[10%]">Variação</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[8%]">Qtd.</th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[7%]">Un.</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[12%]">Unitário</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[12%]">Total</th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider px-3 py-2.5 w-[10%]">Validação</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-8 text-sm">Nenhum item adicionado</td></tr>
            ) : (
              items.map((item, idx) => {
                const prod = produtos.find((p) => p.id === item.produto_id);
                const estoqueAtual = prod?.estoque_atual ?? 0;
                const lowStock = item.quantidade > 0 && estoqueAtual <= item.quantidade;
                const invalidQty = item.quantidade <= 0;
                const invalidPrice = item.valor_unitario <= 0;
                return (
                  <tr key={idx} className={`border-b last:border-b-0 ${lowStock ? "bg-warning/10" : "hover:bg-muted/20"}`}>
                    <td className="px-3 py-2">
                      <Input className="h-8 text-xs font-mono" value={item.codigo_snapshot} onChange={(e) => updateItem(idx, "codigo_snapshot", e.target.value)} placeholder="Código" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <AutocompleteSearch
                          options={getProductOptions()}
                          value={item.produto_id}
                          onChange={(val) => updateItem(idx, "produto_id", val)}
                          placeholder="Buscar produto..."
                          className="flex-1"
                          onCreateNew={() => window.open('/produtos', '_blank')}
                          createNewLabel="Produto não encontrado? Cadastrar"
                        />
                        <ProductSelector produtos={produtos} onSelect={(p) => updateItem(idx, "produto_id", p.id)} trigger={<Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Ver lista completa"><Search className="h-3 w-3" /></Button>} />
                        {item.produto_id && (
                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDetailProductId(item.produto_id)} title="Ver detalhes do produto">
                            <Info className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs" value={item.variacao} onChange={(e) => updateItem(idx, "variacao", e.target.value)} /></td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs text-right font-mono" type="number" value={item.quantidade || ""} onChange={(e) => updateItem(idx, "quantidade", Number(e.target.value))} /></td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs text-center" value={item.unidade} onChange={(e) => updateItem(idx, "unidade", e.target.value)} /></td>
                    <td className="px-3 py-2">
                      <div className="relative flex items-center gap-1 justify-end">
                        <Input className={`h-8 text-xs text-right font-mono w-24 ${precosEspeciais?.some((p) => p.produto_id === item.produto_id) ? "border-primary bg-primary/5 pr-6" : ""}`} type="number" step="0.01" value={item.valor_unitario || ""} onChange={(e) => updateItem(idx, "valor_unitario", Number(e.target.value))} />
                        {(() => {
                          const rule = precosEspeciais?.find((p) => p.produto_id === item.produto_id);
                          const prodForPrice = produtos.find((p) => p.id === item.produto_id);
                          if (!rule) return null;
                          return (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild><Tag className="w-3.5 h-3.5 text-primary fill-primary cursor-help" /></TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs p-2 max-w-[200px]">
                                    <p className="font-bold mb-1">Preço Especial Ativo</p>
                                    <p>Preço Padrão: {formatCurrency(prodForPrice?.preco_venda || 0)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-semibold">{formatCurrency(item.valor_total || 0)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-between gap-1">
                        {lowStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-warning"><AlertTriangle className="h-3.5 w-3.5" />Estoque baixo</span>
                        ) : !invalidQty && !invalidPrice ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-success"><CheckCircle2 className="h-3.5 w-3.5" />OK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Verificar</span>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                      {(invalidQty || invalidPrice) && (
                        <p className="mt-1 text-[10px] text-destructive">Quantidade e valor unitário devem ser maiores que zero.</p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ViewDrawerV2
        open={!!detailProductId}
        onClose={() => setDetailProductId(null)}
        title={activeDetailProduct?.nome || "Detalhes do Produto"}
      >
        {activeDetailProduct ? (
          <div className="space-y-2 text-sm">
            <p><strong>Código:</strong> {activeDetailProduct.sku || activeDetailProduct.codigo_interno || "—"}</p>
            <p><strong>Estoque atual:</strong> {activeDetailProduct.estoque_atual ?? 0}</p>
            <p><strong>Estoque mínimo:</strong> {activeDetailProduct.estoque_minimo ?? 0}</p>
            <p><strong>Preço sugerido:</strong> {formatCurrency(activeDetailProduct.preco_venda || 0)}</p>
            <p><strong>Descrição:</strong> {activeDetailProduct.descricao || "Sem descrição"}</p>
          </div>
        ) : null}
      </ViewDrawerV2>
    </div>
  );
}
