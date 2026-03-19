import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

interface Banco { id: string; nome: string; tipo: string; ativo: boolean; }
interface ContaBancaria {
  id: string; banco_id: string; descricao: string; agencia: string; conta: string;
  titular: string; saldo_atual: number; ativo: boolean;
  bancos?: { nome: string; tipo: string };
}

const ContasBancarias = () => {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ContaBancaria | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ banco_id: "", descricao: "", agencia: "", conta: "", titular: "", saldo_atual: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: b }, { data: c }] = await Promise.all([
      (supabase as any).from("bancos").select("*").eq("ativo", true).order("nome"),
      (supabase as any).from("contas_bancarias").select("*, bancos(nome, tipo)").eq("ativo", true).order("created_at", { ascending: false }),
    ]);
    setBancos(b || []);
    setContas(c || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setMode("create");
    setForm({ banco_id: "", descricao: "", agencia: "", conta: "", titular: "", saldo_atual: 0 });
    setModalOpen(true);
  };

  const openEdit = (c: ContaBancaria) => {
    setMode("edit"); setSelected(c);
    setForm({ banco_id: c.banco_id, descricao: c.descricao, agencia: c.agencia || "", conta: c.conta || "", titular: c.titular || "", saldo_atual: Number(c.saldo_atual || 0) });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.banco_id || !form.descricao) { toast.error("Banco e descrição são obrigatórios"); return; }
    setSaving(true);
    try {
      if (mode === "create") {
        const { error } = await (supabase as any).from("contas_bancarias").insert(form);
        if (error) throw error;
        toast.success("Conta criada com sucesso!");
      } else if (selected) {
        const { error } = await (supabase as any).from("contas_bancarias").update(form).eq("id", selected.id);
        if (error) throw error;
        toast.success("Conta atualizada com sucesso!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) { console.error('[contas-bancarias]', err); toast.error("Erro ao salvar conta bancária. Tente novamente."); }
    setSaving(false);
  };

  const handleDelete = async (c: ContaBancaria) => {
    const { error } = await (supabase as any).from("contas_bancarias").update({ ativo: false }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta removida!");
    fetchData();
  };

  const tipoLabels: Record<string, string> = { banco: "Banco", wallet: "Carteira Digital", conta_pagamento: "Conta Pagamento" };

  const columns = [
    { key: "banco", label: "Banco", render: (c: ContaBancaria) => c.bancos?.nome || "—" },
    { key: "tipo", label: "Tipo", render: (c: ContaBancaria) => tipoLabels[c.bancos?.tipo || ""] || c.bancos?.tipo || "—" },
    { key: "descricao", label: "Descrição" },
    { key: "agencia", label: "Agência", render: (c: ContaBancaria) => c.agencia || "—" },
    { key: "conta", label: "Conta", render: (c: ContaBancaria) => c.conta || "—" },
    { key: "saldo", label: "Saldo", render: (c: ContaBancaria) => <span className="font-semibold mono">{formatCurrency(Number(c.saldo_atual || 0))}</span> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Contas Bancárias" subtitle="Bancos e contas financeiras" addLabel="Nova Conta" onAdd={openCreate} count={contas.length}>
        <DataTable columns={columns} data={contas} loading={loading}
          onView={(c) => { setSelected(c); setDrawerOpen(true); }}
          onEdit={openEdit} onDelete={handleDelete} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Conta Bancária" : "Editar Conta"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Banco *</Label>
              <Select value={form.banco_id} onValueChange={(v) => setForm({ ...form, banco_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Conta Corrente Principal" required /></div>
            <div className="space-y-2"><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} /></div>
            <div className="space-y-2"><Label>Conta</Label><Input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} /></div>
            <div className="space-y-2"><Label>Titular</Label><Input value={form.titular} onChange={e => setForm({ ...form, titular: e.target.value })} /></div>
            <div className="space-y-2"><Label>Saldo Atual</Label><Input type="number" step="0.01" value={form.saldo_atual} onChange={e => setForm({ ...form, saldo_atual: Number(e.target.value) })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Conta">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Banco</span><p className="font-medium">{selected.bancos?.nome}</p></div>
            <div><span className="text-xs text-muted-foreground">Descrição</span><p>{selected.descricao}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Agência</span><p>{selected.agencia || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Conta</span><p>{selected.conta || "—"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Titular</span><p>{selected.titular || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Saldo Atual</span><p className="font-bold mono text-lg">{formatCurrency(Number(selected.saldo_atual || 0))}</p></div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default ContasBancarias;
