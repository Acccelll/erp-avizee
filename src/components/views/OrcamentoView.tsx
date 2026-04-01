import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";

interface Props {
  id: string;
}

export function OrcamentoView({ id }: Props) {
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: orc } = await supabase
        .from("orcamentos")
        .select("*, clientes(id, nome_razao_social)")
        .eq("id", id)
        .single();

      if (!orc) return;
      setSelected(orc);

      const { data: it } = await supabase
        .from("orcamentos_itens")
        .select("*, produtos(id, nome, sku)")
        .eq("orcamento_id", orc.id);

      setItems(it || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando cotação...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Cotação não encontrada</div>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4 text-sm">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg font-mono text-primary">{selected.numero}</h3>
            <p className="text-xs text-muted-foreground">{formatDate(selected.data_orcamento)}</p>
          </div>
          <StatusBadge status={selected.status} />
        </div>
        <div className="space-y-1 border-t pt-3">
           <div className="flex justify-between">
             <span className="text-muted-foreground">Cliente:</span>
             <RelationalLink onClick={() => pushView("cliente", selected.clientes?.id)}>
               {selected.clientes?.nome_razao_social || "—"}
             </RelationalLink>
           </div>
           <div className="flex justify-between font-bold mt-2">
             <span>Total:</span>
             <span className="font-mono text-primary">{formatCurrency(selected.valor_total || 0)}</span>
           </div>
        </div>
      </div>

      <Tabs defaultValue="itens" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="condicoes">Condições</TabsTrigger>
        </TabsList>

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
                {items.map((i: any, idx: number) => (
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

        <TabsContent value="condicoes" className="space-y-4 mt-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
             <div>
               <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pagamento</p>
               <p>{selected.pagamento || "—"}</p>
             </div>
             <div>
               <p className="text-[10px] text-muted-foreground uppercase font-semibold">Prazo</p>
               <p>{selected.prazo_pagamento || "—"}</p>
             </div>
             <div>
               <p className="text-[10px] text-muted-foreground uppercase font-semibold">Frete</p>
               <p className="capitalize">{selected.frete_tipo || "—"} {selected.modalidade ? `(${selected.modalidade})` : ""}</p>
             </div>
             {selected.validade && (
               <div>
                 <p className="text-[10px] text-muted-foreground uppercase font-semibold">Validade</p>
                 <p>{formatDate(selected.validade)}</p>
               </div>
             )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
