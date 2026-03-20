import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface FormaPagamento {
  id: string;
  descricao: string;
  prazo_dias: number;
  parcelas: number;
  gera_financeiro: boolean;
  tipo: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
}

// Mock store (ready for migration to DB)
const useMockFormas = () => {
  const [items, setItems] = useState<FormaPagamento[]>([
    { id: "1", descricao: "À Vista", prazo_dias: 0, parcelas: 1, gera_financeiro: true, tipo: "dinheiro", observacoes: "", ativo: true, created_at: new Date().toISOString() },
    { id: "2", descricao: "30/60/90 DDL", prazo_dias: 30, parcelas: 3, gera_financeiro: true, tipo: "boleto", observacoes: "Dias da data de entrega", ativo: true, created_at: new Date().toISOString() },
    { id: "3", descricao: "Cartão de Crédito", prazo_dias: 0, parcelas: 1, gera_financeiro: true, tipo: "cartao", observacoes: "", ativo: true, created_at: new Date().toISOString() },
  ]);
  const create = (payload: any) => {
    const item = { ...payload, id: crypto.randomUUID(), ativo: true, created_at: new Date().toISOString() };
    setItems(prev => [...prev, item]);
    toast.success("Forma de pagamento cadastrada!");
    return item;
  };
  const update = (id: string, payload: any) => { setItems(prev => prev.map(i => i.id === id ? { ...i, ...payload } : i)); toast.success("Atualizado!"); };
  const remove = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast.success("Removido!"); };
  return { data: items, loading: false, create, update, remove };
};

const emptyForm: Record<string, any> = {
  descricao: "", prazo_dias: 0, parcelas: 1, gera_financeiro: true, tipo: "boleto", observacoes: "",
};

const tipoLabel: Record<string, string> = { dinheiro: "Dinheiro", boleto: "Boleto", cartao: "Cartão", pix: "PIX", cheque: "Cheque", deposito: "Depósito" };

export default function FormasPagamento() {
  const { data, loading, create, update, remove } = useMockFormas();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<FormaPagamento | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const openCreate = () => { setMode("create"); setForm({...emptyForm}); setSelected(null); setModalOpen(true); };
  const openEdit = (f: FormaPagamento) => {
    setMode("edit"); setSelected(f);
    setForm({ descricao: f.descricao, prazo_dias: f.prazo_dias, parcelas: f.parcelas, gera_financeiro: f.gera_financeiro, tipo: f.tipo, observacoes: f.observacoes || "" });
    setModalOpen(true);
  };
  const openView = (f: FormaPagamento) => { setSelected(f); setDrawerOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao) { toast.error("Descrição é obrigatória"); return; }
    if (mode === "create") create(form);
    else if (selected) update(selected.id, form);
    setModalOpen(false);
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return data;
    return data.filter(f => f.descricao.toLowerCase().includes(query));
  }, [data, searchTerm]);

  const columns = [
    { key: "descricao", label: "Descrição" },
    { key: "tipo", label: "Tipo", render: (f: FormaPagamento) => tipoLabel[f.tipo] || f.tipo },
    { key: "prazo_dias", label: "Prazo (dias)", render: (f: FormaPagamento) => f.prazo_dias === 0 ? "À vista" : `${f.prazo_dias} dias` },
    { key: "parcelas", label: "Parcelas", render: (f: FormaPagamento) => `${f.parcelas}x` },
    { key: "gera_financeiro", label: "Gera Financeiro", render: (f: FormaPagamento) => f.gera_financeiro ? "Sim" : "Não" },
    { key: "ativo", label: "Status", render: (f: FormaPagamento) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Formas de Pagamento" subtitle="Condições de pagamento disponíveis" addLabel="Nova Forma" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por descrição...">
        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={openView} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Forma de Pagamento" : "Editar Forma de Pagamento"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required placeholder="Ex: 30/60/90 DDL" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Prazo (dias)</Label><Input type="number" value={form.prazo_dias} onChange={(e) => setForm({ ...form, prazo_dias: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Parcelas</Label><Input type="number" min={1} value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: Number(e.target.value) })} /></div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.gera_financeiro} onChange={(e) => setForm({ ...form, gera_financeiro: e.target.checked })} className="rounded" />
                Gera Financeiro
              </label>
            </div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Forma de Pagamento"
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-5">
            {/* Header with identity */}
            <div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{selected.descricao}</h3>
                  <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tipoLabel[selected.tipo] || selected.tipo}</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prazo</p>
                <p className="font-mono font-bold text-base text-foreground">{selected.prazo_dias === 0 ? "À vista" : `${selected.prazo_dias}d`}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Parcelas</p>
                <p className="font-mono font-bold text-base text-foreground">{selected.parcelas}x</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gera Financeiro</p>
                <p className={`font-bold text-base ${selected.gera_financeiro ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{selected.gera_financeiro ? "Sim" : "Não"}</p>
              </div>
            </div>

            {selected.observacoes && (
              <div className="border-t pt-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Observações</p>
                <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
}
