import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, RefreshCw, AlertTriangle, Archive, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { PrecosEspeciaisTab } from "@/components/precos/PrecosEspeciaisTab";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";

interface Props {
  id: string;
}

export function ProdutoView({ id }: Props) {
  const [selected, setSelected] = useState<Tables<"produtos"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState<any[]>([]);
  const [composicao, setComposicao] = useState<any[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [fornecedoresProd, setFornecedoresProd] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: p } = await supabase.from("produtos").select("*").eq("id", id).single();
      if (!p) return;
      setSelected(p);

      const [nfRes, compRes, movRes, fornRes] = await Promise.all([
        supabase.from("notas_fiscais_itens").
          select("quantidade, valor_unitario, notas_fiscais(id, numero, tipo, data_emissao, fornecedores(id, nome_razao_social))").
          eq("produto_id", p.id).limit(20),
        p.eh_composto ? supabase.from("produto_composicoes").
          select("quantidade, ordem, produtos:produto_filho_id(id, nome, sku, preco_custo)").
          eq("produto_pai_id", p.id).order("ordem") : Promise.resolve({ data: [] }),
        supabase.from("estoque_movimentos").
          select("tipo, quantidade, motivo, created_at, saldo_anterior, saldo_atual").
          eq("produto_id", p.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("produtos_fornecedores").
          select("preco_compra, lead_time_dias, referencia_fornecedor, eh_principal, unidade_fornecedor, fornecedores:fornecedor_id(id, nome_razao_social)").
          eq("produto_id", p.id)
      ]);

      setHistorico(nfRes.data || []);
      setComposicao((compRes.data || []).map((c: any) => ({
        id: c.produtos?.id,
        nome: c.produtos?.nome, sku: c.produtos?.sku, preco_custo: c.produtos?.preco_custo,
        quantidade: c.quantidade, ordem: c.ordem,
      })));
      setMovimentos(movRes.data || []);
      setFornecedoresProd(fornRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados do produto...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Produto não encontrado</div>;

  const selectedMargem = (selected.preco_custo || 0) > 0 ? (selected.preco_venda / (selected.preco_custo || 1) - 1) * 100 : 0;
  const lucroBruto = selected.preco_venda - (selected.preco_custo || 0);
  const custoCompostoView = composicao.reduce((s, c) => s + c.quantidade * (c.preco_custo || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-card p-4 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Venda</p>
          <p className="font-mono font-bold text-sm text-foreground">{formatCurrency(selected.preco_venda)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Custo</p>
          <p className="font-mono font-bold text-sm text-foreground">{formatCurrency(selected.preco_custo || 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Lucro Bruto</p>
          <p className="font-mono font-bold text-sm text-primary">{formatCurrency(lucroBruto)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Margem</p>
          <p className={`font-mono font-bold text-sm ${selectedMargem > 0 ? "text-emerald-600 dark:text-emerald-400" : selectedMargem < 0 ? "text-destructive" : "text-foreground"}`}>{(selected.preco_custo || 0) > 0 ? `${selectedMargem.toFixed(1)}%` : "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estoque</p>
          <p className={`font-mono font-bold text-sm ${(selected.estoque_atual || 0) <= (selected.estoque_minimo || 0) ? "text-destructive" : "text-foreground"}`}>{selected.estoque_atual ?? 0} {selected.unidade_medida}</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="geral" className="text-[10px] px-1">Geral</TabsTrigger>
          <TabsTrigger value="preco" className="text-[10px] px-1">Preço</TabsTrigger>
          <TabsTrigger value="estoque" className="text-[10px] px-1">Estoque</TabsTrigger>
          <TabsTrigger value="fiscal" className="text-[10px] px-1">Fiscal</TabsTrigger>
          <TabsTrigger value="precos" className="text-[10px] px-1">Especiais</TabsTrigger>
          <TabsTrigger value="historico" className="text-[10px] px-1">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-xs text-muted-foreground">SKU</span><p className="font-mono text-sm">{selected.sku || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Código</span><p className="font-mono text-sm">{selected.codigo_interno || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Unidade</span><p className="text-sm">{selected.unidade_medida}</p></div>
            <div><span className="text-xs text-muted-foreground">Peso</span><p className="font-mono text-sm">{selected.peso || 0} kg</p></div>
          </div>
          {selected.descricao && <div><span className="text-xs text-muted-foreground">Descrição</span><p className="text-sm">{selected.descricao}</p></div>}

          {selected.eh_composto && composicao.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Composição</h4>
              <div className="space-y-1">
                {composicao.map((c, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                    <button onClick={() => pushView("produto", c.id)} className="text-left hover:underline">
                      {c.nome} <span className="text-muted-foreground font-mono text-[10px]">({c.sku})</span>
                    </button>
                    <div className="text-right"><span className="font-mono">× {c.quantidade}</span></div>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-2"><span>Custo Composto</span><span className="font-mono text-primary">{formatCurrency(custoCompostoView)}</span></div>
              </div>
            </div>
          )}

          {fornecedoresProd.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2">Fornecedores</h4>
              {fornecedoresProd.map((f: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                  <div>
                    <RelationalLink onClick={() => pushView("fornecedor", f.fornecedores?.id)}>{f.fornecedores?.nome_razao_social || "—"}</RelationalLink>
                    {f.referencia_fornecedor && (
                      <p className="text-[10px] text-muted-foreground">Ref: {f.referencia_fornecedor}</p>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    {f.preco_compra && <p className="font-mono">{formatCurrency(f.preco_compra)}</p>}
                    {f.lead_time_dias && <p className="text-muted-foreground mt-0.5">{f.lead_time_dias}d de prazo</p>}
                    {f.eh_principal && <span className="inline-block bg-primary/10 text-primary px-1 rounded-[2px] mt-1">Principal</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preco" className="space-y-3 mt-3">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><span className="text-xs text-muted-foreground block">Custo</span><p className="font-mono font-medium text-lg">{formatCurrency(selected.preco_custo || 0)}</p></div>
              <div><span className="text-xs text-muted-foreground block">Margem</span><p className={`font-mono font-semibold text-lg ${selectedMargem > 0 ? "text-success" : selectedMargem < 0 ? "text-destructive" : ""}`}>{(selected.preco_custo || 0) > 0 ? `${selectedMargem.toFixed(1)}%` : "—"}</p></div>
              <div><span className="text-xs text-muted-foreground block">Venda</span><p className="font-mono font-semibold text-lg text-primary">{formatCurrency(selected.preco_venda)}</p></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Estoque Atual</p>
              <p className={`text-2xl font-bold font-mono ${Number(selected.estoque_atual) <= Number(selected.estoque_minimo) && Number(selected.estoque_minimo) > 0 ? "text-destructive" : ""}`}>{selected.estoque_atual ?? 0}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
              <p className="text-2xl font-bold font-mono">{selected.estoque_minimo ?? 0}</p>
            </div>
          </div>
          {movimentos.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Archive className="w-4 h-4" /> Últimas Movimentações</h4>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {movimentos.map((m: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${m.tipo === 'entrada' ? 'bg-success/10 text-success' : m.tipo === 'saida' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                        {m.tipo === 'entrada' ? '↑' : m.tipo === 'saida' ? '↓' : '↔'} {m.quantidade}
                      </span>
                      <span className="text-muted-foreground text-[10px]">{m.motivo || m.tipo}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(m.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-xs text-muted-foreground">NCM</span><p className="font-mono text-sm">{selected.ncm || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">CST</span><p className="font-mono text-sm">{selected.cst || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">CFOP Padrão</span><p className="font-mono text-sm">{selected.cfop_padrao || "—"}</p></div>
          </div>
        </TabsContent>

        <TabsContent value="precos" className="space-y-3 mt-3">
          <PrecosEspeciaisTab produtoId={selected.id} />
        </TabsContent>

        <TabsContent value="historico" className="space-y-3 mt-3">
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico de notas</p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {historico.map((h: any, idx: number) => (
                <div key={idx} className="text-sm py-1.5 border-b last:border-b-0">
                  <div className="flex justify-between">
                    <RelationalLink onClick={() => pushView("nota_fiscal", h.notas_fiscais?.id)} mono className="text-xs">{h.notas_fiscais?.numero}</RelationalLink>
                    <span className="text-[10px] text-muted-foreground">{formatDate(h.notas_fiscais?.data_emissao)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] mt-1">
                    <span className="truncate max-w-[150px]">{h.notas_fiscais?.fornecedores?.nome_razao_social || "—"}</span>
                    <span className="font-mono">Qtd: {h.quantidade} × {formatCurrency(h.valor_unitario)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
