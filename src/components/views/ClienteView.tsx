import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Clock, MessageSquare, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { PrecosEspeciaisTab } from "@/components/precos/PrecosEspeciaisTab";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { TimelineList } from "@/components/ui/TimelineList";

interface Props {
  id: string;
}

export function ClienteView({ id }: Props) {
  const [selected, setSelected] = useState<Tables<"clientes"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [comRecords, setComRecords] = useState<any[]>([]);
  const [empresasGrupo, setEmpresasGrupo] = useState<any[]>([]);
  const [pmv, setPmv] = useState<number | null>(null);
  const [pmvTitulos, setPmvTitulos] = useState<any[]>([]);
  const [saldoAberto, setSaldoAberto] = useState(0);
  const [titulosVencidos, setTitulosVencidos] = useState(0);
  const [ultimaCompra, setUltimaCompra] = useState<string | null>(null);
  const [transportadorasCliente, setTransportadorasCliente] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: c } = await supabase.from("clientes").select("*").eq("id", id).single();
      if (!c) return;
      setSelected(c);

      const [comRes, empRes, titulosRes, orcRes, transpRes] = await Promise.all([
        supabase.from("cliente_registros_comunicacao").select("*").eq("cliente_id", c.id).order("data_hora", { ascending: false }),
        c.grupo_economico_id ? supabase.from("clientes").
          select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf").
          eq("grupo_economico_id", c.grupo_economico_id).eq("ativo", true).neq("id", c.id) : Promise.resolve({ data: [] }),
        supabase.from("financeiro_lancamentos").
          select("id, descricao, data_vencimento, data_pagamento, valor, status").
          eq("cliente_id", c.id).eq("tipo", "receber").eq("ativo", true).
          order("data_vencimento", { ascending: false }).limit(50),
        supabase.from("orcamentos").
          select("id, data_orcamento").eq("cliente_id", c.id).eq("ativo", true).
          order("data_orcamento", { ascending: false }).limit(1),
        supabase.from("cliente_transportadoras").
          select("*, transportadoras:transportadora_id(id, nome_razao_social, modalidade, prazo_medio)").
          eq("cliente_id", c.id).eq("ativo", true).order("prioridade")
      ]);

      setComRecords(comRes.data || []);
      setEmpresasGrupo(empRes.data || []);
      setTransportadorasCliente(transpRes.data || []);
      setUltimaCompra(orcRes.data?.[0]?.data_orcamento || null);

      const titulos = titulosRes.data || [];
      setPmvTitulos(titulos);
      const aberto = titulos.filter((t: any) => t.status === "aberto" || t.status === "vencido");
      setSaldoAberto(aberto.reduce((s: number, t: any) => s + Number(t.valor || 0), 0));
      setTitulosVencidos(aberto.filter((t: any) => t.status === "vencido").length);

      const pagos = titulos.filter((t: any) => t.data_pagamento);
      if (pagos.length > 0) {
        const totalDias = pagos.reduce((acc: number, t: any) => {
          const venc = new Date(t.data_vencimento);
          const pag = new Date(t.data_pagamento);
          return acc + Math.round((pag.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        setPmv(Math.round(totalDias / pagos.length));
      } else {
        setPmv(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando dados do cliente...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Cliente não encontrado</div>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">{selected.tipo_pessoa === "F" ? "Pessoa Física" : "Pessoa Jurídica"} • {selected.cpf_cnpj || "—"}</p>
            <h3 className="font-semibold text-lg">{selected.nome_razao_social}</h3>
            {selected.nome_fantasia && <p className="text-sm text-muted-foreground">{selected.nome_fantasia}</p>}
          </div>
          <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center rounded-lg border bg-background p-2 overflow-hidden">
            <p className="text-[10px] text-muted-foreground uppercase">Limite</p>
            <p className="font-mono font-semibold text-sm truncate">{formatCurrency(selected.limite_credito || 0)}</p>
          </div>
          <div className="text-center rounded-lg border bg-background p-2 overflow-hidden">
            <p className="text-[10px] text-muted-foreground uppercase">Saldo Aberto</p>
            <p className={`font-mono font-semibold text-sm truncate ${saldoAberto > 0 ? "text-warning" : ""}`}>{formatCurrency(saldoAberto)}</p>
          </div>
          <div className="text-center rounded-lg border bg-background p-2 overflow-hidden">
            <p className="text-muted-foreground uppercase text-xs">PMV</p>
            <p className={`font-mono font-semibold text-sm truncate ${pmv !== null && pmv > 0 ? "text-warning" : pmv !== null && pmv < 0 ? "text-success" : ""}`}>
              {pmv !== null ? `${pmv > 0 ? "+" : ""}${pmv}d` : "—"}
            </p>
          </div>
          <div className="text-center rounded-lg border bg-background p-2 overflow-hidden">
            <p className="text-[10px] text-muted-foreground uppercase">Últ. Compra</p>
            <p className="font-mono font-semibold text-sm truncate">{ultimaCompra ? formatDate(ultimaCompra) : "—"}</p>
          </div>
        </div>
        {titulosVencidos > 0 && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2 mt-2">
            <AlertTriangle className="w-3 h-3" /> {titulosVencidos} título(s) vencido(s)
          </div>
        )}
      </div>

      <Tabs defaultValue="cadastro" className="w-full">
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="cadastro" className="text-[10px] px-1">Cadastro</TabsTrigger>
          <TabsTrigger value="financeiro" className="text-[10px] px-1">Financeiro</TabsTrigger>
          <TabsTrigger value="transp" className="text-[10px] px-1">Transp.</TabsTrigger>
          <TabsTrigger value="precos" className="text-[10px] px-1">Preços</TabsTrigger>
          <TabsTrigger value="endereco" className="text-[10px] px-1">Endereço</TabsTrigger>
          <TabsTrigger value="historico" className="text-[10px] px-1">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-xs text-muted-foreground">E-mail</span><p className="text-sm">{selected.email || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Contato</span><p className="text-sm">{selected.contato || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Telefone</span><p className="text-sm">{selected.telefone || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Celular</span><p className="text-sm">{selected.celular || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Prazo Padrão</span><p className="text-sm">{selected.prazo_padrao || 30} dias</p></div>
            <div><span className="text-xs text-muted-foreground">I.E.</span><p className="font-mono text-sm">{selected.inscricao_estadual || "—"}</p></div>
          </div>
          {selected.observacoes && <div><span className="text-xs text-muted-foreground">Observações</span><p className="text-sm">{selected.observacoes}</p></div>}
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-3 mt-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> PMV — Prazo Médio de Vencimento</span>
            {pmv !== null ? (
              <div>
                <p className="text-2xl font-bold mt-1">{pmv > 0 ? `+${pmv}` : pmv} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Sem títulos pagos para cálculo</p>
            )}
          </div>
          {pmvTitulos.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Últimos Títulos</h4>
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {pmvTitulos.slice(0, 15).map((t: any) => (
                  <div key={t.id} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                    <div>
                      <p className="text-xs">{t.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">Venc: {formatDate(t.data_vencimento)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs">{formatCurrency(t.valor)}</p>
                      <StatusBadge status={t.status === "pago" ? "Pago" : t.status === "vencido" ? "Vencido" : "Aberto"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transp" className="space-y-3 mt-3">
          {transportadorasCliente.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transportadora vinculada</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {transportadorasCliente.map((ct: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 border-b last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <RelationalLink onClick={() => pushView("transportadora" as any, ct.transportadoras?.id)}>{ct.transportadoras?.nome_razao_social || "—"}</RelationalLink>
                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {ct.modalidade && <span>{ct.modalidade}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">P{ct.prioridade || 1}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="precos" className="space-y-3 mt-3">
          <PrecosEspeciaisTab clienteId={selected.id} />
        </TabsContent>

        <TabsContent value="endereco" className="space-y-3 mt-3">
          {selected.logradouro ? (
            <div className="text-sm space-y-1">
              <p>{selected.logradouro}, {selected.numero}{selected.complemento ? ` - ${selected.complemento}` : ""}</p>
              <p>{selected.bairro} - {selected.cidade}/{selected.uf}</p>
              <p>CEP: {selected.cep}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-3 mt-3">
          <TimelineList
            items={comRecords.map((r: any) => ({ id: r.id, title: r.assunto, description: r.descricao, date: r.data_hora, type: r.canal }))}
            emptyMessage="Nenhum registro de comunicação"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
