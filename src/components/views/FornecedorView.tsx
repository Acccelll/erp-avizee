import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";

interface Props {
  id: string;
}

export function FornecedorView({ id }: Props) {
  const [selected, setSelected] = useState<Tables<"fornecedores"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: f } = await supabase.from("fornecedores").select("*").eq("id", id).single();
      if (!f) return;
      setSelected(f);

      const [prodRes, notasRes] = await Promise.all([
        supabase.from("produtos_fornecedores").select("*, produtos(id, nome, sku)").eq("fornecedor_id", f.id),
        supabase.from("notas_fiscais").select("*").eq("fornecedor_id", f.id).order("data_emissao", { ascending: false }).limit(20)
      ]);

      setProdutos(prodRes.data || []);
      setNotas(notasRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados do fornecedor...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Fornecedor não encontrado</div>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">{selected.tipo_pessoa === "F" ? "Pessoa Física" : "Pessoa Jurídica"} • {selected.cpf_cnpj || "—"}</p>
            <h3 className="font-semibold text-lg">{selected.nome_razao_social}</h3>
          </div>
          <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
        </div>
      </div>

      <Tabs defaultValue="cadastro" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-xs text-muted-foreground">E-mail</span><p className="text-sm">{selected.email || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Telefone</span><p className="text-sm">{selected.telefone || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Logradouro</span><p className="text-sm">{selected.logradouro || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Cidade/UF</span><p className="text-sm">{selected.cidade}/{selected.uf || "—"}</p></div>
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-3 mt-3">
          <div className="space-y-2">
            {produtos.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 border-b last:border-b-0">
                <div>
                  <RelationalLink onClick={() => pushView("produto", p.produtos?.id)} className="text-sm">
                    {p.produtos?.nome}
                  </RelationalLink>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.produtos?.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono">{formatCurrency(p.preco_compra)}</p>
                </div>
              </div>
            ))}
            {produtos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto vinculado</p>}
          </div>
        </TabsContent>

        <TabsContent value="notas" className="space-y-3 mt-3">
          <div className="space-y-2">
            {notas.map((n, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 border-b last:border-b-0">
                <div>
                  <RelationalLink onClick={() => pushView("nota_fiscal", n.id)} mono className="text-sm">
                    NF {n.numero}
                  </RelationalLink>
                  <p className="text-[10px] text-muted-foreground">{formatDate(n.data_emissao)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold">{formatCurrency(n.valor_total)}</p>
                  <StatusBadge status={n.status} />
                </div>
              </div>
            ))}
            {notas.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota encontrada</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
