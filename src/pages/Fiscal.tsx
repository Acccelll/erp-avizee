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

interface NotaFiscal {
  id: string; tipo: string; numero: string; serie: string; chave_acesso: string;
  data_emissao: string; fornecedor_id: string; cliente_id: string;
  valor_total: number; status: string; observacoes: string; ativo: boolean;
  fornecedores?: { nome_razao_social: string }; clientes?: { nome_razao_social: string };
}

const emptyForm: Record<string, any> = {
  tipo: "entrada", numero: "", serie: "1", chave_acesso: "", data_emissao: new Date().toISOString().split("T")[0],
  fornecedor_id: "", cliente_id: "", valor_total: 0, status: "pendente", observacoes: "",
  movimenta_estoque: true, gera_financeiro: true,
};

const Fiscal = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<NotaFiscal>({
    table: "notas_fiscais", select: "*, fornecedores(nome_razao_social), clientes(nome_razao_social)"
  });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<NotaFiscal | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setMode("create"); setForm({...emptyForm}); setModalOpen(true); };
  const openEdit = (n: NotaFiscal) => {
    setMode("edit"); setSelected(n);
    setForm({ tipo: n.tipo, numero: n.numero, serie: n.serie || "1", chave_acesso: n.chave_acesso || "",
      data_emissao: n.data_emissao, fornecedor_id: n.fornecedor_id || "", cliente_id: n.cliente_id || "",
      valor_total: n.valor_total, status: n.status, observacoes: n.observacoes || "",
      movimenta_estoque: true, gera_financeiro: true });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = { ...form, fornecedor_id: form.fornecedor_id || null, cliente_id: form.cliente_id || null };
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const columns = [
    { key: "tipo", label: "Tipo", render: (n: NotaFiscal) => <StatusBadge status={n.tipo === "entrada" ? "Confirmado" : "Pendente"} /> },
    { key: "numero", label: "Número", render: (n: NotaFiscal) => <span className="mono text-xs font-medium text-primary">{n.numero}</span> },
    { key: "parceiro", label: "Parceiro", render: (n: NotaFiscal) => n.tipo === "entrada" ? (n as any).fornecedores?.nome_razao_social || "—" : (n as any).clientes?.nome_razao_social || "—" },
    { key: "data_emissao", label: "Emissão", render: (n: NotaFiscal) => new Date(n.data_emissao).toLocaleDateString("pt-BR") },
    { key: "valor_total", label: "Total", render: (n: NotaFiscal) => <span className="font-semibold">R$ {Number(n.valor_total).toFixed(2)}</span> },
    { key: "status", label: "Status", render: (n: NotaFiscal) => <StatusBadge status={n.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fiscal" subtitle="Notas fiscais de entrada e saída" addLabel="Nova NF" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={(n) => { setSelected(n); setDrawerOpen(true); }}
          onEdit={openEdit} onDelete={(n) => remove(n.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Nota Fiscal" : "Editar Nota Fiscal"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="confirmada">Confirmada</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Série</Label><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label>Chave de Acesso</Label><Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: Number(e.target.value) })} /></div>
            {form.tipo === "entrada" && (
              <div className="space-y-2"><Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{fornecedoresCrud.data.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome_razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.tipo === "saida" && (
              <div className="space-y-2"><Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{clientesCrud.data.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Tipo</span><p className="capitalize">{selected.tipo}</p></div>
            <div><span className="text-xs text-muted-foreground">Número / Série</span><p className="mono font-medium">{selected.numero} / {selected.serie}</p></div>
            {selected.chave_acesso && <div><span className="text-xs text-muted-foreground">Chave</span><p className="mono text-xs break-all">{selected.chave_acesso}</p></div>}
            <div><span className="text-xs text-muted-foreground">Valor Total</span><p className="font-semibold">R$ {Number(selected.valor_total).toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Fiscal;
