import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { formatCurrency } from "@/lib/format";

interface NotaFiscal {
  id: string; tipo: string; numero: string; serie: string; chave_acesso: string;
  data_emissao: string; fornecedor_id: string; cliente_id: string;
  valor_total: number; status: string; forma_pagamento: string; condicao_pagamento: string;
  observacoes: string; ativo: boolean; movimenta_estoque: boolean; gera_financeiro: boolean;
  ordem_venda_id: string | null; conta_contabil_id: string | null;
  fornecedores?: { nome_razao_social: string; cpf_cnpj: string };
  clientes?: { nome_razao_social: string };
  ordens_venda?: { numero: string };
}

const emptyForm: Record<string, any> = {
  tipo: "entrada", numero: "", serie: "1", chave_acesso: "", data_emissao: new Date().toISOString().split("T")[0],
  fornecedor_id: "", cliente_id: "", valor_total: 0, status: "pendente", observacoes: "",
  movimenta_estoque: true, gera_financeiro: true, forma_pagamento: "", condicao_pagamento: "a_vista",
  ordem_venda_id: "", conta_contabil_id: "",
};

const Fiscal = () => {
  const { data, loading, create, update, remove, fetchData } = useSupabaseCrud<NotaFiscal>({
    table: "notas_fiscais", select: "*, fornecedores(nome_razao_social, cpf_cnpj), clientes(nome_razao_social), ordens_venda(numero)"
  });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [ordensVenda, setOrdensVenda] = useState<any[]>([]);
  const [contasContabeis, setContasContabeis] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<NotaFiscal | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState<GridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const [consultaSearch, setConsultaSearch] = useState("");

  const valorProdutos = items.reduce((s, i) => s + (i.valor_total || 0), 0);

  useEffect(() => {
    const load = async () => {
      const [{ data: ovs }, { data: contas }] = await Promise.all([
        (supabase as any).from("ordens_venda").select("id, numero, cliente_id, clientes(nome_razao_social)").eq("ativo", true).in("status", ["aprovada", "em_separacao"]).order("numero"),
        (supabase as any).from("contas_contabeis").select("id, codigo, descricao").eq("ativo", true).eq("aceita_lancamento", true).order("codigo"),
      ]);
      setOrdensVenda(ovs || []);
      setContasContabeis(contas || []);
    };
    load();
  }, []);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setItems([]); setSelected(null); setParcelas(1); setModalOpen(true); };
  const openEdit = async (n: NotaFiscal) => {
    setMode("edit"); setSelected(n);
    setForm({
      tipo: n.tipo, numero: n.numero, serie: n.serie || "1", chave_acesso: n.chave_acesso || "",
      data_emissao: n.data_emissao, fornecedor_id: n.fornecedor_id || "", cliente_id: n.cliente_id || "",
      valor_total: n.valor_total, status: n.status, observacoes: n.observacoes || "",
      movimenta_estoque: n.movimenta_estoque !== false, gera_financeiro: n.gera_financeiro !== false,
      forma_pagamento: n.forma_pagamento || "", condicao_pagamento: n.condicao_pagamento || "a_vista",
      ordem_venda_id: n.ordem_venda_id || "", conta_contabil_id: n.conta_contabil_id || "",
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
      await (supabase as any).from("notas_fiscais").update({ status: "confirmada" }).eq("id", nf.id);

      const { data: itens } = await (supabase as any).from("notas_fiscais_itens")
        .select("*").eq("nota_fiscal_id", nf.id);

      // Stock movements
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

      // Financial records
      if (nf.gera_financeiro !== false) {
        const tipo_fin = nf.tipo === "entrada" ? "pagar" : "receber";
        const isAVista = nf.condicao_pagamento === "a_vista";
        if (isAVista) {
          await (supabase as any).from("financeiro_lancamentos").insert({
            tipo: tipo_fin, descricao: `NF ${nf.numero}`,
            valor: nf.valor_total, data_vencimento: nf.data_emissao,
            data_pagamento: nf.data_emissao, status: "pago",
            fornecedor_id: nf.fornecedor_id || null, cliente_id: nf.cliente_id || null,
            nota_fiscal_id: nf.id, documento_fiscal_id: nf.id,
            forma_pagamento: nf.forma_pagamento,
            conta_contabil_id: nf.conta_contabil_id || null,
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
              nota_fiscal_id: nf.id, documento_fiscal_id: nf.id,
              forma_pagamento: nf.forma_pagamento,
              parcela_numero: i + 1, parcela_total: numParcelas,
              conta_contabil_id: nf.conta_contabil_id || null,
            });
          }
        }
      }

      // Update OV billing status if NF is saída and linked to an OV
      if (nf.tipo === "saida" && nf.ordem_venda_id) {
        await updateOVFaturamento(nf.ordem_venda_id, itens || []);
      }

      toast.success("Nota fiscal confirmada! Estoque e financeiro atualizados.");
      fetchData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const updateOVFaturamento = async (ordemVendaId: string, nfItens: any[]) => {
    try {
      // Get OV items
      const { data: ovItens } = await (supabase as any).from("ordens_venda_itens")
        .select("id, produto_id, quantidade, quantidade_faturada")
        .eq("ordem_venda_id", ordemVendaId);

      if (!ovItens) return;

      // Update quantidade_faturada for matching products
      for (const nfItem of nfItens) {
        const ovItem = ovItens.find((oi: any) => oi.produto_id === nfItem.produto_id);
        if (ovItem) {
          const novaQtdFaturada = (ovItem.quantidade_faturada || 0) + nfItem.quantidade;
          await (supabase as any).from("ordens_venda_itens")
            .update({ quantidade_faturada: novaQtdFaturada })
            .eq("id", ovItem.id);
        }
      }

      // Recalculate OV faturamento status
      const { data: updatedItems } = await (supabase as any).from("ordens_venda_itens")
        .select("quantidade, quantidade_faturada")
        .eq("ordem_venda_id", ordemVendaId);

      const totalQtd = (updatedItems || []).reduce((s: number, i: any) => s + Number(i.quantidade), 0);
      const totalFaturado = (updatedItems || []).reduce((s: number, i: any) => s + Number(i.quantidade_faturada || 0), 0);

      let newStatus: string;
      if (totalFaturado >= totalQtd) newStatus = "total";
      else if (totalFaturado > 0) newStatus = "parcial";
      else newStatus = "aguardando";

      await (supabase as any).from("ordens_venda")
        .update({ status_faturamento: newStatus })
        .eq("id", ordemVendaId);

      toast.info(`OV atualizada: faturamento ${newStatus === "total" ? "total" : newStatus === "parcial" ? "parcial" : "aguardando"}`);
    } catch (err: any) {
      console.error("Erro ao atualizar faturamento OV:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fornecedor_id: form.fornecedor_id || null,
        cliente_id: form.cliente_id || null,
        ordem_venda_id: form.ordem_venda_id || null,
        conta_contabil_id: form.conta_contabil_id || null,
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


  const tipoParam = searchParams.get("tipo");
  const viewParam = searchParams.get("view");
  const filteredData = useMemo(() => {
    const query = consultaSearch.trim().toLowerCase();

    return data.filter((n) => {
      if (tipoParam && n.tipo !== tipoParam) return false;
      if (viewParam !== "consulta" || !query) return true;

      const parceiro = n.tipo === "entrada" ? n.fornecedores?.nome_razao_social : n.clientes?.nome_razao_social;
      const haystack = [n.numero, n.serie, n.chave_acesso, parceiro, n.ordens_venda?.numero]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [consultaSearch, data, tipoParam, viewParam]);

  const fiscalSubtitle = viewParam === "consulta"
    ? "Consulta rápida de documentos fiscais e chaves de acesso"
    : tipoParam === "entrada"
      ? "Notas fiscais de entrada e documentos de recebimento"
      : tipoParam === "saida"
        ? "Notas fiscais de saída e faturamento"
        : "Notas fiscais, faturas e documentos";

  const columns = [
    { key: "tipo", label: "Tipo", render: (n: NotaFiscal) => n.tipo === "entrada" ? "Entrada" : "Saída" },
    { key: "numero", label: "Número", render: (n: NotaFiscal) => <span className="font-mono text-xs font-medium text-primary">{n.numero}</span> },
    { key: "parceiro", label: "Parceiro", render: (n: NotaFiscal) => n.tipo === "entrada" ? (n as any).fornecedores?.nome_razao_social || "—" : (n as any).clientes?.nome_razao_social || "—" },
    { key: "ov", label: "OV", render: (n: NotaFiscal) => n.ordens_venda?.numero ? <span className="mono text-xs">{n.ordens_venda.numero}</span> : "—" },
    { key: "data_emissao", label: "Emissão", render: (n: NotaFiscal) => new Date(n.data_emissao).toLocaleDateString("pt-BR") },
    { key: "valor_total", label: "Total", render: (n: NotaFiscal) => <span className="font-semibold font-mono">{formatCurrency(Number(n.valor_total))}</span> },
    { key: "gera_fin", label: "Gera Fin.", render: (n: NotaFiscal) => (
      <span className={`text-xs font-medium ${n.gera_financeiro !== false ? "text-green-600" : "text-muted-foreground"}`}>
        {n.gera_financeiro !== false ? "Sim" : "Não"}
      </span>
    )},
    { key: "status", label: "Status", render: (n: NotaFiscal) => <StatusBadge status={n.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fiscal" subtitle={fiscalSubtitle} addLabel="Nova NF" onAdd={openCreate} count={filteredData.length}
        searchValue={viewParam === "consulta" ? consultaSearch : undefined}
        onSearchChange={viewParam === "consulta" ? setConsultaSearch : undefined}
        searchPlaceholder="Buscar por número, chave ou parceiro..."
      >
        <DataTable columns={columns} data={filteredData} loading={loading}
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

          {/* Partner */}
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

          {/* OV Link (only for saída) */}
          {form.tipo === "saida" && ordensVenda.length > 0 && (
            <div className="space-y-2">
              <Label>Ordem de Venda (opcional)</Label>
              <Select value={form.ordem_venda_id || "none"} onValueChange={(v) => setForm({ ...form, ordem_venda_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Vincular a uma OV..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {ordensVenda.map((ov: any) => (
                    <SelectItem key={ov.id} value={ov.id}>
                      {ov.numero} — {ov.clientes?.nome_razao_social || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Items */}
          <ItemsGrid items={items} onChange={setItems} produtos={produtosCrud.data} title="Itens da Nota" />

          {/* Payment + Flags */}
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

          {/* Conta Contábil */}
          {contasContabeis.length > 0 && (
            <div className="space-y-2">
              <Label>Conta Contábil (opcional)</Label>
              <Select value={form.conta_contabil_id || "none"} onValueChange={(v) => setForm({ ...form, conta_contabil_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Vincular conta contábil..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {contasContabeis.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Total */}
          <div className="bg-accent/50 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total dos Itens: <span className="font-mono font-semibold">{formatCurrency(valorProdutos)}</span></span>
            {form.condicao_pagamento === "a_prazo" && parcelas > 1 && (
              <span className="text-sm text-muted-foreground">{parcelas}× de <span className="font-mono font-semibold">{formatCurrency(valorProdutos / parcelas)}</span></span>
            )}
          </div>

          {!form.gera_financeiro && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              ⚠️ "Gera Financeiro" está desmarcado — esta NF <strong>não</strong> gerará lançamentos financeiros ao ser confirmada.
            </div>
          )}

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
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold font-mono">{formatCurrency(Number(selected.valor_total))}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
              <div><span className="text-xs text-muted-foreground">Gera Financeiro</span>
                <p className={selected.gera_financeiro !== false ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {selected.gera_financeiro !== false ? "Sim" : "Não"}
                </p>
              </div>
            </div>
            {selected.ordem_venda_id && selected.ordens_venda && (
              <div><span className="text-xs text-muted-foreground">Ordem de Venda</span><p className="mono font-medium">{selected.ordens_venda.numero}</p></div>
            )}

            {viewItems.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2">Itens ({viewItems.length})</h4>
                <div className="space-y-1">
                  {viewItems.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                      <span>{i.produtos?.nome || "—"} × {i.quantidade}</span>
                      <span className="font-mono">{formatCurrency(i.quantidade * i.valor_unitario)}</span>
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
