import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { formatCurrency } from "@/lib/format";

interface Lancamento {
  id: string; tipo: string; descricao: string; valor: number;
  data_vencimento: string; data_pagamento: string; status: string;
  forma_pagamento: string; banco: string; cartao: string;
  cliente_id: string; fornecedor_id: string; nota_fiscal_id: string;
  parcela_numero: number; parcela_total: number;
  observacoes: string; ativo: boolean;
  clientes?: { nome_razao_social: string }; fornecedores?: { nome_razao_social: string };
}

const emptyForm: Record<string, any> = {
  tipo: "receber", descricao: "", valor: 0, data_vencimento: new Date().toISOString().split("T")[0],
  data_pagamento: "", status: "aberto", forma_pagamento: "", banco: "", cartao: "",
  cliente_id: "", fornecedor_id: "", observacoes: "",
};

const Financeiro = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<Lancamento>({
    table: "financeiro_lancamentos", select: "*, clientes(nome_razao_social), fornecedores(nome_razao_social)"
  });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Lancamento | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({...emptyForm});
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get("tipo"); // "pagar" or "receber"
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState<string>(tipoParam || "todos");

  useEffect(() => {
    if (tipoParam) setFilterTipo(tipoParam);
  }, [tipoParam]);

  const openCreate = () => { setMode("create"); setForm({...emptyForm}); setModalOpen(true); };
  const openEdit = (l: Lancamento) => {
    setMode("edit"); setSelected(l);
    setForm({
      tipo: l.tipo, descricao: l.descricao, valor: l.valor, data_vencimento: l.data_vencimento,
      data_pagamento: l.data_pagamento || "", status: l.status,
      forma_pagamento: l.forma_pagamento || "", banco: l.banco || "", cartao: l.cartao || "",
      cliente_id: l.cliente_id || "", fornecedor_id: l.fornecedor_id || "", observacoes: l.observacoes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast.error("Descrição e valor são obrigatórios"); return; }

    // Block invalid payment: pago requires data_pagamento and forma_pagamento
    if (form.status === "pago") {
      if (!form.data_pagamento) { toast.error("Data de pagamento é obrigatória para status Pago"); return; }
      if (!form.forma_pagamento) { toast.error("Forma de pagamento é obrigatória para status Pago"); return; }
    }

    setSaving(true);
    try {
      const payload = {
        ...form, cliente_id: form.cliente_id || null, fornecedor_id: form.fornecedor_id || null,
        data_pagamento: form.data_pagamento || null,
      };
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const filteredData = filterStatus === "todos" ? data : data.filter(l => l.status === filterStatus);

  const columns = [
    { key: "tipo", label: "Tipo", render: (l: Lancamento) => l.tipo === "receber" ? "A Receber" : "A Pagar" },
    { key: "descricao", label: "Descrição" },
    { key: "parceiro", label: "Parceiro", render: (l: Lancamento) => l.tipo === "receber" ? (l as any).clientes?.nome_razao_social || "—" : (l as any).fornecedores?.nome_razao_social || "—" },
    { key: "valor", label: "Valor", render: (l: Lancamento) => <span className="font-semibold font-mono">R$ {Number(l.valor).toFixed(2)}</span> },
    { key: "data_vencimento", label: "Vencimento", render: (l: Lancamento) => {
      const d = new Date(l.data_vencimento);
      const isOverdue = l.status === "aberto" && d < new Date();
      return <span className={isOverdue ? "text-destructive font-semibold" : ""}>{d.toLocaleDateString("pt-BR")}</span>;
    }},
    { key: "forma_pagamento", label: "Forma", render: (l: Lancamento) => l.forma_pagamento || "—" },
    { key: "status", label: "Status", render: (l: Lancamento) => <StatusBadge status={l.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Financeiro" subtitle="Contas a pagar e receber" addLabel="Novo Lançamento" onAdd={openCreate} count={filteredData.length}>
        {/* Filter bar */}
        <div className="flex gap-2 mb-4">
          {["todos", "aberto", "pago", "vencido", "cancelado"].map(s => (
            <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)} className="capitalize">
              {s === "todos" ? "Todos" : s}
            </Button>
          ))}
        </div>
        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={(l) => { setSelected(l); setDrawerOpen(true); }}
          onEdit={openEdit} onDelete={(l) => remove(l.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Lançamento" : "Editar Lançamento"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="receber">A Receber</SelectItem><SelectItem value="pagar">A Pagar</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="col-span-2 md:col-span-3 space-y-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} required /></div>
            <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Pagamento</Label><Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Banco</Label><Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cartão</Label><Input value={form.cartao} onChange={(e) => setForm({ ...form, cartao: e.target.value })} /></div>
            {form.tipo === "receber" && (
              <div className="space-y-2"><Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{clientesCrud.data.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.tipo === "pagar" && (
              <div className="space-y-2"><Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{fornecedoresCrud.data.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome_razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          {form.status === "pago" && (!form.data_pagamento || !form.forma_pagamento) && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              ⚠️ Para confirmar como Pago, preencha a Data de Pagamento e Forma de Pagamento.
            </div>
          )}

          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Lançamento">
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Tipo</span><p>{selected.tipo === "receber" ? "A Receber" : "A Pagar"}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Descrição</span><p className="font-medium">{selected.descricao}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Valor</span><p className="font-semibold font-mono">R$ {Number(selected.valor).toFixed(2)}</p></div>
              <div><span className="text-xs text-muted-foreground">Vencimento</span><p>{new Date(selected.data_vencimento).toLocaleDateString("pt-BR")}</p></div>
            </div>
            {selected.data_pagamento && (
              <div><span className="text-xs text-muted-foreground">Data Pagamento</span><p>{new Date(selected.data_pagamento).toLocaleDateString("pt-BR")}</p></div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Forma</span><p>{selected.forma_pagamento || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Banco</span><p>{selected.banco || "—"}</p></div>
            </div>
            {selected.parcela_numero && (
              <div><span className="text-xs text-muted-foreground">Parcela</span><p>{selected.parcela_numero}/{selected.parcela_total}</p></div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Financeiro;
