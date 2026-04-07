import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ContaBancariaDrawer } from "@/components/financeiro/ContaBancariaDrawer";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Landmark } from "lucide-react";

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
      supabase.from("bancos").select("*").eq("ativo", true).order("nome"),
      supabase.from("contas_bancarias").select("*, bancos(nome, tipo)").eq("ativo", true).order("created_at", { ascending: false }),
    ]);
    setBancos(b || []);
    setContas(c || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saldoTotal = contas.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);

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
        const { error } = await supabase.from("contas_bancarias").insert(form);
        if (error) throw error;
        toast.success("Conta criada com sucesso!");
      } else if (selected) {
        const { error } = await supabase.from("contas_bancarias").update(form).eq("id", selected.id);
        if (error) throw error;
        toast.success("Conta atualizada com sucesso!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) { console.error('[contas-bancarias]', err); toast.error("Erro ao salvar conta bancária."); }
    setSaving(false);
  };

  const handleDelete = async (c: ContaBancaria) => {
    const { error } = await supabase.from("contas_bancarias").update({ ativo: false }).eq("id", c.id);
    if (error) { toast.error("Erro ao remover conta."); return; }
    toast.success("Conta removida!");
    fetchData();
  };

  const columns = [
    { key: "banco", label: "Banco", render: (c: ContaBancaria) => c.bancos?.nome || "—" },
    { key: "descricao", label: "Descrição" },
    { key: "agencia", label: "Agência", render: (c: ContaBancaria) => c.agencia || "—" },
    { key: "conta", label: "Conta", render: (c: ContaBancaria) => c.conta || "—" },
    { key: "titular", label: "Titular", render: (c: ContaBancaria) => c.titular || "—" },
    { key: "saldo", label: "Saldo", render: (c: ContaBancaria) => (
      <span className={`font-semibold mono ${Number(c.saldo_atual || 0) >= 0 ? "text-success" : "text-destructive"}`}>
        {formatCurrency(Number(c.saldo_atual || 0))}
      </span>
    )},
  ];

  return (
    <AppLayout>
      <ModulePage title="Contas Bancárias" subtitle="Bancos e contas financeiras" addLabel="Nova Conta" onAdd={openCreate} count={contas.length}>
        {/* Summary cards per bank */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Saldo Total" value={formatCurrency(saldoTotal)} icon={Wallet} variant={saldoTotal >= 0 ? "success" : "danger"} />
          {contas.slice(0, 3).map(c => (
            <div key={c.id} className="rounded-xl border bg-card p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">{c.bancos?.nome}</p>
              </div>
              <p className="text-sm font-medium">{c.descricao}</p>
              <p className={`text-lg font-bold mono ${Number(c.saldo_atual || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(Number(c.saldo_atual || 0))}
              </p>
              {c.agencia && <p className="text-xs text-muted-foreground">Ag: {c.agencia} | CC: {c.conta}</p>}
            </div>
          ))}
        </div>

        <DataTable columns={columns} data={contas} loading={loading}
          onView={(c) => { setSelected(c); setDrawerOpen(true); }} />
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

      <ContaBancariaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selected={selected}
        onEdit={(c) => openEdit(c)}
        onDelete={(c) => handleDelete(c)}
      />
    </AppLayout>
  );
};

export default ContasBancarias;
