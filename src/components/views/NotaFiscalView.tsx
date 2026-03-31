import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { LogisticaRastreioSection } from "@/components/logistica/LogisticaRastreioSection";
import { Truck } from "lucide-react";

interface Props {
  id: string;
}

export function NotaFiscalView({ id }: Props) {
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: n } = await supabase
        .from("notas_fiscais")
        .select("*, fornecedores(id, nome_razao_social), clientes(id, nome_razao_social), ordens_venda(id, numero)")
        .eq("id", id)
        .single();

      if (!n) return;
      setSelected(n);

      const { data: itens } = await supabase
        .from("notas_fiscais_itens")
        .select("*, produtos(id, nome, sku)")
        .eq("nota_fiscal_id", n.id);

      setViewItems(itens || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando nota fiscal...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Nota fiscal não encontrada</div>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg font-mono text-primary">NF {selected.numero}</h3>
            <p className="text-xs text-muted-foreground">{formatDate(selected.data_emissao)}</p>
          </div>
          <StatusBadge status={selected.status} />
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Total</span>
          <span className="text-lg font-bold font-mono text-primary">{formatCurrency(selected.valor_total || 0)}</span>
        </div>
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="resumo" className="text-[10px] px-1">Resumo</TabsTrigger>
          <TabsTrigger value="itens" className="text-[10px] px-1">Itens</TabsTrigger>
          <TabsTrigger value="impostos" className="text-[10px] px-1">Impostos</TabsTrigger>
          <TabsTrigger value="logistica" className="text-[10px] px-1">Logística</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tipo</p>
              <p className="capitalize">{selected.tipo === 'entrada' ? 'Entrada' : 'Saída'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Operação</p>
              <p className="capitalize">{selected.tipo_operacao || 'Normal'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                {selected.tipo === "entrada" ? "Fornecedor" : "Cliente"}
              </p>
              {selected.tipo === "entrada" ? (
                <RelationalLink onClick={() => pushView("fornecedor", selected.fornecedores?.id)}>
                  {selected.fornecedores?.nome_razao_social || "—"}
                </RelationalLink>
              ) : (
                <RelationalLink onClick={() => pushView("cliente", selected.clientes?.id)}>
                  {selected.clientes?.nome_razao_social || "—"}
                </RelationalLink>
              )}
            </div>
            {selected.ordem_venda_id && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ordem de Venda</p>
                <RelationalLink onClick={() => pushView("ordem_venda", selected.ordens_venda?.id)} mono>
                  {selected.ordens_venda?.numero}
                </RelationalLink>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="itens" className="space-y-3 mt-3">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground">Produto</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-muted-foreground">Qtd</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {viewItems.map((i: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-2 py-2">
                      <button onClick={() => pushView("produto", i.produtos?.id)} className="text-left hover:underline block truncate max-w-[150px]">
                        {i.produtos?.nome || "—"}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-xs">{i.quantidade}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs font-medium">{formatCurrency(i.valor_unitario * i.quantidade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="impostos" className="space-y-2 mt-3 text-xs">
          <div className="flex justify-between"><span>ICMS</span><span className="font-mono">{formatCurrency(selected.icms_valor)}</span></div>
          <div className="flex justify-between"><span>IPI</span><span className="font-mono">{formatCurrency(selected.ipi_valor)}</span></div>
          <div className="flex justify-between"><span>PIS/COFINS</span><span className="font-mono">{formatCurrency((selected.pis_valor || 0) + (selected.cofins_valor || 0))}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Outras Despesas</span><span className="font-mono">{formatCurrency(selected.outras_despesas)}</span></div>
        </TabsContent>

        <TabsContent value="logistica" className="space-y-4 mt-3">
          <h4 className="text-[10px] font-semibold flex items-center gap-2 px-1 text-muted-foreground uppercase">
            <Truck className="w-3 h-3" /> Rastreamento Logístico
          </h4>
          <LogisticaRastreioSection notaFiscalId={selected.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
