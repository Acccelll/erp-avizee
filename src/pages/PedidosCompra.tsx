import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { SummaryCard } from "@/components/SummaryCard";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, FileInput } from "lucide-react";
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
import { formatCurrency, formatNumber } from "@/lib/format";
import { ShoppingCart, Clock, CheckCircle2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PedidoCompra {
  id: string; numero: string; fornecedor_id: string; data_pedido: string;
  data_entrega_prevista: string; valor_total: number; status: string;
  observacoes: string; cotacao_compra_id: string; ativo: boolean; created_at: string;
  fornecedores?: { nome_razao_social: string; cpf_cnpj: string };
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente", aprovado: "Aprovado", parcial: "Receb. Parcial",
  concluido: "Concluído", cancelado: "Cancelado",
};

const emptyForm: Record<string, any> = {
  numero: "", fornecedor_id: "", data_pedido: new Date().toISOString().split("T")[0],
  data_entrega_prevista: "", status: "pendente", observacoes: "",
};

const PedidosCompra = () => {
  const { data, loading, fetchData } = useSupabaseCrud<PedidoCompra>({
    table: "pedidos_compra", select: "*, fornecedores(nome_razao_social, cpf_cnpj)",
  });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<PedidoCompra | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<GridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const navigate = useNavigate();

  const valorTotal = items.reduce((s, i) => s + (i.valor_total || 0), 0);

  const kpis = useMemo(() => {
    const pendentes = data.filter(p => p.status === "pendente" || p.status === "aprovado");
    const concluidos = data.filter(p => p.status === "concluido");
    const totalValue = data.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    return { total: data.length, totalValue, pending: pendentes.length, done: concluidos.length };
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
      data_entrega_prevista: p.data_entrega_prevista || "", status: p.status,
      observacoes: p.observacoes || "",
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
    setSelected(p); setDrawerOpen(true);
    const { data: itens } = await supabase.from("pedidos_compra_itens" as any).select("*, produtos(nome, sku)").eq("pedido_compra_id", p.id);
    setViewItems(itens || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = { ...form, fornecedor_id: form.fornecedor_id || null, valor_total: valorTotal };
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

  const darEntrada = (p: PedidoCompra) => {
    // Navigate to Fiscal with pre-filled data
    navigate(`/fiscal?tipo=entrada&fornecedor_id=${p.fornecedor_id || ""}&pedido_compra=${p.numero}`);
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
      <ModulePage title="Pedidos de Compra" subtitle="Gestão de pedidos de compra como pré-nota" addLabel="Novo Pedido" onAdd={openCreate} count={data.length}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total" value={formatNumber(kpis.total)} icon={ShoppingCart} variationType="neutral" variation="pedidos" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={ShoppingCart} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Pendentes" value={formatNumber(kpis.pending)} icon={Clock} variationType={kpis.pending > 0 ? "negative" : "positive"} variant={kpis.pending > 0 ? "warning" : undefined} variation="aguardando" />
          <SummaryCard title="Concluídos" value={formatNumber(kpis.done)} icon={CheckCircle2} variationType="positive" variation="recebidos" />
        </div>
        <DataTable columns={columns} data={data} loading={loading} onView={openView} />
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
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="parcial">Receb. Parcial</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
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
          <div className="flex items-center justify-end rounded-lg bg-accent/50 p-4">
            <span className="mr-2 text-sm text-muted-foreground">TOTAL:</span>
            <span className="text-lg font-bold font-mono text-primary">{formatCurrency(valorTotal)}</span>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Pedido de Compra"
        actions={selected ? <>
          {(selected.status === "aprovado" || selected.status === "pendente") && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setDrawerOpen(false); darEntrada(selected); }}><FileInput className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Dar Entrada (NF)</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={async () => { setDrawerOpen(false); await supabase.from("pedidos_compra" as any).update({ ativo: false } as any).eq("id", selected.id); fetchData(); toast.success("Removido!"); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium font-mono">{selected.numero}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} label={statusLabels[selected.status] || selected.status} /></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Fornecedor</span><p>{selected.fornecedores?.nome_razao_social || "—"}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Data Pedido</span><p>{new Date(selected.data_pedido).toLocaleDateString("pt-BR")}</p></div>
              <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold font-mono">{formatCurrency(Number(selected.valor_total || 0))}</p></div>
            </div>
            {selected.data_entrega_prevista && (
              <div><span className="text-xs text-muted-foreground">Entrega Prevista</span><p>{new Date(selected.data_entrega_prevista).toLocaleDateString("pt-BR")}</p></div>
            )}
            {viewItems.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="mb-2 text-sm font-semibold">Itens ({viewItems.length})</h4>
                <div className="space-y-1">
                  {viewItems.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between border-b py-1 text-sm last:border-b-0">
                      <span>{i.produtos?.nome || "—"} × {i.quantidade}</span>
                      <span className="font-mono font-semibold">{formatCurrency(Number(i.valor_total))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.observacoes && (
              <div className="border-t pt-3">
                <span className="text-xs text-muted-foreground">Observações</span>
                <p className="text-sm">{selected.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default PedidosCompra;
