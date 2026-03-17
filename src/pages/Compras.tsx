import { useState, useEffect } from "react";
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

interface Compra {
  id: string; numero: string; fornecedor_id: string; data_compra: string;
  data_entrega_prevista: string; data_entrega_real: string;
  valor_produtos: number; frete_valor: number; impostos_valor: number; valor_total: number;
  observacoes: string; status: string; ativo: boolean; created_at: string;
  fornecedores?: { nome_razao_social: string; cpf_cnpj: string };
}

const emptyForm: Record<string, any> = {
  numero: "", fornecedor_id: "", data_compra: new Date().toISOString().split("T")[0],
  data_entrega_prevista: "", data_entrega_real: "", frete_valor: 0, impostos_valor: 0,
  observacoes: "", status: "rascunho",
};

const Compras = () => {
  const { data, loading, create, update, remove, fetchData } = useSupabaseCrud<Compra>({
    table: "compras", select: "*, fornecedores(nome_razao_social, cpf_cnpj)"
  });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Compra | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<GridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const valorProdutos = items.reduce((s, i) => s + (i.valor_total || 0), 0);
  const valorTotal = valorProdutos + (form.frete_valor || 0) + (form.impostos_valor || 0);

  const openCreate = () => {
    setMode("create"); setForm({ ...emptyForm, numero: `CMP-${String(data.length + 1).padStart(4, "0")}` });
    setItems([]); setSelected(null); setModalOpen(true);
  };

  const openEdit = async (c: Compra) => {
    setMode("edit"); setSelected(c);
    setForm({
      numero: c.numero, fornecedor_id: c.fornecedor_id || "", data_compra: c.data_compra,
      data_entrega_prevista: c.data_entrega_prevista || "", data_entrega_real: c.data_entrega_real || "",
      frete_valor: c.frete_valor || 0, impostos_valor: c.impostos_valor || 0,
      observacoes: c.observacoes || "", status: c.status,
    });
    const { data: itens } = await (supabase as any).from("compras_itens")
      .select("*, produtos(nome, sku)").eq("compra_id", c.id);
    setItems((itens || []).map((i: any) => ({
      id: i.id, produto_id: i.produto_id, codigo: i.produtos?.sku || "",
      descricao: i.produtos?.nome || "", quantidade: i.quantidade,
      valor_unitario: i.valor_unitario, valor_total: i.valor_total,
    })));
    setModalOpen(true);
  };

  const openView = async (c: Compra) => {
    setSelected(c); setDrawerOpen(true);
    const { data: itens } = await (supabase as any).from("compras_itens")
      .select("*, produtos(nome, sku)").eq("compra_id", c.id);
    setViewItems(itens || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      // Auto ENTREGUE when data_entrega_real is filled
      let status = form.status;
      if (form.data_entrega_real && status !== "cancelado") {
        status = "faturado"; // Using faturado as "entregue"
      }

      const payload = {
        ...form, status, fornecedor_id: form.fornecedor_id || null,
        valor_produtos: valorProdutos, valor_total: valorTotal,
      };

      let compraId = selected?.id;
      if (mode === "create") {
        const { data: newC, error } = await (supabase as any).from("compras").insert(payload).select().single();
        if (error) throw error;
        compraId = newC.id;
      } else if (selected) {
        await (supabase as any).from("compras").update(payload).eq("id", selected.id);
        await (supabase as any).from("compras_itens").delete().eq("compra_id", selected.id);
      }

      // Insert items
      if (items.length > 0 && compraId) {
        const itemsPayload = items.filter(i => i.produto_id).map(i => ({
          compra_id: compraId, produto_id: i.produto_id, quantidade: i.quantidade,
          valor_unitario: i.valor_unitario, valor_total: i.valor_total,
        }));
        if (itemsPayload.length > 0) {
          await (supabase as any).from("compras_itens").insert(itemsPayload);
        }
      }

      toast.success("Compra salva com sucesso!");
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
    setSaving(false);
  };

  const fornecedorOptions = fornecedoresCrud.data.map((f: any) => ({
    id: f.id, label: f.nome_razao_social, sublabel: f.cpf_cnpj || "",
  }));

  const selectedFornecedor = fornecedoresCrud.data.find((f: any) => f.id === form.fornecedor_id);

  const columns = [
    { key: "numero", label: "Nº", render: (c: Compra) => <span className="font-mono text-xs font-medium text-primary">{c.numero}</span> },
    { key: "fornecedor", label: "Fornecedor", render: (c: Compra) => (c as any).fornecedores?.nome_razao_social || "—" },
    { key: "data_compra", label: "Data", render: (c: Compra) => new Date(c.data_compra).toLocaleDateString("pt-BR") },
    { key: "valor_total", label: "Total", render: (c: Compra) => <span className="font-semibold font-mono">R$ {Number(c.valor_total || 0).toFixed(2)}</span> },
    { key: "status", label: "Status", render: (c: Compra) => <StatusBadge status={c.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Compras" subtitle="Registro e controle de compras" addLabel="Nova Compra" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(c) => remove(c.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Compra" : "Editar Compra"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required className="font-mono" /></div>
            <div className="space-y-2"><Label>Data Compra</Label><Input type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fornecedor */}
          <div className="bg-accent/30 rounded-lg p-4 space-y-3">
            <Label className="text-sm font-semibold">Fornecedor</Label>
            <AutocompleteSearch
              options={fornecedorOptions}
              value={form.fornecedor_id}
              onChange={(id) => setForm({ ...form, fornecedor_id: id })}
              placeholder="Buscar por nome ou CNPJ..."
            />
            {selectedFornecedor && (
              <div className="text-sm grid grid-cols-3 gap-2">
                <p><span className="text-muted-foreground text-xs">Razão Social:</span><br/>{selectedFornecedor.nome_razao_social}</p>
                <p><span className="text-muted-foreground text-xs">CNPJ:</span><br/><span className="font-mono">{selectedFornecedor.cpf_cnpj || "—"}</span></p>
                <p><span className="text-muted-foreground text-xs">Contato:</span><br/>{selectedFornecedor.telefone || "—"}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <ItemsGrid items={items} onChange={setItems} produtos={produtosCrud.data} title="Itens da Compra" />

          {/* Totais e Entregas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Frete</Label><Input type="number" step="0.01" value={form.frete_valor} onChange={(e) => setForm({ ...form, frete_valor: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Impostos</Label><Input type="number" step="0.01" value={form.impostos_valor} onChange={(e) => setForm({ ...form, impostos_valor: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Entrega Prevista</Label><Input type="date" value={form.data_entrega_prevista} onChange={(e) => setForm({ ...form, data_entrega_prevista: e.target.value })} /></div>
            <div className="space-y-2"><Label>Entrega Real</Label><Input type="date" value={form.data_entrega_real} onChange={(e) => setForm({ ...form, data_entrega_real: e.target.value })} /></div>
          </div>

          {/* Total */}
          <div className="bg-accent/50 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Produtos:</span> <span className="font-mono font-semibold">R$ {valorProdutos.toFixed(2)}</span>
              <span className="mx-3 text-muted-foreground">|</span>
              <span className="text-muted-foreground">Frete:</span> <span className="font-mono">R$ {(form.frete_valor || 0).toFixed(2)}</span>
              <span className="mx-3 text-muted-foreground">|</span>
              <span className="text-muted-foreground">Impostos:</span> <span className="font-mono">R$ {(form.impostos_valor || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground mr-2">TOTAL:</span>
              <span className="text-lg font-bold font-mono text-primary">R$ {valorTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Compra">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium font-mono">{selected.numero}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Fornecedor</span><p>{(selected as any).fornecedores?.nome_razao_social || "—"}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Data Compra</span><p>{new Date(selected.data_compra).toLocaleDateString("pt-BR")}</p></div>
              <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold font-mono">R$ {Number(selected.valor_total || 0).toFixed(2)}</p></div>
            </div>
            {viewItems.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2">Itens ({viewItems.length})</h4>
                <div className="space-y-1">
                  {viewItems.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                      <span>{i.produtos?.nome || "—"} × {i.quantidade}</span>
                      <span className="font-mono font-semibold">R$ {Number(i.valor_total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Compras;
