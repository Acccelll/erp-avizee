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

interface Orcamento {
  id: string; numero: string; cliente_id: string; data_orcamento: string;
  validade: string; valor_total: number; observacoes: string; status: string;
  ativo: boolean; clientes?: { nome_razao_social: string };
}

const emptyForm = { numero: "", cliente_id: "", data_orcamento: new Date().toISOString().split("T")[0], validade: "", valor_total: 0, observacoes: "", status: "rascunho" };

const Orcamentos = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<Orcamento>({ table: "orcamentos", select: "*, clientes(nome_razao_social)" });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Orcamento | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm, numero: `ORC-${String(data.length + 1).padStart(3, "0")}` }); setModalOpen(true); };
  const openEdit = (o: Orcamento) => {
    setMode("edit"); setSelected(o);
    setForm({ numero: o.numero, cliente_id: o.cliente_id || "", data_orcamento: o.data_orcamento, validade: o.validade || "", valor_total: o.valor_total || 0, observacoes: o.observacoes || "", status: o.status });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = { ...form, cliente_id: form.cliente_id || null };
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const columns = [
    { key: "numero", label: "Nº", render: (o: Orcamento) => <span className="mono text-xs font-medium text-primary">{o.numero}</span> },
    { key: "cliente", label: "Cliente", render: (o: Orcamento) => (o as any).clientes?.nome_razao_social || "—" },
    { key: "data_orcamento", label: "Data", render: (o: Orcamento) => new Date(o.data_orcamento).toLocaleDateString("pt-BR") },
    { key: "validade", label: "Validade", render: (o: Orcamento) => o.validade ? new Date(o.validade).toLocaleDateString("pt-BR") : "—" },
    { key: "valor_total", label: "Total", render: (o: Orcamento) => <span className="font-semibold">R$ {Number(o.valor_total || 0).toFixed(2)}</span> },
    { key: "status", label: "Status", render: (o: Orcamento) => <StatusBadge status={o.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Orçamentos" subtitle="Orçamentos e pedidos de venda" addLabel="Novo Orçamento" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={(o) => { setSelected(o); setDrawerOpen(true); }}
          onEdit={openEdit} onDelete={(o) => remove(o.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Orçamento" : "Editar Orçamento"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="faturado">Faturado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientesCrud.data.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data_orcamento} onChange={(e) => setForm({ ...form, data_orcamento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Validade</Label><Input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></div>
            <div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Orçamento">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium mono">{selected.numero}</p></div>
            <div><span className="text-xs text-muted-foreground">Cliente</span><p>{(selected as any).clientes?.nome_razao_social || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Data</span><p>{new Date(selected.data_orcamento).toLocaleDateString("pt-BR")}</p></div>
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold">R$ {Number(selected.valor_total || 0).toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Orcamentos;
