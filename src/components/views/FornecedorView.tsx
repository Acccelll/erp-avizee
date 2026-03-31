import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { Truck, Mail, Phone, MapPin, ShoppingBag } from "lucide-react";

interface Props {
  id: string;
}

export function FornecedorView({ id }: Props) {
  const [selected, setSelected] = useState<Tables<"fornecedores"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: f } = await supabase.from("fornecedores").select("*").eq("id", id).single();
      if (!f) return;
      setSelected(f);

      const { data: c } = await supabase
        .from("pedidos_compra")
        .select("id, numero, data_pedido, valor_total, status")
        .eq("fornecedor_id", f.id)
        .order("data_pedido", { ascending: false })
        .limit(10);

      setCompras(c || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados do fornecedor...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Fornecedor não encontrado</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Truck className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg truncate">{selected.nome_razao_social}</h3>
          <p className="text-xs text-muted-foreground font-mono">{selected.cpf_cnpj}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="geral" className="text-sm">Geral</TabsTrigger>
          <TabsTrigger value="compras" className="text-sm">Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><Mail className="h-3 w-3" /> Contato</h4>
              <p><span className="text-muted-foreground">Email:</span> {selected.email || "—"}</p>
              <p><span className="text-muted-foreground">Telefone:</span> {selected.telefone || "—"}</p>
              <p><span className="text-muted-foreground">Contato:</span> {selected.contato || "—"}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><MapPin className="h-3 w-3" /> Endereço</h4>
              <p className="leading-tight">
                {selected.logradouro}, {selected.numero}<br />
                {selected.bairro} — {selected.cidade}/{selected.uf}<br />
                CEP: {selected.cep}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compras" className="space-y-3 mt-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Últimos Pedidos de Compra</h4>
          {compras.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum pedido de compra encontrado</p>
          ) : (
            <div className="space-y-2">
              {compras.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded border bg-card hover:bg-muted/30 transition-colors text-sm">
                  <div>
                    <RelationalLink onClick={() => pushView("pedido_compra", c.id)} className="font-mono">PC {c.numero}</RelationalLink>
                    <p className="text-[10px] text-muted-foreground">{formatDate(c.data_pedido)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(c.valor_total)}</p>
                    <StatusBadge status={c.status} className="h-4 text-[10px]" />
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
