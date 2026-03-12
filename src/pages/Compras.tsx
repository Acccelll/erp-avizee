import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Compra {
  id: string; numero: string; fornecedor_id: string; data_compra: string;
  data_entrega: string; valor_total: number; observacoes: string;
  status: string; ativo: boolean; created_at: string;
  fornecedores?: { nome_razao_social: string };
}

const emptyForm = { numero: "", fornecedor_id: "", data_compra: new Date().toISOString().split("T")[0], data_entrega: "", valor_total: 0, observacoes: "", status: "rascunho" };

const Compras = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<Compra>({ table: "compras", select: "*, fornecedores(nome_razao_social)" });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Compra | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm, numero: `CMP-${String(data.length + 1).padStart(3, "0")}` }); setModalOpen(true); };
  const openEdit = (c: Compra) => {
    setMode("edit"); setSelected(c);
    setForm({ numero: c.numero, fornecedor_id: c.fornecedor_id || "", data_compra: c.data_compra, data_entrega: c.data_entrega || "", valor_total: c.valor_total || 0, observacoes: c.observacoes || "", status: c.status });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = { ...form, fornecedor_id: form.fornecedor_id || null };
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const columns = [
    { key: "numero", label: "Nº", render: (c: Compra) => <span className="mono text-xs font-medium text-primary">{c.numero}</span> },
    { key: "fornecedor", label: "Fornecedor", render: (c: Compra) => (c as any).fornecedores?.nome_razao_social || "—" },
    { key: "data_compra", label: "Data", render: (c: Compra) => new Date(c.data_compra).toLocaleDateString("pt-BR") },
    { key: "valor_total", label: "Total", render: (c: Compra) => <span className="font-semibold">R$ {Number(c.valor_total || 0).toFixed(2)}</span> },
    { key: "status", label: "Status", render: (c: Compra) => <StatusBadge status={c.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Compras" subtitle="Registro e controle de compras" addLabel="Nova Compra" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={(c) => { setSelected(c); setDrawerOpen(true); }}
          onEdit={openEdit} onDelete={(c) => remove(c.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Compra" : "Editar Compra"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required /></div>
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
            <div className="space-y-2"><Label>Fornecedor</Label>
              <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedoresCrud.data.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data Compra</Label><Input type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Entrega</Label><Input type="date" value={form.data_entrega} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} /></div>
            <div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: Number(e.target.value) })} /></div>
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
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium mono">{selected.numero}</p></div>
            <div><span className="text-xs text-muted-foreground">Fornecedor</span><p>{(selected as any).fornecedores?.nome_razao_social || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Data Compra</span><p>{new Date(selected.data_compra).toLocaleDateString("pt-BR")}</p></div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold">R$ {Number(selected.valor_total || 0).toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Compras;
