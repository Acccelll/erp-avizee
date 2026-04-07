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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Landmark, AlertTriangle, ShieldAlert } from "lucide-react";

interface Banco { id: string; nome: string; tipo: string; ativo: boolean; }
interface ContaBancaria {
  id: string; banco_id: string; descricao: string; agencia: string; conta: string;
  titular: string; saldo_atual: number; ativo: boolean;
  bancos?: { nome: string; tipo: string };
}

interface InUseCounts {
  lancamentos: number;
  baixas: number;
  caixaMovs: number;
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
  const [form, setForm] = useState({ banco_id: "", descricao: "", agencia: "", conta: "", titular: "", saldo_atual: 0, ativo: true });
  const [inUseCounts, setInUseCounts] = useState<InUseCounts>({ lancamentos: 0, baixas: 0, caixaMovs: 0 });
  const [confirmInactivate, setConfirmInactivate] = useState(false);

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
    setForm({ banco_id: "", descricao: "", agencia: "", conta: "", titular: "", saldo_atual: 0, ativo: true });
    setInUseCounts({ lancamentos: 0, baixas: 0, caixaMovs: 0 });
    setModalOpen(true);
  };

  const openEdit = async (c: ContaBancaria) => {
    setMode("edit");
    setSelected(c);
    setForm({
      banco_id: c.banco_id,
      descricao: c.descricao,
      agencia: c.agencia || "",
      conta: c.conta || "",
      titular: c.titular || "",
      saldo_atual: c.saldo_atual || 0,
      ativo: c.ativo,
    });
    const [{ count: lCount }, { count: bCount }, { count: cCount }] = await Promise.all([
      supabase.from("financeiro_lancamentos").select("id", { count: "exact", head: true }).eq("conta_bancaria_id", c.id).eq("ativo", true),
      supabase.from("financeiro_baixas" as any).select("id", { count: "exact", head: true }).eq("conta_bancaria_id", c.id),
      supabase.from("caixa_movimentos").select("id", { count: "exact", head: true }).eq("conta_bancaria_id", c.id),
    ]);
    setInUseCounts({ lancamentos: lCount ?? 0, baixas: bCount ?? 0, caixaMovs: cCount ?? 0 });
    setModalOpen(true);
  };

  const persistCreate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("contas_bancarias").insert({
        banco_id: form.banco_id,
        descricao: form.descricao,
        agencia: form.agencia || null,
        conta: form.conta || null,
        titular: form.titular || null,
        saldo_atual: form.saldo_atual,
      });
      if (error) throw error;
      toast.success("Conta criada com sucesso!");
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) { console.error('[contas-bancarias]', err); toast.error("Erro ao salvar conta bancária."); }
    setSaving(false);
  };

  const persistUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("contas_bancarias").update({
        descricao: form.descricao.trim(),
        banco_id: form.banco_id,
        agencia: form.agencia.trim() || null,
        conta: form.conta.trim() || null,
        titular: form.titular.trim() || null,
        ativo: form.ativo,
      }).eq("id", selected.id);
      if (error) throw error;
      toast.success("Conta bancária atualizada com sucesso!");
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) { console.error('[contas-bancarias]', err); toast.error("Erro ao salvar conta bancária."); }
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.banco_id || !form.descricao) { toast.error("Banco e descrição são obrigatórios"); return; }
    if (mode === "edit" && selected) {
      const willDeactivate = !form.ativo && selected.ativo;
      const inUse = inUseCounts.lancamentos > 0 || inUseCounts.baixas > 0 || inUseCounts.caixaMovs > 0;
      if (willDeactivate && inUse) { setConfirmInactivate(true); return; }
      await persistUpdate();
    } else {
      await persistCreate();
    }
  };

  const handleDelete = async (c: ContaBancaria) => {
    const { error } = await supabase.from("contas_bancarias").update({ ativo: false }).eq("id", c.id);
    if (error) { toast.error("Erro ao remover conta."); return; }
    toast.success("Conta removida!");
    fetchData();
  };

  const willDeactivate = mode === "edit" && selected && !form.ativo && selected.ativo;
  const inUse = inUseCounts.lancamentos > 0 || inUseCounts.baixas > 0 || inUseCounts.caixaMovs > 0;

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

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === "create" ? "Nova Conta Bancária" : "Editar Conta Bancária"}
        size="md"
      >
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
            {mode === "create" && (
              <div className="space-y-2"><Label>Saldo Inicial</Label><Input type="number" step="0.01" value={form.saldo_atual} onChange={e => setForm({ ...form, saldo_atual: Number(e.target.value) })} /></div>
            )}
          </div>
          {mode === "edit" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-ativo" className="text-sm font-medium cursor-pointer">Conta ativa</Label>
                  <p className="text-xs text-muted-foreground">Contas inativas não aparecem para seleção em lançamentos</p>
                </div>
                <Switch id="edit-ativo" checked={form.ativo} onCheckedChange={(checked) => setForm({ ...form, ativo: checked })} />
              </div>
              {willDeactivate && inUse && (
                <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p className="font-semibold">Esta conta está em uso no sistema</p>
                    <p>
                      Foram encontrados{" "}
                      {inUseCounts.lancamentos > 0 && `${inUseCounts.lancamentos} lançamento(s)`}
                      {inUseCounts.lancamentos > 0 && inUseCounts.baixas > 0 && ", "}
                      {inUseCounts.baixas > 0 && `${inUseCounts.baixas} baixa(s)`}
                      {(inUseCounts.lancamentos > 0 || inUseCounts.baixas > 0) && inUseCounts.caixaMovs > 0 && " e "}
                      {inUseCounts.caixaMovs > 0 && `${inUseCounts.caixaMovs} movimento(s) de caixa`}
                      {" "}vinculados a esta conta.
                    </p>
                    <p>Ao salvar, você será solicitado a confirmar a inativação.</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <AlertDialog open={confirmInactivate} onOpenChange={setConfirmInactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Confirmar inativação da conta
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">Confirmar inativação</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 space-y-2 text-sm">
            <p>A conta <strong>{selected?.descricao}</strong> ({selected?.bancos?.nome ?? "—"}) está vinculada a:</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {inUseCounts.lancamentos > 0 && <li>{inUseCounts.lancamentos} lançamento(s) financeiro(s)</li>}
              {inUseCounts.baixas > 0 && <li>{inUseCounts.baixas} baixa(s) registrada(s)</li>}
              {inUseCounts.caixaMovs > 0 && <li>{inUseCounts.caixaMovs} movimento(s) de caixa</li>}
            </ul>
            <p className="font-medium text-foreground">
              Deseja realmente inativar esta conta? Os vínculos existentes não serão removidos,
              mas a conta deixará de aparecer para novos lançamentos.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmInactivate(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { await persistUpdate(); setConfirmInactivate(false); }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar inativação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
