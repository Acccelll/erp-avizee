import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryCard } from "@/components/SummaryCard";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2 } from "@/components/ViewDrawerV2";
import { ViewField, ViewSection } from "@/components/ViewDrawer";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, PackageCheck, SendHorizontal } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { AutocompleteSearch } from "@/components/ui/AutocompleteSearch";
import { ItemsGrid, type GridItem } from "@/components/ui/ItemsGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ShoppingCart, Clock, CheckCircle2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogisticaRastreioSection } from "@/components/logistica/LogisticaRastreioSection";
import { statusPedidoCompra } from "@/lib/statusSchema";

interface PedidoCompra {
  id: string; numero: string; fornecedor_id: string; data_pedido: string;
  data_entrega_prevista: string; data_entrega_real: string; valor_total: number;
  frete_valor: number; condicao_pagamento: string; status: string;
  observacoes: string; cotacao_compra_id: string; ativo: boolean; created_at: string;
  fornecedores?: { nome_razao_social: string; cpf_cnpj: string };
}

const statusLabels: Record<string, string> = Object.fromEntries(
  Object.entries(statusPedidoCompra).map(([k, v]) => [k, v.label])
);

const emptyForm: Record<string, any> = {
  numero: "", fornecedor_id: "", data_pedido: new Date().toISOString().split("T")[0],
  data_entrega_prevista: "", data_entrega_real: "", frete_valor: "",
  condicao_pagamento: "", status: "rascunho", observacoes: "",
};

