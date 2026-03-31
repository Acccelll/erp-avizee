import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { PrecosEspeciaisTab } from "@/components/precos/PrecosEspeciaisTab";
import { User, Mail, Phone, MapPin, FileText, CreditCard } from "lucide-react";

interface Props {
  id: string;
}

export function ClienteView({ id }: Props) {
  const [selected, setSelected] = useState<Tables<"clientes"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: c } = await supabase.from("clientes").select("*").eq("id", id).single();
      if (!c) return;
      setSelected(c);

      const { data: v } = await supabase
        .from("ordens_venda")
        .select("id, numero, data_emissao, valor_total, status")
        .eq("cliente_id", c.id)
        .order("data_emissao", { ascending: false })
        .limit(10);

      setVendas(v || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados do cliente...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Cliente não encontrado</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate">{selected.nome_razao_social}</h3>
          <p className="text-xs text-muted-foreground font-mono">{selected.cpf_cnpj}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
          <TabsTrigger value="vendas" className="text-xs">Vendas</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs">Financeiro</TabsTrigger>
          <TabsTrigger value="precos" className="text-xs">Preços</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><Mail className="h-3 w-3" /> Contato</h4>
              <p><span className="text-muted-foreground">Email:</span> {selected.email || "—"}</p>
              <p><span className="text-muted-foreground">Telefone:</span> {selected.telefone || "—"}</p>
              <p><span className="text-muted-foreground">Celular:</span> {selected.celular || "—"}</p>
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

        <TabsContent value="vendas" className="space-y-3 mt-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Últimos Pedidos</h4>
          {vendas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum pedido encontrado</p>
          ) : (
            <div className="space-y-2">
              {vendas.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded border bg-card hover:bg-muted/30 transition-colors text-sm">
                  <div>
                    <RelationalLink onClick={() => pushView("ordem_venda", v.id)} className="font-mono">{v.numero}</RelationalLink>
                    <p className="text-[10px] text-muted-foreground">{formatDate(v.data_emissao)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(v.valor_total)}</p>
                    <StatusBadge status={v.status} className="h-4 text-[10px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 mt-3">
           <div className="rounded-lg border p-4 space-y-3">
             <h4 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Condições Padrão</h4>
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                 <p className="text-[10px] text-muted-foreground uppercase font-semibold">Forma de Pagto</p>
                 <p>{selected.forma_pagamento_padrao || "Não definida"}</p>
               </div>
               <div>
                 <p className="text-[10px] text-muted-foreground uppercase font-semibold">Prazo (dias)</p>
                 <p>{selected.prazo_padrao || "Não definido"}</p>
               </div>
             </div>
           </div>
        </TabsContent>

        <TabsContent value="precos" className="mt-3">
          <PrecosEspeciaisTab clienteId={selected.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
