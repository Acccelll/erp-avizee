import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { Truck, Mail, Phone, MapPin, ShoppingBag, CreditCard, Package, AlertTriangle, FileText } from "lucide-react";

interface Props {
  id: string;
}

export function FornecedorView({ id }: Props) {
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [compras, setCompras] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: f } = await supabase.from("fornecedores").select("*").eq("id", id).single();
      if (!f) return;
      setSelected(f);

      const [cRes, fRes, pRes] = await Promise.all([
        supabase
        .from("pedidos_compra")
        .select("id, numero, data_pedido, valor_total, status")
        .eq("fornecedor_id", f.id)
        .order("data_pedido", { ascending: false })
        .limit(10),
        supabase
        .from("financeiro_lancamentos")
        .select("*")
        .eq("fornecedor_id", f.id)
        .order("data_vencimento", { ascending: false })
        .limit(10),
        supabase
        .from("produtos_fornecedores")
        .select("*, produtos(id, nome, sku)")
        .eq("fornecedor_id", f.id)
      ]);

      setCompras(cRes.data || []);
      setFinanceiro(fRes.data || []);
      setProdutos(pRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados do fornecedor...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Fornecedor não encontrado</div>;

  const ultCompra = compras.length > 0 ? compras[0].data_pedido : null;
  const volumeTotal = compras.reduce((acc, curr) => acc + (curr.valor_total || 0), 0);
  const vencidos = financeiro.filter(f => f.status === 'vencido');
  const totalAberto = financeiro.filter(f => f.status === 'aberto' || f.status === 'vencido').reduce((acc, curr) => acc + (curr.saldo_restante || curr.valor), 0);

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Saldo Aberto</p>
          <p className="font-mono font-bold text-xs">{formatCurrency(totalAberto)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Vencidos</p>
          <p className={`font-mono font-bold text-xs ${vencidos.length > 0 ? 'text-destructive' : ''}`}>{vencidos.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Vol. Compras</p>
          <p className="font-mono font-bold text-xs">{formatCurrency(volumeTotal)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Ult. Compra</p>
          <p className="font-mono font-bold text-xs">{ultCompra ? formatDate(ultCompra) : "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="geral" className="text-xs px-1">Geral</TabsTrigger>
          <TabsTrigger value="compras" className="text-xs px-1">Compras</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-xs px-1">Financ.</TabsTrigger>
          <TabsTrigger value="produtos" className="text-xs px-1">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><Mail className="h-3 w-3" /> Contato</h4>
                <p><span className="text-muted-foreground">Email:</span> {selected.email || "—"}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {selected.telefone || "—"}</p>
                <p><span className="text-muted-foreground">Contato:</span> {selected.contato || "—"}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><CreditCard className="h-3 w-3" /> Condições</h4>
                <p><span className="text-muted-foreground">Prazo Médio:</span> {selected.prazo_padrao || "—"} dias</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><MapPin className="h-3 w-3" /> Endereço</h4>
                <p className="leading-tight">
                  {selected.logradouro}, {selected.numero}<br />
                  {selected.bairro} — {selected.cidade}/{selected.uf}<br />
                  CEP: {selected.cep}
                </p>
              </div>
              {selected.observacoes && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 border-b pb-1 text-muted-foreground uppercase text-[10px]"><FileText className="h-3 w-3" /> Observações</h4>
                  <p className="text-xs text-muted-foreground italic leading-relaxed">{selected.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compras" className="space-y-3 mt-3">
          <h4 className="font-semibold text-sm flex items-center gap-2 px-1 text-muted-foreground uppercase text-[10px]"><ShoppingBag className="h-3.5 w-3.5" /> Últimos Pedidos de Compra</h4>
          {compras.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 border rounded-xl border-dashed">Nenhum pedido de compra encontrado</p>
          ) : (
            <div className="space-y-2">
              {compras.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded border bg-card hover:bg-muted/30 transition-colors text-sm">
                  <div>
                    <RelationalLink onClick={() => pushView("pedido_compra", c.id)} className="font-mono">PC {c.numero}</RelationalLink>
                    <p className="text-[10px] text-muted-foreground">{formatDate(c.data_pedido)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(c.valor_total)}</p>
                    <StatusBadge status={c.status} className="h-3.5 text-[9px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-3 mt-3">
           <h4 className="font-semibold text-sm flex items-center gap-2 px-1 text-muted-foreground uppercase text-[10px]"><CreditCard className="h-3.5 w-3.5" /> Lançamentos de Contas a Pagar</h4>
           {financeiro.length === 0 ? (
             <p className="text-xs text-muted-foreground text-center py-8 border rounded-xl border-dashed">Nenhum lançamento financeiro</p>
           ) : (
             <div className="space-y-2">
               {financeiro.map((f) => (
                 <div key={f.id} className="flex items-center justify-between p-2.5 rounded border bg-card text-xs">
                   <div>
                     <p className="font-medium truncate max-w-[180px]">{f.descricao}</p>
                     <p className="text-[10px] text-muted-foreground">Vencimento: {formatDate(f.data_vencimento)}</p>
                   </div>
                   <div className="text-right">
                     <p className={`font-bold ${f.status === 'vencido' ? 'text-destructive' : ''}`}>
                       {formatCurrency(f.saldo_restante || f.valor)}
                     </p>
                     <StatusBadge status={f.status} className="h-3.5 text-[9px]" />
                   </div>
                 </div>
               ))}
             </div>
           )}
        </TabsContent>

        <TabsContent value="produtos" className="space-y-3 mt-3">
           <h4 className="font-semibold text-sm flex items-center gap-2 px-1 text-muted-foreground uppercase text-[10px]"><Package className="h-3.5 w-3.5" /> Produtos Fornecidos</h4>
           {produtos.length === 0 ? (
             <p className="text-xs text-muted-foreground text-center py-8 border rounded-xl border-dashed">Nenhum produto vinculado</p>
           ) : (
             <div className="space-y-2">
               {produtos.map((p) => (
                 <div key={p.id} className="flex items-center justify-between p-2.5 rounded border bg-card text-xs">
                   <div>
                     <button onClick={() => pushView("produto", p.produtos?.id)} className="font-medium hover:underline text-left">
                       {p.produtos?.nome}
                     </button>
                     <p className="text-[10px] text-muted-foreground font-mono">{p.produtos?.sku}</p>
                     {p.referencia_fornecedor && <p className="text-[9px] text-primary mt-0.5">Ref: {p.referencia_fornecedor}</p>}
                   </div>
                   <div className="text-right">
                     <p className="font-bold">{formatCurrency(p.preco_compra || 0)}</p>
                     <p className="text-[9px] text-muted-foreground">{p.lead_time_dias || 0} dias de prazo</p>
                     {p.eh_principal && <span className="inline-block bg-primary/10 text-primary px-1 rounded-[2px] mt-0.5 font-bold">Principal</span>}
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