const PedidosCompra = () => {
  const { data, loading, fetchData } = useSupabaseCrud<PedidoCompra>({
    table: "pedidos_compra", select: "*, fornecedores(nome_razao_social, cpf_cnpj)",
  });
  const { pushView } = useRelationalNavigation();
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<PedidoCompra | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<GridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const navigate = useNavigate();

  const valorProdutos = items.reduce((s, i) => s + (i.valor_total || 0), 0);
  const valorTotal = valorProdutos + Number(form.frete_valor || 0);

  const kpis = useMemo(() => {
    const aguardando = data.filter(p =>
      ["rascunho", "aprovado", "enviado_ao_fornecedor", "aguardando_recebimento"].includes(p.status)
    );
    const recebidos = data.filter(p => p.status === "recebido");
    const totalValue = data.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    return { total: data.length, totalValue, aguardando: aguardando.length, recebidos: recebidos.length };
  }, [data]);

  const openCreate = () => {
    setMode("create");
    setForm({ ...emptyForm, numero: `PC-${String(data.length + 1).padStart(4, "0")}` });
    setItems([]); setSelected(null); setModalOpen(true);
  };

  const openEdit = async (p: PedidoCompra) => {
    setMode("edit"); setSelected(p);
    setForm({
      numero: p.numero, fornecedor_id: p.fornecedor_id || "", data_pedido: p.data_pedido,
      data_entrega_prevista: p.data_entrega_prevista || "",
      data_entrega_real: p.data_entrega_real || "",
      frete_valor: p.frete_valor || "",
      condicao_pagamento: p.condicao_pagamento || "",
      status: p.status, observacoes: p.observacoes || "",
    });
    const { data: itens } = await supabase.from("pedidos_compra_itens" as any).select("*, produtos(nome, sku)").eq("pedido_compra_id", p.id);
    setItems((itens || []).map((i: any) => ({
      id: i.id, produto_id: i.produto_id, codigo: i.produtos?.sku || "",
      descricao: i.produtos?.nome || "", quantidade: i.quantidade,
      valor_unitario: i.valor_unitario, valor_total: i.valor_total,
    })));
    setModalOpen(true);
  };

  const openView = async (p: PedidoCompra) => {
    setSelected(p);
    const { data: itens } = await supabase.from("pedidos_compra_itens" as any).select("*, produtos(nome, sku)").eq("pedido_compra_id", p.id);
    setViewItems(itens || []);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fornecedor_id: form.fornecedor_id || null,
        frete_valor: Number(form.frete_valor || 0),
        valor_total: valorTotal,
        data_entrega_real: form.data_entrega_real || null,
        condicao_pagamento: form.condicao_pagamento || null,
      };
      let pedidoId = selected?.id;
      if (mode === "create") {
        const { data: newP, error } = await supabase.from("pedidos_compra" as any).insert(payload).select().single();
        if (error) throw error;
        pedidoId = (newP as any).id;
      } else if (selected) {
        await supabase.from("pedidos_compra" as any).update(payload).eq("id", selected.id);
        await supabase.from("pedidos_compra_itens" as any).delete().eq("pedido_compra_id", selected.id);
      }
      if (items.length > 0 && pedidoId) {
        const itemsPayload = items.filter(i => i.produto_id).map(i => ({
          pedido_compra_id: pedidoId, produto_id: i.produto_id, quantidade: i.quantidade,
          valor_unitario: i.valor_unitario, valor_total: i.valor_total,
        }));
        if (itemsPayload.length > 0) await supabase.from("pedidos_compra_itens" as any).insert(itemsPayload);
      }
      toast.success("Pedido de compra salvo!");
      setModalOpen(false); fetchData();
    } catch (err: any) {
      console.error('[pedidos_compra]', err);
      toast.error("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  const darEntrada = async (p: PedidoCompra) => {
    // 1. Load items for this purchase order
    const { data: itens } = await supabase.from("pedidos_compra_itens" as any).select("*, produtos(nome, sku, estoque_atual)").eq("pedido_compra_id", p.id);
    if (!itens || itens.length === 0) {
      toast.error("Pedido sem itens para registrar recebimento.");
      return;
    }

    try {
      // 2. Generate stock movements (entrada) for each item
      for (const item of itens as any[]) {
        const saldoAnterior = Number(item.produtos?.estoque_atual || 0);
        const qtd = Number(item.quantidade || 0);
        await supabase.from("estoque_movimentos").insert({
          produto_id: item.produto_id,
          tipo: "entrada" as any,
          quantidade: qtd,
          saldo_anterior: saldoAnterior,
          saldo_atual: saldoAnterior + qtd,
          documento_tipo: "pedido_compra",
          documento_id: p.id,
          motivo: `Entrada via PC ${p.numero}`,
        });
        // Update product stock
        await supabase.from("produtos").update({ estoque_atual: saldoAnterior + qtd }).eq("id", item.produto_id);
      }

      // 3. Generate financial entry (conta a pagar)
      const vTotal = Number(p.valor_total || 0);
      if (vTotal > 0) {
        await supabase.from("financeiro_lancamentos").insert({
          tipo: "pagar" as any,
          descricao: `PC ${p.numero} — ${p.fornecedores?.nome_razao_social || "Fornecedor"}`,
          valor: vTotal,
          saldo_restante: vTotal,
          data_vencimento: p.data_entrega_prevista || new Date().toISOString().split("T")[0],
          status: "aberto" as any,
          fornecedor_id: p.fornecedor_id || null,
        });
      }

      // 4. Update purchase order status to "recebido" and record actual delivery date
      const hoje = new Date().toISOString().split("T")[0];
      await supabase.from("pedidos_compra" as any)
        .update({ status: "recebido", data_entrega_real: hoje } as any)
        .eq("id", p.id);

      toast.success("Recebimento registrado! Estoque atualizado e financeiro gerado.");
      setDrawerOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("[darEntrada]", err);
      toast.error("Erro ao processar recebimento.");
    }

    // Also navigate to fiscal for NF registration
    navigate(`/fiscal?tipo=entrada&fornecedor_id=${p.fornecedor_id || ""}&pedido_compra=${p.numero}`);
  };

  const marcarEnviado = async (p: PedidoCompra) => {
    try {
      await supabase.from("pedidos_compra" as any)
        .update({ status: "enviado_ao_fornecedor" } as any)
        .eq("id", p.id);
      toast.success("Pedido marcado como enviado ao fornecedor.");
      fetchData();
    } catch (err: any) {
      console.error("[marcarEnviado]", err);
      toast.error("Erro ao atualizar status.");
    }
  };

  const fornecedorOptions = fornecedoresCrud.data.map((f: any) => ({ id: f.id, label: f.nome_razao_social, sublabel: f.cpf_cnpj || "" }));

  const columns = [
    { key: "numero", label: "Nº", render: (p: PedidoCompra) => <span className="font-mono text-xs font-medium text-primary">{p.numero}</span> },
    { key: "fornecedor", label: "Fornecedor", render: (p: PedidoCompra) => p.fornecedores?.nome_razao_social || "—" },
    { key: "data_pedido", label: "Data", render: (p: PedidoCompra) => new Date(p.data_pedido).toLocaleDateString("pt-BR") },
    { key: "valor_total", label: "Total", render: (p: PedidoCompra) => <span className="font-semibold font-mono">{formatCurrency(Number(p.valor_total || 0))}</span> },
    { key: "status", label: "Status", render: (p: PedidoCompra) => <StatusBadge status={p.status} label={statusLabels[p.status] || p.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Pedidos de Compra" subtitle="Acompanhamento operacional de compras: envio, recebimento e integração com estoque/financeiro" addLabel="Novo Pedido" onAdd={openCreate} count={data.length}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total" value={formatNumber(kpis.total)} icon={ShoppingCart} variationType="neutral" variation="pedidos" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={ShoppingCart} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Aguardando" value={formatNumber(kpis.aguardando)} icon={Clock} variationType={kpis.aguardando > 0 ? "negative" : "positive"} variant={kpis.aguardando > 0 ? "warning" : undefined} variation="em andamento" />
          <SummaryCard title="Recebidos" value={formatNumber(kpis.recebidos)} icon={CheckCircle2} variationType="positive" variation="concluídos" />
        </div>
        <DataTable columns={columns} data={data} loading={loading} onView={openView} onEdit={openEdit} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Pedido de Compra" : "Editar Pedido"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required className="font-mono" /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data_pedido} onChange={(e) => setForm({ ...form, data_pedido: e.target.value })} /></div>
            <div className="space-y-2"><Label>Entrega Prevista</Label><Input type="date" value={form.data_entrega_prevista} onChange={(e) => setForm({ ...form, data_entrega_prevista: e.target.value })} /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="enviado_ao_fornecedor">Enviado ao Fornecedor</SelectItem>
                  <SelectItem value="aguardando_recebimento">Aguardando Recebimento</SelectItem>
                  <SelectItem value="parcialmente_recebido">Parcialmente Recebido</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3 rounded-lg bg-accent/30 p-4">
            <Label className="text-sm font-semibold">Fornecedor</Label>
            <AutocompleteSearch options={fornecedorOptions} value={form.fornecedor_id} onChange={(id) => setForm({ ...form, fornecedor_id: id })} placeholder="Buscar por nome ou CNPJ..." />
          </div>
          <ItemsGrid items={items} onChange={setItems} produtos={produtosCrud.data} title="Itens do Pedido" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Frete (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.frete_valor} onChange={(e) => setForm({ ...form, frete_valor: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Condição de Pagamento</Label>
              <Input value={form.condicao_pagamento} onChange={(e) => setForm({ ...form, condicao_pagamento: e.target.value })} placeholder="Ex: 30/60/90" />
            </div>
            <div className="space-y-2">
              <Label>Data Entrega Real</Label>
              <Input type="date" value={form.data_entrega_real} onChange={(e) => setForm({ ...form, data_entrega_real: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-end rounded-lg bg-accent/50 p-4 gap-6">
            <span className="text-sm text-muted-foreground">Produtos: <span className="font-mono font-medium">{formatCurrency(valorProdutos)}</span></span>
            <span className="text-sm text-muted-foreground">Frete: <span className="font-mono font-medium">{formatCurrency(Number(form.frete_valor || 0))}</span></span>
            <span className="ml-2 text-sm text-muted-foreground">TOTAL:</span>
            <span className="text-lg font-bold font-mono text-primary">{formatCurrency(valorTotal)}</span>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      {selected && (() => {
        const tabDados = (
          <div className="space-y-5">
            <ViewSection title="Informações">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Número"><span className="font-mono font-medium">{selected.numero}</span></ViewField>
                <ViewField label="Status"><StatusBadge status={selected.status} label={statusLabels[selected.status] || selected.status} /></ViewField>
                <ViewField label="Data Pedido">{new Date(selected.data_pedido).toLocaleDateString("pt-BR")}</ViewField>
                <ViewField label="Valor Total"><span className="font-semibold font-mono">{formatCurrency(Number(selected.valor_total || 0))}</span></ViewField>
                {selected.data_entrega_prevista && <ViewField label="Entrega Prevista">{new Date(selected.data_entrega_prevista).toLocaleDateString("pt-BR")}</ViewField>}
                {selected.data_entrega_real && <ViewField label="Entrega Real">{new Date(selected.data_entrega_real).toLocaleDateString("pt-BR")}</ViewField>}
                {selected.frete_valor ? <ViewField label="Frete"><span className="font-mono">{formatCurrency(Number(selected.frete_valor))}</span></ViewField> : null}
                {selected.condicao_pagamento && <ViewField label="Cond. Pagamento">{selected.condicao_pagamento}</ViewField>}
              </div>
            </ViewSection>
            <ViewSection title="Fornecedor">
              <ViewField label="Fornecedor">
                {selected.fornecedor_id ? (
                  <RelationalLink type="fornecedor" id={selected.fornecedor_id}>
                    {selected.fornecedores?.nome_razao_social || "—"}
                  </RelationalLink>
                ) : "—"}
              </ViewField>
            </ViewSection>
            {selected.cotacao_compra_id && (
              <ViewSection title="Origem">
                <ViewField label="Cotação de Compra">
                  <span className="font-mono text-xs text-primary">{selected.cotacao_compra_id}</span>
                </ViewField>
              </ViewSection>
            )}
            {selected.observacoes && (
              <ViewSection title="Observações">
                <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
              </ViewSection>
            )}
          </div>
        );

        const tabItens = (
          <div className="space-y-3">
            {viewItems.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Produto</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Qtd</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Vlr. Unit.</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewItems.map((i: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-3 py-2">{i.produtos?.nome || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{i.quantidade}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCurrency(Number(i.valor_unitario))}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(Number(i.valor_total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>
            )}
          </div>
        );

        const canReceive = ["aprovado", "enviado_ao_fornecedor", "aguardando_recebimento", "parcialmente_recebido"].includes(selected.status);
        const canSend = selected.status === "aprovado";

        const drawerFooter = canReceive || canSend ? (
          <div className="flex gap-2 w-full">
            {canSend && (
              <Button variant="outline" className="flex-1 gap-2" onClick={() => { marcarEnviado(selected); setSelected({ ...selected, status: "enviado_ao_fornecedor" }); }}>
                <SendHorizontal className="w-4 h-4" /> Marcar como Enviado
              </Button>
            )}
            {canReceive && (
              <Button className="flex-1 gap-2" onClick={() => { setDrawerOpen(false); darEntrada(selected); }}>
                <PackageCheck className="w-4 h-4" /> Registrar Recebimento
              </Button>
            )}
          </div>
        ) : undefined;

        return (
          <ViewDrawerV2
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title={`PC ${selected.numero}`}
            badge={<StatusBadge status={selected.status} label={statusLabels[selected.status] || selected.status} />}
            actions={<>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={async () => { setDrawerOpen(false); await supabase.from("pedidos_compra" as any).update({ ativo: false } as any).eq("id", selected.id); fetchData(); toast.success("Removido!"); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
            </>}
            summary={
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Itens</p>
                  <p className="font-semibold text-sm font-mono">{viewItems.length}</p>
                </div>
                <div className="bg-accent/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold text-sm capitalize">{statusLabels[selected.status] || selected.status}</p>
                </div>
                <div className="bg-accent/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold text-sm font-mono">{formatCurrency(Number(selected.valor_total || 0))}</p>
                </div>
              </div>
            }
            tabs={[
              { value: "dados", label: "Dados", content: tabDados },
              { value: "itens", label: `Itens (${viewItems.length})`, content: tabItens },
              { value: "logistica", label: "Logística", content: (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 px-1">
                    <Truck className="w-4 h-4" /> Rastreamento de Entrega
                  </h4>
                  <LogisticaRastreioSection pedidoCompraId={selected.id} />
                </div>
              )},
            ]}
            footer={drawerFooter}
          />
        );
      })()}
    </AppLayout>
  );
};

export default PedidosCompra;
