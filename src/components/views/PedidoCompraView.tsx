import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export function PedidoCompraView({ id }: Props) {
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("pedidos_compra")
        .select("*, fornecedores(id, nome_razao_social, cpf_cnpj)")
        .eq("id", id)
        .single();

      if (!p) return;
      setSelected(p);

      const { data: itens } = await supabase
        .from("pedidos_compra_itens")
        .select("*, produtos(id, nome, sku)")
        .eq("pedido_compra_id", p.id);

      setViewItems(itens || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando pedido de compra...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Pedido não encontrado</div>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg font-mono text-primary">PC {selected.numero}</h3>
            <p className="text-xs text-muted-foreground">{formatDate(selected.data_pedido)}</p>
          </div>
          <StatusBadge status={selected.status} />
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Total</span>
          <span className="text-lg font-bold font-mono text-primary">{formatCurrency(selected.valor_total || 0)}</span>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="logistica">Logística</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4 mt-3">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Fornecedor</p>
              <RelationalLink onClick={() => pushView("fornecedor", selected.fornecedores?.id)}>
                {selected.fornecedores?.nome_razao_social || "—"}
              </RelationalLink>
            </div>
            {selected.data_entrega_prevista && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Entrega Prevista</p>
                <p className="text-sm">{formatDate(selected.data_entrega_prevista)}</p>
              </div>
            )}
            {selected.observacoes && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Observações</p>
                <p className="text-xs text-muted-foreground italic">{selected.observacoes}</p>
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
                    <td className="px-2 py-2 text-right font-mono text-xs font-medium">{formatCurrency(i.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="logistica" className="space-y-4 mt-3">
          <h4 className="text-xs font-semibold flex items-center gap-2 px-1 text-muted-foreground uppercase">
            <Truck className="w-3.5 h-3.5" /> Rastreamento de Entrega
          </h4>
          <LogisticaRastreioSection pedidoCompraId={selected.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
