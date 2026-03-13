import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { AutocompleteSearch } from "@/components/ui/AutocompleteSearch";
import { ItemsGrid, type GridItem } from "@/components/ui/ItemsGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotaFiscal {
  id: string; tipo: string; numero: string; serie: string; chave_acesso: string;
  data_emissao: string; fornecedor_id: string; cliente_id: string;
  valor_total: number; status: string; forma_pagamento: string; condicao_pagamento: string;
  observacoes: string; ativo: boolean; movimenta_estoque: boolean; gera_financeiro: boolean;
  fornecedores?: { nome_razao_social: string; cpf_cnpj: string };
  clientes?: { nome_razao_social: string };
}

const emptyForm: Record<string, any> = {
  tipo: "entrada", numero: "", serie: "1", chave_acesso: "", data_emissao: new Date().toISOString().split("T")[0],
  fornecedor_id: "", cliente_id: "", valor_total: 0, status: "pendente", observacoes: "",
  movimenta_estoque: true, gera_financeiro: true, forma_pagamento: "", condicao_pagamento: "a_vista",
};

const Fiscal = () => {
  const { data, loading, create, update, remove, fetchData } = useSupabaseCrud<NotaFiscal>({
    table: "notas_fiscais", select: "*, fornecedores(nome_razao_social, cpf_cnpj), clientes(nome_razao_social)"
  });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<NotaFiscal | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({...emptyForm});
  const [items, setItems] = useState<GridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const valorProdutos = items.reduce((s, i) => s + (i.valor_total || 0), 0);

  const openCreate = () => { setMode("create"); setForm({...emptyForm}); setItems([]); setSelected(null); setParcelas(1); setModalOpen(true); };
  const openEdit = async (n: NotaFiscal) => {
    setMode("edit"); setSelected(n);
    setForm({
      tipo: n.tipo, numero: n.numero, serie: n.serie || "1", chave_acesso: n.chave_acesso || "",
      data_emissao: n.data_emissao, fornecedor_id: n.fornecedor_id || "", cliente_id: n.cliente_id || "",
      valor_total: n.valor_total, status: n.status, observacoes: n.observacoes || "",
      movimenta_estoque: n.movimenta_estoque !== false, gera_financeiro: n.gera_financeiro !== false,
      forma_pagamento: n.forma_pagamento || "", condicao_pagamento: n.condicao_pagamento || "a_vista",
    });
    const { data: itens } = await (supabase as any).from("notas_fiscais_itens")
      .select("*, produtos(nome, sku)").eq("nota_fiscal_id", n.id);
    setItems((itens || []).map((i: any) => ({
      id: i.id, produto_id: i.produto_id, codigo: i.produtos?.sku || "",
      descricao: i.produtos?.nome || "", quantidade: i.quantidade,
      valor_unitario: i.valor_unitario, valor_total: i.quantidade * i.valor_unitario,
    })));
    setModalOpen(true);
  };

  const openView = async (n: NotaFiscal) => {
    setSelected(n); setDrawerOpen(true);
    const { data: itens } = await (supabase as any).from("notas_fiscais_itens")
      .select("*, produtos(nome, sku)").eq("nota_fiscal_id", n.id);
    setViewItems(itens || []);
  };

  const handleConfirmar = async (nf: NotaFiscal) => {
    try {
      // Update status
      await (supabase as any).from("notas_fiscais").update({ status: "confirmada" }).eq("id", nf.id);

      // Get items for stock movement
      const { data: itens } = await (supabase as any).from("notas_fiscais_itens")
        .select("*").eq("nota_fiscal_id", nf.id);

      // Generate stock movements
      if (nf.movimenta_estoque !== false && itens) {
        for (const item of itens) {
          const { data: prod } = await (supabase as any).from("produtos").select("estoque_atual").eq("id", item.produto_id).single();
          const saldo_anterior = Number(prod?.estoque_atual || 0);
          const qty = nf.tipo === "entrada" ? item.quantidade : -item.quantidade;
          const saldo_atual = saldo_anterior + qty;

          await (supabase as any).from("estoque_movimentos").insert({
            produto_id: item.produto_id, tipo: nf.tipo === "entrada" ? "entrada" : "saida",
            quantidade: item.quantidade, saldo_anterior, saldo_atual,
            documento_tipo: "fiscal", documento_id: nf.id,
          });
          await (supabase as any).from("produtos").update({ estoque_atual: saldo_atual }).eq("id", item.produto_id);
        }
      }

      // Generate financial records
      if (nf.gera_financeiro !== false) {
        const tipo_fin = nf.tipo === "entrada" ? "pagar" : "receber";
        const isAVista = nf.condicao_pagamento === "a_vista";

        if (isAVista) {
          await (supabase as any).from("financeiro_lancamentos").insert({
            tipo: tipo_fin, descricao: `NF ${nf.numero}`,
            valor: nf.valor_total, data_vencimento: nf.data_emissao,
            data_pagamento: nf.data_emissao, status: "pago",
            fornecedor_id: nf.fornecedor_id || null, cliente_id: nf.cliente_id || null,
            nota_fiscal_id: nf.id, forma_pagamento: nf.forma_pagamento,
          });
        } else {
          const numParcelas = parcelas || 1;
          for (let i = 0; i < numParcelas; i++) {
            const venc = new Date(nf.data_emissao);
            venc.setDate(venc.getDate() + 30 * (i + 1));
            await (supabase as any).from("financeiro_lancamentos").insert({
              tipo: tipo_fin, descricao: `NF ${nf.numero} - Parcela ${i + 1}/${numParcelas}`,
              valor: nf.valor_total / numParcelas, data_vencimento: venc.toISOString().split("T")[0],
              status: "aberto",
              fornecedor_id: nf.fornecedor_id || null, cliente_id: nf.cliente_id || null,
              nota_fiscal_id: nf.id, forma_pagamento: nf.forma_pagamento,
              parcela_numero: i + 1, parcela_total: numParcelas,
            });
          }
        }
      }

      toast.success("Nota fiscal confirmada! Estoque e financeiro atualizados.");
      fetchData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form, fornecedor_id: form.fornecedor_id || null, cliente_id: form.cliente_id || null,
        valor_total: valorProdutos || form.valor_total,
      };

      let nfId = selected?.id;
      if (mode === "create") {
        const { data: newNf, error } = await (supabase as any).from("notas_fiscais").insert(payload).select().single();
        if (error) throw error;
        nfId = newNf.id;
      } else if (selected) {
        await (supabase as any).from("notas_fiscais").update(payload).eq("id", selected.id);
        await (supabase as any).from("notas_fiscais_itens").delete().eq("nota_fiscal_id", selected.id);
      }

      if (items.length > 0 && nfId) {
        const itemsPayload = items.filter(i => i.produto_id).map(i => ({
          nota_fiscal_id: nfId, produto_id: i.produto_id, quantidade: i.quantidade, valor_unitario: i.valor_unitario,
        }));
        if (itemsPayload.length > 0) {
          await (supabase as any).from("notas_fiscais_itens").insert(itemsPayload);
        }
      }

      toast.success("Nota fiscal salva!");
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
    setSaving(false);
  };

  const columns = [
    { key: "tipo", label: "Tipo", render: (n: NotaFiscal) => n.tipo === "entrada" ? "Entrada" : "Saída" },
    { key: "numero", label: "Número", render: (n: NotaFiscal) => <span className="font-mono text-xs font-medium text-primary">{n.numero}</span> },
    { key: "parceiro", label: "Parceiro", render: (n: NotaFiscal) => n.tipo === "entrada" ? (n as any).fornecedores?.nome_razao_social || "—" : (n as any).clientes?.nome_razao_social || "—" },
    { key: "data_emissao", label: "Emissão", render: (n: NotaFiscal) => new Date(n.data_emissao).toLocaleDateString("pt-BR") },
    { key: "valor_total", label: "Total", render: (n: NotaFiscal) => <span className="font-semibold font-mono">R$ {Number(n.valor_total).toFixed(2)}</span> },
    { key: "status", label: "Status", render: (n: NotaFiscal) => <StatusBadge status={n.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fiscal" subtitle="Notas fiscais, faturas e documentos" addLabel="Nova NF" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(n) => remove(n.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Nota Fiscal" : "Editar Nota Fiscal"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required className="font-mono" /></div>
            <div className="space-y-2"><Label>Série</Label><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
          </div>

          <div className="col-span-2 space-y-2"><Label>Chave de Acesso</Label><Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} className="font-mono text-xs" /></div>

          {/* Parceiro */}
          <div className="bg-accent/30 rounded-lg p-4 space-y-3">
            {form.tipo === "entrada" ? (
              <>
                <Label className="text-sm font-semibold">Fornecedor</Label>
                <AutocompleteSearch
                  options={fornecedoresCrud.data.map((f: any) => ({ id: f.id, label: f.nome_razao_social, sublabel: f.cpf_cnpj }))}
                  value={form.fornecedor_id} onChange={(id) => setForm({ ...form, fornecedor_id: id })}
                  placeholder="Buscar fornecedor..."
                />
              </>
            ) : (
              <>
                <Label className="text-sm font-semibold">Cliente</Label>
                <AutocompleteSearch
                  options={clientesCrud.data.map((c: any) => ({ id: c.id, label: c.nome_razao_social, sublabel: c.cpf_cnpj }))}
                  value={form.cliente_id} onChange={(id) => setForm({ ...form, cliente_id: id })}
                  placeholder="Buscar cliente..."
                />
              </>
            )}
          </div>

          {/* Items */}
          <ItemsGrid items={items} onChange={setItems} produtos={produtosCrud.data} title="Itens da Nota" />

          {/* Payment */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Forma de Pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Condição</Label>
              <Select value={form.condicao_pagamento} onValueChange={(v) => setForm({ ...form, condicao_pagamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_vista">À Vista</SelectItem>
                  <SelectItem value="a_prazo">A Prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.condicao_pagamento === "a_prazo" && (
              <div className="space-y-2"><Label>Nº Parcelas</Label><Input type="number" min={1} max={48} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} /></div>
            )}
            <div className="space-y-2 flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={form.movimenta_estoque} onChange={(e) => setForm({ ...form, movimenta_estoque: e.target.checked })} className="rounded" />
                Mov. Estoque
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={form.gera_financeiro} onChange={(e) => setForm({ ...form, gera_financeiro: e.target.checked })} className="rounded" />
                Gera Financeiro
              </label>
            </div>
          </div>

          {/* Total */}
          <div className="bg-accent/50 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total dos Itens: <span className="font-mono font-semibold">R$ {valorProdutos.toFixed(2)}</span></span>
            {form.condicao_pagamento === "a_prazo" && parcelas > 1 && (
              <span className="text-sm text-muted-foreground">{parcelas}× de <span className="font-mono font-semibold">R$ {(valorProdutos / parcelas).toFixed(2)}</span></span>
            )}
          </div>

          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Nota Fiscal">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Tipo</span><p className="capitalize">{selected.tipo}</p></div>
              <div><span className="text-xs text-muted-foreground">Número / Série</span><p className="font-mono font-medium">{selected.numero} / {selected.serie}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold font-mono">R$ {Number(selected.valor_total).toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>

            {viewItems.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2">Itens ({viewItems.length})</h4>
                <div className="space-y-1">
                  {viewItems.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                      <span>{i.produtos?.nome || "—"} × {i.quantidade}</span>
                      <span className="font-mono">R$ {(i.quantidade * i.valor_unitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === "pendente" && (
              <Button className="w-full mt-3" onClick={() => { handleConfirmar(selected); setDrawerOpen(false); }}>
                Confirmar Nota Fiscal
              </Button>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Fiscal;
