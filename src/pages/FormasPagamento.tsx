import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { toast } from "sonner";

interface FormaPagamento {
  id: string;
  descricao: string;
  prazo_dias: number;
  parcelas: number;
  intervalos_dias: number[];
  gera_financeiro: boolean;
  tipo: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
}

const tipoLabel: Record<string, string> = { dinheiro: "Dinheiro", boleto: "Boleto", cartao: "Cartão", pix: "PIX", cheque: "Cheque", deposito: "Depósito" };

const emptyForm: Record<string, any> = {
  descricao: "", prazo_dias: 0, parcelas: 1, intervalos_dias: [], gera_financeiro: true, tipo: "boleto", observacoes: "",
};

export default function FormasPagamento() {
  const { data, loading, create, update, remove } = useSupabaseCrud<FormaPagamento>({ table: "formas_pagamento" as any });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<FormaPagamento | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");

  // Dynamic intervals
  const [newIntervalo, setNewIntervalo] = useState<number>(30);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setSelected(null); setModalOpen(true); };
  const openEdit = (f: FormaPagamento) => {
    setMode("edit"); setSelected(f);
    const intervalos = Array.isArray(f.intervalos_dias) ? f.intervalos_dias : [];
    setForm({ descricao: f.descricao, prazo_dias: f.prazo_dias, parcelas: f.parcelas, intervalos_dias: intervalos, gera_financeiro: f.gera_financeiro, tipo: f.tipo, observacoes: f.observacoes || "" });
    setModalOpen(true);
  };
  const openView = (f: FormaPagamento) => { setSelected(f); setDrawerOpen(true); };

  const addIntervalo = () => {
    const current = Array.isArray(form.intervalos_dias) ? form.intervalos_dias : [];
    const updated = [...current, newIntervalo].sort((a, b) => a - b);
    setForm({ ...form, intervalos_dias: updated, parcelas: updated.length });
    setNewIntervalo((updated[updated.length - 1] || 0) + 30);
  };

  const removeIntervalo = (idx: number) => {
    const updated = (form.intervalos_dias as number[]).filter((_: any, i: number) => i !== idx);
    setForm({ ...form, intervalos_dias: updated, parcelas: Math.max(1, updated.length) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao) { toast.error("Descrição é obrigatória"); return; }
    const payload = {
      ...form,
      intervalos_dias: form.intervalos_dias.length > 0 ? form.intervalos_dias : [],
      parcelas: form.intervalos_dias.length > 0 ? form.intervalos_dias.length : form.parcelas,
    };
    if (mode === "create") await create(payload as any);
    else if (selected) await update(selected.id, payload as any);
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
    {
      key: "intervalos", label: "Intervalos", render: (f: FormaPagamento) => {
        const intervals = Array.isArray(f.intervalos_dias) && f.intervalos_dias.length > 0 ? f.intervalos_dias : null;
        if (intervals) return <span className="font-mono text-xs">{intervals.join(" / ")} dias</span>;
        return <span className="text-xs text-muted-foreground">{f.prazo_dias === 0 ? "À vista" : `${f.prazo_dias}d`}</span>;
      },
    },
    { key: "parcelas", label: "Parcelas", render: (f: FormaPagamento) => `${Array.isArray(f.intervalos_dias) && f.intervalos_dias.length > 0 ? f.intervalos_dias.length : f.parcelas}x` },
    { key: "gera_financeiro", label: "Gera Financeiro", render: (f: FormaPagamento) => f.gera_financeiro ? "Sim" : "Não" },
    { key: "ativo", label: "Status", render: (f: FormaPagamento) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Formas de Pagamento" subtitle="Condições de pagamento com intervalos dinâmicos" addLabel="Nova Forma" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por descrição...">
        <DataTable columns={columns} data={filteredData} loading={loading} onView={openView} />
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
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.gera_financeiro} onChange={(e) => setForm({ ...form, gera_financeiro: e.target.checked })} className="rounded" />
                Gera Financeiro
              </label>
            </div>
          </div>

          {/* Dynamic Installments */}
          <div className="space-y-2">
            <Label>Intervalos de Parcelas (dias)</Label>
            <p className="text-xs text-muted-foreground">Defina os dias de vencimento de cada parcela a partir da data de emissão.</p>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {(form.intervalos_dias as number[]).map((d: number, idx: number) => (
                <Badge key={idx} variant="secondary" className="gap-1 text-sm font-mono">
                  {d}d
                  <button type="button" onClick={() => removeIntervalo(idx)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input type="number" min={1} value={newIntervalo} onChange={(e) => setNewIntervalo(Number(e.target.value))} className="w-24 h-8 text-sm" placeholder="Dias" />
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={addIntervalo}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {(form.intervalos_dias as number[]).length === 0 && (
              <p className="text-xs text-muted-foreground italic">Sem intervalos = pagamento à vista (1 parcela)</p>
            )}
          </div>

          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
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
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg truncate">{selected.descricao}</h3>
                <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{tipoLabel[selected.tipo] || selected.tipo}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prazo</p>
                <p className="font-mono font-bold text-base text-foreground">{selected.prazo_dias === 0 ? "À vista" : `${selected.prazo_dias}d`}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Parcelas</p>
                <p className="font-mono font-bold text-base text-foreground">
                  {Array.isArray(selected.intervalos_dias) && selected.intervalos_dias.length > 0 ? selected.intervalos_dias.length : selected.parcelas}x
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gera Financeiro</p>
                <p className={`font-bold text-base ${selected.gera_financeiro ? "text-success" : "text-muted-foreground"}`}>{selected.gera_financeiro ? "Sim" : "Não"}</p>
              </div>
            </div>

            {/* Installment Schedule Preview */}
            {Array.isArray(selected.intervalos_dias) && selected.intervalos_dias.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Tabela de Parcelas</p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Parcela</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Dias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.intervalos_dias.map((d: number, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="px-3 py-1.5 text-xs">{idx + 1}ª parcela</td>
                          <td className="px-3 py-1.5 text-xs font-mono text-right">{d} dias</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
